import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SITE_URL = (Deno.env.get("WESTMUN_SITE_URL") || "https://west-mun.vercel.app").replace(/\/$/, "");
const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, origin = SITE_URL) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) },
  });
const normalizedEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const normalizedFullName = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase() : "";
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 120;
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (length = 32) => { const b = new Uint8Array(length); crypto.getRandomValues(b); return hex(b); };
const sha256 = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
const routeForTeam = (team: string) => {
  if (team === "security") return "/security";
  if (team === "media" || team === "media_press") return "/media";
  return "/volunteer";
};
const canonicalTeam = (team: string) => {
  if (team === "media_press" || team === "media") return "media";
  if (team === "volunteer" || team === "volunteers") return "volunteers";
  return team;
};
const teamLabel = (team: string) => {
  const canonical = canonicalTeam(team);
  if (canonical === "security") return "Security";
  if (canonical === "media") return "Media";
  if (canonical === "volunteers") return "Volunteers";
  return canonical.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};
const acceptanceMessage = (app: { full_name: string; team: string; section: string | null }, signupUrl: string) => {
  const firstName = (app.full_name || "").trim().split(/\s+/)[0] || "there";
  const assignment = app.section
    ? `${app.section} section of the ${teamLabel(app.team)} team`
    : `${teamLabel(app.team)} team`;
  return `Hi ${firstName},\n\nCongratulations! Your application to WEST MUN 2027 has been accepted for the ${assignment}.\n\n**Next step: create your team account**\n1. Open your private signup link: ${signupUrl}\n2. Sign up using the exact same email address you used in your application.\n3. Enter your full name as it appears on your application and create your password.\n\nThis invitation is personal to you and remains valid until it is used or revoked. Please do not share it.\n\nIf you have any trouble signing up, reply to this email for help.\n\nBest regards,\nWEST MUN 2027 Secretariat`;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    if (origin !== SITE_URL) return new Response(null, { status: 403, headers: { "Vary": "Origin" } });
    return new Response(null, { status: 204, headers: corsHeaders(SITE_URL) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin === SITE_URL ? SITE_URL : "");
  if (origin && origin !== SITE_URL) return json({ error: "Origin not allowed." }, 403, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Signup service is not configured." }, 503);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const action = body.action;

  if (action === "create") {
    const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: "Sign in as an authorized WEST MUN admin or section head." }, 401);
    const auth = await db.auth.getUser(bearer[1]);
    if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
    const actorId = auth.data.user.id;
    const isAdmin = await db.from("admins").select("user_id").eq("user_id", actorId).maybeSingle();
    let head: { department: string; section: string | null } | null = null;
    if (!isAdmin.data) {
      const headResult = await db.from("department_heads").select("department,section").eq("user_id", actorId).eq("active", true);
      if (headResult.error || !headResult.data?.length) return json({ error: "Only an authorized admin or active section head can create signup links." }, 403);
      const registrationId = typeof body.registrationId === "string" ? body.registrationId : "";
      if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return json({ error: "A valid application is required." }, 400);
      const applicationResult = await db.from("team_registrations").select("id,full_name,email,team,section,status,admin_finalized_at,admin_finalized_by").eq("id", registrationId).maybeSingle();
      if (applicationResult.error || !applicationResult.data) return json({ error: "Application not found." }, 404);
      const app = applicationResult.data;
      if (app.status !== "accepted" || !app.admin_finalized_at || !app.admin_finalized_by) return json({ error: "Only applications finally approved by an admin can receive signup links. For older approvals, open the application in Admin and save its Accepted status once." }, 409);
      const permitted = headResult.data.some((h) => {
        const teamMatches = h.department === app.team ||
          (h.department === "media_press" && (app.team === "media" || app.team === "media_press"));
        const sectionMatches = !h.section || h.section === app.section;
        return teamMatches && sectionMatches;
      });
      if (!isAdmin.data && !permitted) return json({ error: "You cannot create a link for this team or section." }, 403);
      return await issueInvite(db, actorId, app, SITE_URL);
    }
    const registrationId = typeof body.registrationId === "string" ? body.registrationId : "";
    if (!/^[0-9a-f-]{36}$/i.test(registrationId)) return json({ error: "A valid application is required." }, 400);
    const applicationResult = await db.from("team_registrations").select("id,full_name,email,team,section,status,admin_finalized_at,admin_finalized_by").eq("id", registrationId).maybeSingle();
    if (applicationResult.error || !applicationResult.data) return json({ error: "Application not found." }, 404);
    if (applicationResult.data.status !== "accepted" || !applicationResult.data.admin_finalized_at || !applicationResult.data.admin_finalized_by) return json({ error: "Only applications finally approved by an admin can receive signup links. For older approvals, open the application in Admin and save its Accepted status once." }, 409);
    return await issueInvite(db, actorId, applicationResult.data, SITE_URL);
  }

  if (action === "create_batch") {
    const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: "Sign in as a WEST MUN admin first." }, 401);
    const auth = await db.auth.getUser(bearer[1]);
    if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired." }, 401);
    const admin = await db.from("admins").select("user_id").eq("user_id", auth.data.user.id).maybeSingle();
    const headResult = admin.data ? null : await db.from("department_heads")
      .select("department,section").eq("user_id", auth.data.user.id).eq("active", true);
    if (admin.error) return json({ error: "Could not verify admin permissions." }, 500);
    if (!admin.data && (headResult?.error || !headResult?.data?.length)) {
      return json({ error: "Bulk signup links are available to authorized admins and active section heads." }, 403);
    }
    const ids = Array.isArray(body.registrationIds) ? body.registrationIds : [];
    if (ids.length < 1 || ids.length > 25 || ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
      return json({ error: "Choose between 1 and 25 valid application IDs." }, 400);
    }
    const uniqueIds = [...new Set(ids as string[])];
    const appsResult = await db.from("team_registrations")
      .select("id,full_name,email,team,section,status,admin_finalized_at,admin_finalized_by")
      .in("id", uniqueIds);
    if (appsResult.error) return json({ error: "Could not load the selected applications." }, 500);
    const apps = appsResult.data ?? [];
    if (apps.length !== uniqueIds.length || apps.some((app) => app.status !== "accepted" || !app.admin_finalized_at || !app.admin_finalized_by)) {
      return json({ error: "Every selected application must have a confirmed final admin approval. For older accepted applications, open each one in Admin and save its Accepted status once. No links were generated." }, 409);
    }
    if (!admin.data) {
      const permitted = apps.every((app) => headResult!.data!.some((h) => {
        const teamMatches = h.department === app.team ||
          (h.department === "media_press" && (app.team === "media" || app.team === "media_press"));
        return teamMatches && (!h.section || h.section === app.section);
      }));
      if (!permitted) return json({ error: "You can only generate bulk links for applications in your assigned team and section." }, 403);
    }
    const links: Array<{ signupUrl: string; applicantEmail: string; team: string; section: string | null; expiresAt: string }> = [];
    const failures: Array<{ registrationId: string; error: string }> = [];
    for (const app of apps) {
      const response = await issueInvite(db, auth.data.user.id, app, SITE_URL);
      const result = await response.json();
      if (response.status >= 200 && response.status < 300 && result?.success && typeof result.signupUrl === "string") {
        links.push({ signupUrl: result.signupUrl, message: result.message, applicantEmail: result.applicantEmail, team: result.team, section: result.section, expiresAt: result.expiresAt });
      } else {
        failures.push({ registrationId: app.id, error: typeof result?.error === "string" ? result.error : "Could not create link." });
      }
    }
    return json({ success: failures.length === 0, links, failures }, failures.length && !links.length ? 500 : 201);
  }

  if (action === "signup") {
    const token = typeof body.token === "string" ? body.token.trim().toLowerCase() : "";
    const email = normalizedEmail(body.email);
    const suppliedFullName = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: "This signup link is invalid. Ask your section head for a new link." }, 400);
    if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 12 || password.length > 128) return json({ error: "Use a password between 12 and 128 characters." }, 400);

    const tokenHash = await sha256(token);
    const inviteResult = await db.from("team_signup_invites").select("id,registration_id,email,team,section,expires_at,redeemed_at,revoked_at,claimed_at,claim_id")
      .eq("token_hash", tokenHash).maybeSingle();
    const invite = inviteResult.data;
    if (inviteResult.error || !invite || invite.revoked_at || invite.redeemed_at) {
      return json({ error: "This signup link is invalid, expired, or already used. Ask your section head for a new link." }, 400);
    }
    if (email !== invite.email) return json({ error: "Please use the same email you applied with." }, 403);

    const applicationResult = await db.from("team_registrations").select("id,full_name,email,team,section,status,admin_finalized_at,admin_finalized_by")
      .eq("id", invite.registration_id).maybeSingle();
    const app = applicationResult.data;
    if (applicationResult.error || !app || app.status !== "accepted" || !app.admin_finalized_at || !app.admin_finalized_by ||
        normalizedEmail(app.email) !== email || app.team !== invite.team || app.section !== invite.section) {
      return json({ error: "This application is no longer eligible for signup. Contact the WEST MUN admin team." }, 409);
    }
    // The invitation email is the identity check. Keep the accepted application name for the team account;
    // a name typed into the signup form must not block an otherwise valid email-matched invitation.
    const fullName = app.full_name;

    const now = new Date();
    if (invite.claimed_at && new Date(invite.claimed_at).getTime() < now.getTime() - 10 * 60 * 1000) {
      await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
        .eq("id", invite.id).eq("claim_id", invite.claim_id).is("redeemed_at", null).is("revoked_at", null);
    } else if (invite.claimed_at) {
      return json({ error: "This signup link is currently being used. Wait a few minutes or ask your section head for a new link." }, 409);
    }

    const claimId = crypto.randomUUID();
    const claimResult = await db.from("team_signup_invites").update({ claimed_at: now.toISOString(), claim_id: claimId })
      .eq("id", invite.id).eq("token_hash", tokenHash).is("claimed_at", null).is("redeemed_at", null).is("revoked_at", null)
      .select("id").maybeSingle();
    if (claimResult.error || !claimResult.data) return json({ error: "This signup link was just used or is no longer available. Ask your section head for a new link." }, 409);

    const team = canonicalTeam(app.team);
    let accountUserId: string | null = null;
    let createdNewUser = false;
    let previousAppMetadata: Record<string, unknown> | null = null;
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: {
        wm_role: "team_member",
        wm_team: team,
        wm_section: app.section,
        wm_registration_id: app.id,
      },
    });
    if (!created.error && created.data.user) {
      accountUserId = created.data.user.id;
      createdNewUser = true;
    } else {
      const msg = created.error?.message || "";
      if (/already\s+(?:been\s+)?registered|already exists|duplicate key|email.*already/i.test(msg)) {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!anonKey) {
          await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
            .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
          return json({ error: "An account already exists for this email. Sign in with its existing password, or ask your section head for help." }, 409);
        }
        const verifier = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const verified = await verifier.auth.signInWithPassword({ email, password });
        if (verified.error || !verified.data.user) {
          await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
            .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
          return json({ error: "An account already exists for this email. Use its existing password; this invitation has not been consumed." }, 409);
        }
        const existingUser = verified.data.user;
        const existingMeta = (existingUser.app_metadata ?? {}) as Record<string, unknown>;
        if ((existingMeta.wm_role && existingMeta.wm_role !== "team_member") ||
            (existingMeta.wm_role === "team_member" && existingMeta.wm_registration_id !== app.id)) {
          await verifier.auth.signOut();
          await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
            .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
          return json({ error: "This email already has a different WEST MUN assignment. Contact the Secretariat to resolve the account before using this invitation." }, 409);
        }
        previousAppMetadata = { ...existingMeta };
        const linked = await db.auth.admin.updateUserById(existingUser.id, {
          // The email-matched accepted application is the trusted source of the member's name.
          // Keep existing metadata, but sync the accepted name so QR pass issuance works for
          // applicants who already had a Supabase account before accepting the invitation.
          user_metadata: {
            ...((existingUser.user_metadata ?? {}) as Record<string, unknown>),
            full_name: fullName,
          },
          app_metadata: {
            ...existingMeta,
            wm_role: "team_member",
            wm_team: team,
            wm_section: app.section,
            wm_registration_id: app.id,
          },
        });
        await verifier.auth.signOut();
        if (linked.error || !linked.data.user) {
          await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
            .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
          console.error("[team-signup] Existing account assignment failed", { error: (linked.error?.message || "").slice(0, 160) });
          return json({ error: "Your existing account was verified, but its team assignment could not be updated. The invitation is still available; contact the Secretariat." }, 500);
        }
        accountUserId = existingUser.id;
      } else {
        await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
          .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
        console.error("[team-signup] Auth account creation failed", { error: msg.slice(0, 160) });
        return json({ error: "Could not create the account. The invitation is still available; try again shortly." }, 500);
      }
    }
    if (!accountUserId) {
      await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
        .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
      return json({ error: "Could not verify the account. The invitation is still available; try again shortly." }, 500);
    }

    const finalized = await db.from("team_signup_invites").update({
      redeemed_at: new Date().toISOString(), claimed_at: null, claim_id: null,
    }).eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null).is("revoked_at", null).select("id").maybeSingle();
    if (finalized.error || !finalized.data) {
      let rollbackFailed = false;
      if (createdNewUser && accountUserId) {
        const rollback = await db.auth.admin.deleteUser(accountUserId);
        rollbackFailed = Boolean(rollback.error);
      } else if (accountUserId && previousAppMetadata) {
        const rollback = await db.auth.admin.updateUserById(accountUserId, { app_metadata: previousAppMetadata });
        rollbackFailed = Boolean(rollback.error);
      }
      await db.from("team_signup_invites").update({ claimed_at: null, claim_id: null })
        .eq("id", invite.id).eq("claim_id", claimId).is("redeemed_at", null);
      console.error("[team-signup] Invite finalization failed", { rollback_failed: rollbackFailed });
      return json({ error: "Signup could not be finalized safely. Your link has not been consumed; please try again." }, 500);
    }
    return json({ success: true, team, section: app.section, redirectTo: routeForTeam(team) }, 201);
  }

  return json({ error: "Unsupported action." }, 400);
});

