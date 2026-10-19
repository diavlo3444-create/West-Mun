import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) } });
const b64url = (v: Uint8Array) => btoa(String.fromCharCode(...v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
function decodeB64url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)), (c) => c.charCodeAt(0));
}
async function decryptToken(encrypted: string, secret: string) {
  const [version, ivText, cipherText] = encrypted.split(":");
  if (version !== "v1" || !ivText || !cipherText) throw new Error("Stored token format is invalid.");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeB64url(ivText) }, key, decodeB64url(cipherText));
  return new TextDecoder().decode(plain);
}
const b64 = (value: string) => btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

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
  const encryptionSecret = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY");
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  if (!supabaseUrl || !serviceKey || !encryptionSecret || !clientId || !clientSecret) return json({ error: "Gmail sending is not configured." }, 503, siteUrl);
  const match = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: "Sign in as a WEST MUN admin first." }, 401, siteUrl);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await db.auth.getUser(match[1]);
  if (userError || !userData.user) return json({ error: "Invalid or expired session." }, 401, siteUrl);
  const { data: adminRow, error: adminError } = await db.from("admins").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (adminError || !adminRow) return json({ error: "Only authorized WEST MUN admins can send acceptance emails." }, 403, siteUrl);

  let body: { delegateId?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400, siteUrl); }
  if (typeof body.delegateId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.delegateId)) return json({ error: "A valid delegate ID is required." }, 400, siteUrl);
  const { data: delegate, error: delegateError } = await db.from("delegates")
    .select("id,full_name,email,institution,delegation_type,status")
    .eq("id", body.delegateId).maybeSingle();
  if (delegateError || !delegate) return json({ error: "Application not found." }, 404, siteUrl);
  if (delegate.status !== "accepted") return json({ error: "Set this application to Accepted and save before sending an acceptance email." }, 409, siteUrl);
  if (!delegate.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(delegate.email)) return json({ error: "The application does not have a valid email address." }, 422, siteUrl);

  const { data: stored, error: storedError } = await db.from("gmail_oauth_credentials").select("encrypted_refresh_token").eq("singleton", true).maybeSingle();
  if (storedError || !stored?.encrypted_refresh_token) return json({ error: "Gmail has not been connected by an admin yet." }, 409, siteUrl);
  try {
    const refreshToken = await decryptToken(stored.encrypted_refresh_token, encryptionSecret);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    if (!tokenResponse.ok) return json({ error: "Google could not refresh the Gmail authorization. Reconnect Gmail in the admin panel." }, 502, siteUrl);
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string") return json({ error: "Google did not return an access token." }, 502, siteUrl);

    const name = String(delegate.full_name ?? "Delegate");
    const institution = String(delegate.institution ?? "");
    const type = String(delegate.delegation_type ?? "");
    const subject = "WEST MUN 2027 — Delegate Application Accepted";
    const plain = [
      `Dear ${name},`, "",
      "We are pleased to inform you that your WEST MUN 2027 delegate application has been accepted.",
      institution ? `Institution: ${institution}` : "",
      type ? `Delegation type: ${type}` : "",
      "",
      "Further conference information will be shared by the WEST MUN team. This message confirms acceptance only; it does not request or process any payment.",
      "", "Kind regards,", "WEST MUN 2027 Secretariat",
    ].filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== "")).join("\r\n");
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717"><p>Dear ${escapeHtml(name)},</p><p>We are pleased to inform you that your <strong>WEST MUN 2027</strong> delegate application has been accepted.</p>${institution ? `<p><strong>Institution:</strong> ${escapeHtml(institution)}</p>` : ""}${type ? `<p><strong>Delegation type:</strong> ${escapeHtml(type)}</p>` : ""}<p>Further conference information will be shared by the WEST MUN team. This message confirms acceptance only; it does not request or process any payment.</p><p>Kind regards,<br>WEST MUN 2027 Secretariat</p></div>`;
    const rawMessage = [
      `To: ${delegate.email}`, `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      "MIME-Version: 1.0", 'Content-Type: multipart/alternative; boundary="westmun-alt-boundary"', "",
      "--westmun-alt-boundary", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(plain),
      "--westmun-alt-boundary", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(html),
      "--westmun-alt-boundary--", "",
    ].join("\r\n");
    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64(rawMessage) }),
    });
    if (!gmailResponse.ok) return json({ error: "Gmail could not send the acceptance email. Check the connected account and Gmail API access." }, 502, siteUrl);
    return json({ sent: true, recipient: delegate.email }, 200, siteUrl);
  } catch {
    return json({ error: "Gmail sending failed. Check the server-side Gmail configuration and reconnect if necessary." }, 500, siteUrl);
  }
});
