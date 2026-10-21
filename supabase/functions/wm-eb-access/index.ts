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
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
const emailNorm = (v: unknown) => clean(v).toLowerCase();
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120;
const normalizeName = (v: string) => v.trim().replace(/\s+/g, " ");
const nameKey = (v: string) => normalizeName(v).toLocaleLowerCase();
const randomHex = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, "0")).join("");
const allowedRoles = new Set(["executive", "dcc", "secretary", "logistics", "designers", "media_and_press", "marketing", "hr", "pr", "volunteers", "ceremonies", "doc_department", "it", "security"]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = origin === SITE_URL || /^https:\/\/west-[a-z0-9-]+-diavlo3444-3185\.vercel\.app$/.test(origin);
  if (req.method === "OPTIONS") {
    if (!allowedOrigin) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
    return new Response(null, { status: 204, headers: corsHeaders(origin || SITE_URL) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (origin && !allowedOrigin) return json({ error: "Origin not allowed." }, 403, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "EB signup service is not configured." }, 503);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  if (body.action === "create_signup_link") {
    const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: "Sign in as a WEST MUN admin first." }, 401);
    const auth = await db.auth.getUser(bearer[1]);
    if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
    const admin = await db.from("admins").select("user_id").eq("user_id", auth.data.user.id).maybeSingle();
    if (admin.error) return json({ error: "Could not verify admin permissions." }, 500);
    if (!admin.data) return json({ error: "Only a WEST MUN admin can create the EB signup link." }, 403);

    const token = randomHex(32);
    const revoked = await db.from("wm_eb_signup_links").update({ active: false }).eq("active", true);
    if (revoked.error) return json({ error: "Could not refresh the existing signup link. No new link was created." }, 500);
    const inserted = await db.from("wm_eb_signup_links").insert({
      token_hash: await sha256(token),
      active: true,
      created_by: auth.data.user.id,
      expires_at: null,
    }).select("id,created_at").single();
    if (inserted.error || !inserted.data) return json({ error: "Could not create the reusable EB signup link. Try again." }, 500);
    return json({ success: true, signupUrl: `${SITE_URL}/eb-signup#token=${token}`, createdAt: inserted.data.created_at }, 201);
  }

  if (body.action === "create_invite") {
    const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: "Sign in as a WEST MUN admin first." }, 401);
    const auth = await db.auth.getUser(bearer[1]);
    if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
    const admin = await db.from("admins").select("user_id").eq("user_id", auth.data.user.id).maybeSingle();
    if (admin.error) return json({ error: "Could not verify admin permissions." }, 500);
    if (!admin.data) return json({ error: "Only a WEST MUN admin can issue EB signup links." }, 403);

    const email = emailNorm(body.email);
    const department = clean(body.department);
    const section = clean(body.section);
    const ebRole = clean(body.ebRole).toLowerCase();
    if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!department || department.length > 80 || !section || section.length > 100) return json({ error: "Choose an assigned department and section." }, 400);
    if (!allowedRoles.has(ebRole)) return json({ error: "Choose a valid EB role." }, 400);

    const now = new Date();
    const revoke = await db.from("wm_eb_invites").update({ revoked_at: now.toISOString() }).eq("email", email).is("redeemed_at", null).is("revoked_at", null);
    if (revoke.error) return json({ error: "Could not replace an existing invitation." }, 500);
    const token = randomHex(32);
    const inserted = await db.from("wm_eb_invites").insert({
      email, department, section, eb_role: ebRole, token_hash: await sha256(token),
      expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: auth.data.user.id,
    }).select("id,expires_at").single();
    if (inserted.error || !inserted.data) return json({ error: "Could not create the invitation. Try again." }, 500);
    return json({
      success: true,
      signupUrl: `${SITE_URL}/eb-signup#token=${token}`,
      email, department, section, ebRole,
      expiresAt: inserted.data.expires_at,
    }, 201);
  }


  if (body.action === "list_members") {
    const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: "Sign in as a WEST MUN admin first." }, 401);
    const auth = await db.auth.getUser(bearer[1]);
    if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
    const admin = await db.from("admins").select("user_id").eq("user_id", auth.data.user.id).maybeSingle();
    if (admin.error) return json({ error: "Could not verify admin permissions." }, 500);
    if (!admin.data) return json({ error: "Only a WEST MUN admin can view the Executive Board directory." }, 403);

    const [inviteResult, passResult, headResult] = await Promise.all([
      db.from("wm_eb_invites").select("email").not("redeemed_at", "is", null),
      db.from("wm_qr_passes").select("user_id,full_name,email,account_role,team,section,phone,gender,active,created_at").order("full_name"),
      db.from("department_heads").select("user_id,email,head_name,department,section,active,created_at").order("department").order("section"),
    ]);
    if (inviteResult.error || passResult.error || headResult.error) {
      console.error("[wm-eb-access] Directory query failed", {
        invites: inviteResult.error?.code, passes: passResult.error?.code, heads: headResult.error?.code
      });
      return json({ error: "Could not load the Executive Board directory. Check the database setup and try again." }, 500);
    }
    const ebEmails = new Set((inviteResult.data || []).map((row: { email: string }) => row.email.toLowerCase()));
    const members = (passResult.data || []).filter((row: { email: string; account_role: string }) => ebEmails.has(row.email.toLowerCase()) || ["co_head", "designer", "marketing"].includes(String(row.account_role || "").toLowerCase()));
    return json({ success: true, members, heads: headResult.data || [] });
  }

  if (body.action === "list_active_heads") {
    const result = await db.from("department_heads").select("id,head_name,department,section")
      .eq("active", true).order("department").order("section").order("head_name");
    if (result.error) return json({ error: "Could not load the active department heads. Please try again." }, 500);
    return json({ success: true, heads: result.data || [] });
  }

  if (body.action === "list_my_coheads") {
    const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: "Sign in as a department head first." }, 401);
    const auth = await db.auth.getUser(bearer[1]);
    if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
    const head = await db.from("department_heads").select("id,department,section,active")
      .eq("user_id", auth.data.user.id).eq("active", true).maybeSingle();
    if (head.error) return json({ error: "Could not verify your head assignment." }, 500);
    if (!head.data) return json({ error: "Only an active department head can view their Co-Head list." }, 403);
    const result = await db.from("wm_qr_passes").select("user_id,full_name,email,phone,gender,created_at,reporting_head_id")
      .eq("reporting_head_id", head.data.id).eq("account_role", "co_head").eq("active", true).order("full_name");
    if (result.error) return json({ error: "Could not load your Co-Heads." }, 500);
    return json({ success: true, coHeads: result.data || [] });
  }

  if (body.action === "signup_public") {
    const token = clean(body.token).toLowerCase();
    const email = emailNorm(body.email);
    const fullName = normalizeName(clean(body.fullName));
    const password = typeof body.password === "string" ? body.password : "";
    const phone = clean(body.phone).replace(/[^0-9]/g, "");
    const gender = clean(body.gender).toLowerCase();
    const ebRole = clean(body.ebRole).toLowerCase();
    const requestedDepartment = clean(body.department);
    const requestedHeadId = clean(body.reportingHeadId);
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "This EB signup link is invalid. Ask an admin for the current link." }, 400);
    if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
    if (fullName.length < 5 || fullName.length > 120 || fullName.split(" ").filter(Boolean).length < 2) return json({ error: "Enter your full real name, including first and last name." }, 400);
    if (phone.length < 7 || phone.length > 15) return json({ error: "Enter a valid phone number with country code, using 7–15 digits." }, 400);
    if (!["male", "female"].includes(gender)) return json({ error: "Choose your gender to continue." }, 400);
    if (password.length < 12 || password.length > 128) return json({ error: "Use a password between 12 and 128 characters." }, 400);
    if (!["co_head", "designer", "marketing"].includes(ebRole)) return json({ error: "Choose Co-Head, Designer, or Marketing Team." }, 400);
    if (ebRole === "co_head" && !/^[0-9a-f-]{36}$/i.test(requestedHeadId)) return json({ error: "Select the active department head you will report to." }, 400);

    const link = await db.from("wm_eb_signup_links").select("id").eq("token_hash", await sha256(token)).eq("active", true).maybeSingle();
    if (link.error) return json({ error: "Could not verify the signup link. Please try again." }, 500);
    if (!link.data) return json({ error: "This EB signup link is no longer active. Ask an admin for the current link." }, 403);

    let reportingHead: { id: string; head_name: string | null; department: string; section: string | null } | null = null;
    if (ebRole === "co_head") {
      const selected = await db.from("department_heads").select("id,head_name,department,section,active")
        .eq("id", requestedHeadId).eq("active", true).maybeSingle();
      if (selected.error) return json({ error: "Could not verify the selected head. Please try again." }, 500);
      if (!selected.data) return json({ error: "That head is no longer active. Select an active head from the list." }, 400);
      reportingHead = selected.data;
    }

    const existingPhone = await db.from("wm_qr_passes").select("user_id").eq("phone", phone).limit(1).maybeSingle();
    if (existingPhone.error) return json({ error: "Could not check the phone number. Please try again." }, 500);
    if (existingPhone.data) return json({ error: "This phone number is already registered. Each EB member must use a unique phone number." }, 409);

    const team = ebRole === "co_head" ? String(reportingHead!.department) : ebRole === "designer" ? "Design" : "Marketing";
    const section = ebRole === "co_head" ? (reportingHead!.section || "Co-Head") : ebRole === "designer" ? "Design Team" : "Marketing Team";
    const created = await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, phone, gender },
      app_metadata: { wm_role: "eb_member", wm_team: team, wm_section: section, wm_eb_role: ebRole, ...(reportingHead ? { wm_reporting_head_id: reportingHead.id } : {}) },
    });
    if (created.error || !created.data.user) {
      const message = created.error?.message || "";
      if (/already\s+(?:been\s+)?registered|already exists|duplicate key|email.*already/i.test(message)) return json({ error: "An account already exists for this email. Sign in with that account or ask an admin for help." }, 409);
      console.error("[wm-eb-access] Public signup account creation failed", { error: message.slice(0, 160) });
      return json({ error: "Could not create your account. Check your details and try again." }, 500);
    }
    const userId = created.data.user.id;
    const passCreated = await db.from("wm_qr_passes").insert({
      user_id: userId,
      qr_token: randomHex(32),
      full_name: fullName,
      email,
      account_role: ebRole,
      team,
      section,
      phone,
      gender,
      reporting_head_id: reportingHead?.id ?? null,
      active: true,
      inside: false,
    }).select("user_id").maybeSingle();
    if (passCreated.error || !passCreated.data) {
      await db.auth.admin.deleteUser(userId);
      if (passCreated.error?.code === "23505") return json({ error: "This phone number is already registered. Each EB member must use a unique phone number." }, 409);
      console.error("[wm-eb-access] Public signup QR pass creation failed", { code: passCreated.error?.code });
      return json({ error: "Your account could not be completed because the QR pass could not be issued. Your account was rolled back; please try again." }, 500);
    }
    return json({ success: true, redirectTo: "/eb", department: team, section, ebRole }, 201);
  }

  if (body.action === "signup") {
    const token = clean(body.token).toLowerCase();
    const email = emailNorm(body.email);
    const fullName = normalizeName(clean(body.fullName));
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "This EB signup link is invalid. Ask an admin for a new one." }, 400);
    if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
    if (fullName.length < 5 || fullName.length > 120 || fullName.split(" ").filter(Boolean).length < 2) {
      return json({ error: "Enter your full real name, including at least your first and last name." }, 400);
    }
    if (password.length < 12 || password.length > 128) return json({ error: "Use a password between 12 and 128 characters." }, 400);

    const inviteResult = await db.from("wm_eb_invites")
      .select("id,email,department,section,eb_role,expires_at,claimed_at,claim_id,redeemed_at,revoked_at")
      .eq("token_hash", await sha256(token)).maybeSingle();
    const invite = inviteResult.data;
    if (inviteResult.error || !invite || invite.revoked_at || invite.redeemed_at || new Date(invite.expires_at).getTime() <= Date.now()) {
      return json({ error: "This EB signup link is invalid, expired, or already used. Ask an admin for a new one." }, 400);
    }
    if (email !== invite.email) return json({ error: "Use the email address this invitation was issued to." }, 403);

    if (invite.claimed_at) {
      if (new Date(invite.claimed_at).getTime() > Date.now() - 10 * 60 * 1000) return json({ error: "This invitation is being used right now. Wait a few minutes and try again." }, 409);
      await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", invite.claim_id).is("redeemed_at", null).is("revoked_at", null);
    }
    const claimId = crypto.randomUUID();
    const claimed = await db.from("wm_eb_invites").update({ claimed_at: new Date().toISOString(), claim_id: claimId })
      .eq("id", invite.id).is("claimed_at", null).is("redeemed_at", null).is("revoked_at", null).select("id").maybeSingle();
    if (claimed.error || !claimed.data) return json({ error: "This invitation is no longer available. Ask an admin for a new one." }, 409);

    let userId: string | null = null;
    let createdNew = false;
    let oldAppMeta: Record<string, unknown> | null = null;
    let oldUserMeta: Record<string, unknown> | null = null;
    const created = await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { wm_role: "eb_member", wm_team: invite.department, wm_section: invite.section, wm_eb_role: invite.eb_role, wm_eb_invite_id: invite.id },
    });
    if (!created.error && created.data.user) {
      userId = created.data.user.id;
      createdNew = true;
    } else {
      const msg = created.error?.message || "";
      if (!/already\s+(?:been\s+)?registered|already exists|duplicate key|email.*already/i.test(msg)) {
        await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
        console.error("[wm-eb-access] Account creation failed", { error: msg.slice(0, 160) });
        return json({ error: "Could not create your account. The invitation is still available; try again shortly." }, 500);
      }
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!anonKey) {
        await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
        return json({ error: "An account already exists for this email. Use its existing password, or ask an admin for help." }, 409);
      }
      const verifier = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const verified = await verifier.auth.signInWithPassword({ email, password });
      if (verified.error || !verified.data.user) {
        await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
        return json({ error: "An account already exists for this email. Enter its current password; the invitation has not been consumed." }, 409);
      }
      const existing = verified.data.user;
      const admin = await db.from("admins").select("user_id").eq("user_id", existing.id).maybeSingle();
      const head = await db.from("department_heads").select("user_id").eq("user_id", existing.id).eq("active", true).limit(1).maybeSingle();
      const existingMeta = (existing.app_metadata ?? {}) as Record<string, unknown>;
      const matchingPending = existingMeta.wm_role === "pending_eb_setup" && existingMeta.wm_pending_invite_id === invite.id;
      if (admin.data || head.data || (existingMeta.wm_role && !matchingPending && (existingMeta.wm_role !== "eb_member" || existingMeta.wm_eb_invite_id !== invite.id))) {
        await verifier.auth.signOut();
        await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
        return json({ error: "This email already has a different WEST MUN assignment. Existing admin/head access and passwords were left unchanged." }, 409);
      }
      oldAppMeta = { ...existingMeta };
      oldUserMeta = { ...((existing.user_metadata ?? {}) as Record<string, unknown>) };
      const linked = await db.auth.admin.updateUserById(existing.id, {
        app_metadata: { ...existingMeta, wm_role: "eb_member", wm_team: invite.department, wm_section: invite.section, wm_eb_role: invite.eb_role, wm_eb_invite_id: invite.id },
        user_metadata: { ...oldUserMeta, full_name: fullName },
      });
      await verifier.auth.signOut();
      if (linked.error || !linked.data.user) {
        await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
        return json({ error: "Your existing account was verified, but its assignment could not be saved. The invitation is still available." }, 500);
      }
      userId = existing.id;
    }

    if (!userId) {
      await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
      return json({ error: "Could not verify the account. The invitation is still available." }, 500);
    }
    const passCreated = await db.from("wm_qr_passes").insert({
      user_id: userId,
      qr_token: randomHex(32),
      full_name: fullName,
      email,
      account_role: invite.eb_role,
      team: invite.department,
      section: invite.section,
      active: true,
      inside: false,
    }).select("user_id").maybeSingle();
    if (passCreated.error || !passCreated.data) {
      if (createdNew) await db.auth.admin.updateUserById(userId, { app_metadata: { wm_role: "pending_eb_setup", wm_pending_invite_id: invite.id } });
      else if (oldAppMeta && oldUserMeta) await db.auth.admin.updateUserById(userId, { app_metadata: oldAppMeta, user_metadata: oldUserMeta });
      await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
      console.error("[wm-eb-access] QR pass creation failed", { code: passCreated.error?.code });
      return json({ error: "Your account was verified, but its QR pass could not be issued. The invitation is still available; try again." }, 500);
    }

    const finalized = await db.from("wm_eb_invites").update({ redeemed_at: new Date().toISOString(), claimed_at: null, claim_id: null })
      .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null).is("revoked_at", null).select("id").maybeSingle();
    if (finalized.error || !finalized.data) {
      let rollbackFailed = false;
      if (createdNew) rollbackFailed = Boolean((await db.auth.admin.updateUserById(userId, { app_metadata: { wm_role: "pending_eb_setup", wm_pending_invite_id: invite.id } })).error);
      else if (oldAppMeta && oldUserMeta) rollbackFailed = Boolean((await db.auth.admin.updateUserById(userId, { app_metadata: oldAppMeta, user_metadata: oldUserMeta })).error);
      await db.from("wm_eb_invites").update({ claimed_at: null, claim_id: null }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
      console.error("[wm-eb-access] Finalization failed", { rollback_failed: rollbackFailed });
      return json({ error: "Signup could not be finalized safely. Your invitation is still available; try again." }, 500);
    }
    return json({ success: true, redirectTo: "/eb", department: invite.department, section: invite.section, ebRole: invite.eb_role }, 201);
  }

  return json({ error: "Unsupported action." }, 400);
});
