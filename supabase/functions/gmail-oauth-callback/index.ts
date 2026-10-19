import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const b64urlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};
const sha256Hex = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const redirect = (siteUrl: string, status: string) => Response.redirect(new URL("/admin?gmail=" + encodeURIComponent(status), siteUrl), 302);
async function encryptToken(token: string, secret: string) {
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  const b64 = (v: Uint8Array) => btoa(String.fromCharCode(...v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return "v1:" + b64(iv) + ":" + b64(new Uint8Array(cipher));
}

Deno.serve(async (req) => {
  const siteUrl = Deno.env.get("WESTMUN_SITE_URL")?.replace(/\/$/, "");
  if (req.method !== "GET") return new Response("Method not allowed.", { status: 405 });
  if (!siteUrl) return new Response("Gmail callback is not configured.", { status: 503 });
  const requestUrl = new URL(req.url);
  if (requestUrl.searchParams.has("error")) return redirect(siteUrl, "denied");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state") ?? "";
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const redirectUri = Deno.env.get("GMAIL_REDIRECT_URI");
  const stateSecret = Deno.env.get("GMAIL_OAUTH_STATE_SECRET");
  const encryptionSecret = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!code || !state || !clientId || !clientSecret || !redirectUri || !stateSecret || !encryptionSecret || !supabaseUrl || !serviceKey) return redirect(siteUrl, "config-error");

  try {
    const parts = state.split(".");
    if (parts.length !== 2) return redirect(siteUrl, "invalid-state");
    const signingKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(stateSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const validSignature = await crypto.subtle.verify("HMAC", signingKey, b64urlToBytes(parts[1]), new TextEncoder().encode(parts[0]));
    if (!validSignature) return redirect(siteUrl, "invalid-state");
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    if (typeof payload.nonce !== "string" || !Number.isInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return redirect(siteUrl, "expired-state");

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const now = new Date().toISOString();
    const { data: stateRow, error: stateError } = await db.from("gmail_oauth_states")
      .update({ consumed_at: now })
      .eq("nonce_hash", await sha256Hex(payload.nonce))
      .is("consumed_at", null)
      .gt("expires_at", now)
      .select("user_id")
      .maybeSingle();
    if (stateError || !stateRow) return redirect(siteUrl, "used-or-expired-state");
    const { data: adminRow, error: adminError } = await db.from("admins").select("user_id").eq("user_id", stateRow.user_id).maybeSingle();
    if (adminError || !adminRow) return redirect(siteUrl, "admin-not-authorized");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return redirect(siteUrl, "token-exchange-failed");
    const tokens = await tokenResponse.json();
    if (typeof tokens.refresh_token !== "string" || !tokens.refresh_token) return redirect(siteUrl, "refresh-token-missing");
    const encrypted = await encryptToken(tokens.refresh_token, encryptionSecret);
    const { error: saveError } = await db.from("gmail_oauth_credentials").upsert({
      singleton: true, encrypted_refresh_token: encrypted, connected_by: stateRow.user_id, updated_at: now,
    }, { onConflict: "singleton" });
    if (saveError) return redirect(siteUrl, "token-save-failed");
    return redirect(siteUrl, "connected");
  } catch {
    return redirect(siteUrl, "callback-failed");
  }
});
