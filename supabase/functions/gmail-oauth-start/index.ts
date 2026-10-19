import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) } });
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const sha256Hex = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  const siteUrl = Deno.env.get("WESTMUN_SITE_URL")?.replace(/\/$/, "");
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    // Preflight is allowed only for the exact configured production origin.
    if (!siteUrl || origin !== siteUrl) return new Response(null, { status: 403, headers: { "Vary": "Origin" } });
    return new Response(null, { status: 204, headers: corsHeaders(siteUrl) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, siteUrl || origin);
  if (!siteUrl || origin !== siteUrl) return json({ error: "Origin not allowed." }, 403, siteUrl || origin);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const redirectUri = Deno.env.get("GMAIL_REDIRECT_URI");
  const stateSecret = Deno.env.get("GMAIL_OAUTH_STATE_SECRET");
  if (!supabaseUrl || !serviceKey || !clientId || !redirectUri || !stateSecret) return json({ error: "Gmail authorization is not configured." }, 503, siteUrl);
  const bearer = req.headers.get("authorization") ?? "";
  const match = bearer.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "Sign in as a WEST MUN admin first." }, 401, siteUrl);
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await adminClient.auth.getUser(match[1]);
  if (userError || !userData.user) return json({ error: "Invalid or expired session." }, 401, siteUrl);
  const { data: adminRow, error: adminError } = await adminClient.from("admins").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (adminError || !adminRow) return json({ error: "Only authorized WEST MUN admins can connect Gmail." }, 403, siteUrl);

  // A saved singleton is shared by every admin; do not silently overwrite it.
  const { data: existing, error: existingError } = await adminClient.from("gmail_oauth_credentials").select("singleton").eq("singleton", true).maybeSingle();
  if (existingError) return json({ error: "Could not check the shared Gmail connection." }, 500, siteUrl);
  if (existing && userData.user.email?.toLowerCase() !== "diavlo3444@gmail.com") return json({ error: "A shared Gmail connection already exists. Only the IT Super Admin can replace it." }, 409, siteUrl);

  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = b64url(nonceBytes);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error: stateError } = await adminClient.from("gmail_oauth_states").insert({
    nonce_hash: await sha256Hex(nonce),
    user_id: userData.user.id,
    expires_at: expiresAt,
  });
  if (stateError) return json({ error: "Could not start secure authorization." }, 500, siteUrl);

  const payload = b64url(new TextEncoder().encode(JSON.stringify({ nonce, exp: Math.floor(Date.now() / 1000) + 600 })));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(stateSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
  const state = payload + "." + signature;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send openid email",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return json({ authorization_url: authUrl.toString() }, 200, siteUrl);
});