async function issueInvite(
  db: ReturnType<typeof createClient>,
  actorId: string,
  app: { id: string; full_name: string; email: string; team: string; section: string | null; status: string; admin_finalized_at: string | null; admin_finalized_by: string | null },
  siteUrl: string,
) {
  const email = normalizedEmail(app.email);
  if (app.status !== "accepted" || !app.admin_finalized_at || !app.admin_finalized_by) return json({ error: "Only applications finally approved by an admin can receive signup links." }, 409);
  if (!validEmail(email)) return json({ error: "This application does not have a valid email address." }, 422);
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const now = new Date();
  const expires = new Date("9999-12-31T23:59:59.999Z");
  const revoke = await db.from("team_signup_invites").update({ revoked_at: now.toISOString() })
    .eq("registration_id", app.id).is("redeemed_at", null).is("revoked_at", null);
  if (revoke.error) return json({ error: "Could not replace the previous signup link." }, 500);
  const inserted = await db.from("team_signup_invites").insert({
    registration_id: app.id,
    email,
    team: app.team,
    section: app.section || null,
    token_hash: tokenHash,
    expires_at: expires.toISOString(),
    created_by: actorId,
  }).select("id,expires_at").single();
  if (inserted.error || !inserted.data) {
    console.error("[team-signup] Invite creation failed", { code: inserted.error?.code });
    return json({ error: "Could not create the signup link. Please try again." }, 500);
  }
  return json({
    success: true,
    signupUrl: `${siteUrl}/signup#token=${token}`,
    message: acceptanceMessage(app, `${siteUrl}/signup#token=${token}`),
    expiresAt: "No expiry (valid until used or revoked)",
    applicantEmail: email,
    team: canonicalTeam(app.team),
    section: app.section,
  }, 201);
}
