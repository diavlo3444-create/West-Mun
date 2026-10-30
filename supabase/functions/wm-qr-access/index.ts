import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SITE_URL = (Deno.env.get("WESTMUN_SITE_URL") || "https://west-mun.vercel.app").replace(/\/$/, "");
const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, origin = SITE_URL) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) } });
const randomHex = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
const validFullName = (v: unknown) => {
  const name = clean(v).replace(/\s+/g, " ");
  return name.length >= 5 && name.length <= 120 && name.split(/\s+/).filter(Boolean).length >= 2 ? name : "";
};
// Stored application/account names are authoritative even when a person's
// legal or culturally used name is a single token. Keep the stricter check
// only for names typed manually when no trusted stored name exists.
const validStoredName = (v: unknown) => {
  const name = clean(v).replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 120 ? name : "";
};
const normalized = (v: unknown) => clean(v).toLowerCase().replace(/\s+/g, " ");
const normalizedRole = (v: unknown) => normalized(v).replace(/[ -]+/g, "_");
const isSecurityDepartment = (v: unknown) => {
  const value = normalized(v);
  return ["security", "security & protocol", "security and protocol"].includes(value);
};
const isCoHeadRole = (v: unknown) => ["co_head", "cohead", "co-head"].includes(normalizedRole(v));

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = origin === SITE_URL || /^https:\/\/west-[a-z0-9-]+-diavlo3444-3185\.vercel\.app$/.test(origin);
  if (req.method === "OPTIONS") {
    if (!allowedOrigin) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
    return new Response(null, { status: 204, headers: corsHeaders(SITE_URL) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (origin && !allowedOrigin) return json({ error: "Origin not allowed." }, 403, "");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "QR access service is not configured." }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return json({ error: "Sign in to WEST MUN first." }, 401);
  const auth = await db.auth.getUser(bearer[1]);
  if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  const actor = auth.data.user;
  const meta = (actor.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (actor.user_metadata ?? {}) as Record<string, unknown>;
  const adminResult = await db.from("admins").select("user_id").eq("user_id", actor.id).maybeSingle();
  if (adminResult.error) return json({ error: "Could not verify account permissions." }, 500);
  const headResult = await db.from("department_heads").select("department,section,head_name,active").eq("user_id", actor.id).eq("active", true);
  if (headResult.error) return json({ error: "Could not verify account permissions." }, 500);
  const head = headResult.data?.[0] ?? null;
  const isAdmin = Boolean(adminResult.data);
  const isTeamMember = meta.wm_role === "team_member";
  const isEbMember = meta.wm_role === "eb_member";
  if (!isAdmin && !head && !isTeamMember && !isEbMember) return json({ error: "This account has no active WEST MUN assignment." }, 403);

  const passResult = await db.from("wm_qr_passes").select("full_name,team,section,account_role,active").eq("user_id", actor.id).maybeSingle();
  const pass = passResult.data;

  const department = head?.department ?? pass?.team ?? (typeof meta.wm_team === "string" ? meta.wm_team : null);
  const section = head?.section ?? pass?.section ?? (typeof meta.wm_section === "string" ? meta.wm_section : null);
  const requestedFullName = clean(body.fullName);
  let applicationFullName = "";
  let personFullName = "";

  // Resolve the canonical person record first. Older WEST MUN accounts may
  // have their name in wm_people even when Auth metadata is missing.
  const personByUser = await db.from("wm_people")
    .select("display_name,updated_at,created_at")
    .eq("auth_user_id", actor.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(5);
  if (!personByUser.error && personByUser.data) {
    const person = personByUser.data.find((row: { display_name?: string | null }) => validFullName(row.display_name));
    if (person) personFullName = clean(person.display_name);
  }

  // For legacy people records without an auth_user_id, match only the
  // authenticated account email. Never use an unverified name.
  if (!validFullName(personFullName) && clean(actor.email)) {
    const personByEmail = await db.from("wm_people")
      .select("display_name,updated_at,created_at")
      .ilike("email", clean(actor.email))
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5);
    if (!personByEmail.error && personByEmail.data) {
      const person = personByEmail.data.find((row: { display_name?: string | null }) => validFullName(row.display_name));
      if (person) personFullName = clean(person.display_name);
    }
  }

  // Recover the canonical name from the accepted application. Bind it to
  // both the account's registration ID (when present) and authenticated email.
  if (!validFullName(userMeta.full_name) && !validFullName(userMeta.fullName) && !validFullName(userMeta.name) && clean(actor.email)) {
    if (typeof meta.wm_registration_id === "string" && clean(meta.wm_registration_id)) {
      const byId = await db.from("team_registrations")
        .select("full_name,email,status")
        .eq("id", clean(meta.wm_registration_id))
        .ilike("email", clean(actor.email))
        .maybeSingle();
      if (!byId.error && byId.data && normalized(byId.data.status) === "accepted") {
        applicationFullName = clean(byId.data.full_name);
      }
    }
    if (!validFullName(applicationFullName)) {
      const byEmail = await db.from("team_registrations")
        .select("full_name,email,status,created_at")
        .ilike("email", clean(actor.email))
        .order("created_at", { ascending: false })
        .limit(25);
      if (!byEmail.error && byEmail.data) {
        const accepted = byEmail.data.find((row: { status?: string | null; full_name?: string | null }) =>
          normalized(row.status) === "accepted" && validFullName(row.full_name)
        );
        if (accepted) applicationFullName = clean(accepted.full_name);
      }
    }
  }

  // Prefer accepted application data, then the linked people record, before
  // cached QR data or any optional form value.
  const fullName =
    validStoredName(userMeta.full_name) ||
    validStoredName(userMeta.fullName) ||
    validStoredName(userMeta.name) ||
    validStoredName(applicationFullName) ||
    validStoredName(personFullName) ||
    validFullName(head?.head_name) ||
    validStoredName(pass?.full_name) ||
    validFullName(requestedFullName);
  const accountRole = isAdmin ? "admin" : head ? "head" : (clean(pass?.account_role) || (typeof meta.wm_eb_role === "string" ? meta.wm_eb_role : "") || (typeof meta.wm_role === "string" ? meta.wm_role : "team_member"));
  // Co-head permissions can be represented in auth metadata OR the official QR-pass row.
  // Do not let a department_heads row (which labels the role as "head") hide the EB co-head role.
  const isSecurity = isSecurityDepartment(department) ||
    isSecurityDepartment(pass?.team) ||
    isSecurityDepartment(meta.wm_team);
  const isSecurityCoHead = isSecurity && (
    isCoHeadRole(accountRole) ||
    isCoHeadRole(pass?.account_role) ||
    isCoHeadRole(meta.wm_eb_role) ||
    isCoHeadRole(meta.wm_role) ||
    isCoHeadRole(userMeta.wm_eb_role) ||
    isCoHeadRole(userMeta.wm_role)
  );
  const canScan = isAdmin || (isTeamMember && isSecurity) || (Boolean(head) && isSecurity) || isSecurityCoHead;

  if (body.action === "access") {
    if (isEbMember) {
      const officialPass = await db.from("wm_qr_passes").select("full_name,team,section,account_role,active").eq("user_id", actor.id).maybeSingle();
      if (officialPass.error) return json({ error: "Could not verify your EB pass." }, 500);
      if (!officialPass.data || !officialPass.data.active) return json({ error: "Your EB pass is not active. Contact a WEST MUN admin." }, 403);
      return json({ success: true, canScan, fullName: officialPass.data.full_name, accountRole: officialPass.data.account_role, team: officialPass.data.team, section: officialPass.data.section });
    }
    return json({ success: true, canScan, fullName: fullName || null, accountRole, team: department, section });
  }

  if (body.action === "pass") {
    if (isEbMember) {
      const officialPass = await db.from("wm_qr_passes").select("user_id,qr_token,full_name,email,account_role,team,section,active,inside,last_scanned_at").eq("user_id", actor.id).maybeSingle();
      if (officialPass.error) return json({ error: "Could not load your EB pass." }, 500);
      if (!officialPass.data || !officialPass.data.active) return json({ error: "Your EB pass is not active. Contact a WEST MUN admin." }, 403);
      return json({ success: true, pass: officialPass.data });
    }
    if (!validStoredName(fullName)) {
      return json({ error: "Your WEST MUN account needs your full real name before a QR pass can be issued. Contact an admin." }, 409);
    }
    if (!validStoredName(userMeta.full_name) && !validFullName(head?.head_name) && fullName) {
      const metadataUpdate = await db.auth.admin.updateUserById(actor.id, {
        user_metadata: { ...userMeta, full_name: fullName },
      });
      if (metadataUpdate.error) return json({ error: "Could not save your name to your WEST MUN account. Please try again." }, 500);
    }
    const existing = await db.from("wm_qr_passes").select("user_id,qr_token,full_name,email,account_role,team,section,active,inside,last_scanned_at")
      .eq("user_id", actor.id).maybeSingle();
    if (existing.error) return json({ error: "Could not load your QR pass." }, 500);
    if (existing.data) {
      const updated = await db.from("wm_qr_passes").update({
        full_name: fullName, email: actor.email ?? "", account_role: accountRole,
        team: department, section, active: true, updated_at: new Date().toISOString(),
      }).eq("user_id", actor.id).select("user_id,qr_token,full_name,email,account_role,team,section,active,inside,last_scanned_at").single();
      if (updated.error || !updated.data) return json({ error: "Could not update your QR pass." }, 500);
      return json({ success: true, pass: updated.data });
    }
    const pass = await db.from("wm_qr_passes").insert({
      user_id: actor.id, qr_token: randomHex(32), full_name: fullName, email: actor.email ?? "",
      account_role: accountRole, team: department, section, active: true,
    }).select("user_id,qr_token,full_name,email,account_role,team,section,active,inside,last_scanned_at").single();
    if (pass.error || !pass.data) return json({ error: "Could not issue your QR pass." }, 500);
    return json({ success: true, pass: pass.data }, 201);
  }

  if (body.action === "checked_in") {
    if (!canScan) return json({ error: "This account cannot view venue attendance." }, 403);
    const checkedIn = await db.from("wm_qr_passes")
      .select("user_id,full_name,account_role,team,section,last_scanned_at")
      .eq("active", true)
      .eq("inside", true)
      .order("last_scanned_at", { ascending: false });
    if (checkedIn.error) return json({ error: "Could not load the current check-in list." }, 500);
    return json({ success: true, people: checkedIn.data ?? [], count: checkedIn.data?.length ?? 0 });
  }

  if (body.action === "scan") {
    if (!canScan) return json({ error: "Scanner access is restricted to authorized Security members and WEST MUN admins." }, 403);
    const qrToken = clean(body.qrToken);
    const direction = body.direction === "exit" ? "exit" : "entry";
    if (!/^[a-f0-9]{64}$/i.test(qrToken)) return json({ success: false, outcome: "denied", error: "This QR code is not a valid WEST MUN pass." }, 400);
    const passResult = await db.from("wm_qr_passes")
      .select("user_id,full_name,team,section,account_role,active,inside")
      .eq("qr_token", qrToken.toLowerCase()).eq("active", true).maybeSingle();
    if (passResult.error) return json({ error: "Could not verify this pass." }, 500);
    const pass = passResult.data;
    if (!pass) {
      await db.from("wm_qr_scan_logs").insert({ scanner_user_id: actor.id, direction, outcome: "denied", reason: "invalid_or_revoked_pass" });
      return json({ success: false, outcome: "denied", error: "Invalid or revoked WEST MUN QR pass." }, 404);
    }
    if (direction === "entry" && pass.inside) {
      await db.from("wm_qr_scan_logs").insert({ scanner_user_id: actor.id, pass_user_id: pass.user_id, pass_full_name: pass.full_name, team: pass.team, section: pass.section, direction, outcome: "denied", reason: "already_checked_in" });
      return json({ success: false, outcome: "denied", error: "This person is already checked in.", person: { fullName: pass.full_name, team: pass.team, section: pass.section } }, 409);
    }
    if (direction === "exit" && !pass.inside) {
      await db.from("wm_qr_scan_logs").insert({ scanner_user_id: actor.id, pass_user_id: pass.user_id, pass_full_name: pass.full_name, team: pass.team, section: pass.section, direction, outcome: "denied", reason: "not_checked_in" });
      return json({ success: false, outcome: "denied", error: "This person is not currently checked in.", person: { fullName: pass.full_name, team: pass.team, section: pass.section } }, 409);
    }
    const scannedAt = new Date().toISOString();
    const updated = await db.from("wm_qr_passes").update({ inside: direction === "entry", last_scanned_at: scannedAt, updated_at: scannedAt })
      .eq("user_id", pass.user_id).eq("active", true).select("user_id").maybeSingle();
    if (updated.error || !updated.data) return json({ error: "The pass changed during scanning. Please scan it again." }, 409);
    const log = await db.from("wm_qr_scan_logs").insert({
      scanner_user_id: actor.id, pass_user_id: pass.user_id, pass_full_name: pass.full_name,
      team: pass.team, section: pass.section, direction, outcome: "allowed",
    });
    if (log.error) return json({ error: "Entry state updated, but the scan log could not be saved. Notify an admin." }, 500);
    return json({ success: true, outcome: "allowed", direction, scannedAt, person: { fullName: pass.full_name, team: pass.team, section: pass.section, role: pass.account_role } });
  }

  return json({ error: "Unsupported action." }, 400);
});
