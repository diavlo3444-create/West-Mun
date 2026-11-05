import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SITE_URL = (Deno.env.get("WESTMUN_SITE_URL") || "https://west-mun.vercel.app").replace(/\/$/, "");
const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status = 200, origin = SITE_URL) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(origin) } });

type Source = "team" | "chair" | "delegate";
type Status = "accepted" | "rejected";
type Template = { subject: string; body: string };
type Applicant = { id: string; full_name: string; email: string; status: Status; team?: string | null; section?: string | null; institution?: string | null; committee_preferences?: string | null; delegation_type?: string | null; tier?: string | null };
type Candidate = { source: Source; applicant: Applicant };

const defaults: Record<Status, Template> = {
  accepted: {
    subject: "Your WEST MUN 2027 Application — Accepted",
    body: "Hello {name},\n\nCongratulations! Your application to WEST MUN 2027 has been accepted.\n\nDepartment / category: {department}\n\nFurther information and next steps will be shared by the WEST MUN Secretariat.\n\nBest regards,\nWEST MUN 2027 Secretariat",
  },
  rejected: {
    subject: "Your WEST MUN 2027 Application Update",
    body: "Hello {name},\n\nThank you for applying to WEST MUN 2027 and for taking the time to share your experience and interest. After reviewing your application, we are unable to offer you a place at this time.\n\nWe appreciate your interest in WEST MUN and wish you the very best.\n\nBest regards,\nWEST MUN 2027 Secretariat",
  },
};

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const departmentFor = (source: Source, a: Applicant) => source === "team" ? [a.team, a.section].filter(Boolean).join(" · ") : source === "chair" ? "Chair" : "Delegate";
const render = (value: string, a: Applicant, source: Source) => value
  .replaceAll("{name}", a.full_name || "Applicant")
  .replaceAll("{department}", departmentFor(source, a) || "WEST MUN")
  .replaceAll("{institution}", a.institution || "Not provided");

async function loadCandidates(db: ReturnType<typeof createClient>): Promise<Candidate[]> {
  const [team, chair, delegates] = await Promise.all([
    db.from("team_registrations").select("id,full_name,email,status,team,section,institution").in("status", ["accepted", "rejected"]),
    db.from("wm_chair_applications").select("id,full_name,email,status,institution,committee_preferences").in("status", ["accepted", "rejected"]),
    db.from("delegates").select("id,full_name,email,status,institution,delegation_type,tier").in("status", ["accepted", "rejected"]),
  ]);
  if (team.error || chair.error || delegates.error) throw new Error("Could not load all application groups.");
  return [
    ...(team.data || []).map((app) => ({ source: "team" as const, applicant: app as Applicant })),
    ...(chair.data || []).map((app) => ({ source: "chair" as const, applicant: app as Applicant })),
    ...(delegates.data || []).map((app) => ({ source: "delegate" as const, applicant: app as Applicant })),
  ];
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return origin === SITE_URL ? new Response(null, { status: 204, headers: cors(SITE_URL) }) : new Response(null, { status: 403 });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin || SITE_URL);
  if (origin && origin !== SITE_URL) return json({ error: "Origin not allowed." }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server Supabase configuration is incomplete." }, 503);
  const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return json({ error: "Sign in before using Magic Messaging." }, 401);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await db.auth.getUser(bearer[1]);
  if (auth.error || !auth.data.user) return json({ error: "Your session is invalid or expired. Sign in again." }, 401);
  const actorId = auth.data.user.id;
  const [admin, hr] = await Promise.all([
    db.from("admins").select("user_id").eq("user_id", actorId).maybeSingle(),
    db.from("department_heads").select("user_id").eq("user_id", actorId).eq("department", "hr").eq("active", true).maybeSingle(),
  ]);
  if (admin.error || hr.error) return json({ error: "Could not verify HR permissions." }, 500);
  if (!admin.data && !hr.data) return json({ error: "Only active HR staff and admins can use Magic Messaging." }, 403);

  let payload: { action?: string; templates?: Partial<Record<Status, Template>> };
  try { payload = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  if (!["preview", "send"].includes(payload.action || "")) return json({ error: "Choose preview or send." }, 400);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("WESTMUN_EMAIL_FROM");
  const configured = Boolean(resendKey && from);
  let templates = { ...defaults };
  if (payload.templates) {
    for (const status of ["accepted", "rejected"] as const) {
      const candidate = payload.templates[status];
      if (candidate && typeof candidate.subject === "string" && typeof candidate.body === "string") {
        const subject = candidate.subject.trim();
        const body = candidate.body.trim();
        if (!subject || subject.length > 200 || !body || body.length > 12000) return json({ error: "Email subjects must be 1–200 characters and message bodies 1–12,000 characters." }, 400);
        templates[status] = { subject, body };
      }
    }
  }

  try {
    const candidates = await loadCandidates(db);
    const history = await db.from("wm_email_messages")
      .select("applicant_type,source_applicant_id,template_key,status")
      .in("template_key", ["acceptance", "rejection"])
      .in("status", ["queued", "sent"]);
    if (history.error) return json({ error: "Could not read email history." }, 500);
    const active = new Set((history.data || []).map((row) => `${row.applicant_type}:${row.source_applicant_id}:${row.template_key}`));
    const summary = {
      accepted: { total: 0, ready: 0, alreadyHandled: 0, missingEmail: 0 },
      rejected: { total: 0, ready: 0, alreadyHandled: 0, missingEmail: 0 },
      totalReady: 0,
      providerConfigured: configured,
    };
    const pending: Candidate[] = [];
    for (const candidate of candidates) {
      const status = candidate.applicant.status;
      const bucket = summary[status];
      bucket.total++;
      const key = `${candidate.source}:${candidate.applicant.id}:${status === "accepted" ? "acceptance" : "rejection"}`;
      if (active.has(key)) { bucket.alreadyHandled++; continue; }
      if (!validEmail(String(candidate.applicant.email || "").trim())) { bucket.missingEmail++; continue; }
      bucket.ready++;
      pending.push(candidate);
    }
    summary.totalReady = pending.length;

    if (payload.action === "preview") return json({ ok: true, summary, templates: defaults });

    if (!configured) return json({ error: "Resend is not configured. Add RESEND_API_KEY and WESTMUN_EMAIL_FROM to Supabase Edge Function secrets before sending.", summary }, 503);

    const result = { sent: 0, failed: 0, skipped: 0, errors: [] as Array<{ name: string; reason: string }> };
    for (const candidate of pending) {
      const a = candidate.applicant;
      const status = a.status;
      const templateKey = status === "accepted" ? "acceptance" : "rejection";
      const subject = render(templates[status].subject, a, candidate.source);
      const body = render(templates[status].body, a, candidate.source);
      const logInsert = await db.from("wm_email_messages").insert({
        applicant_id: candidate.source === "team" ? a.id : null,
        applicant_type: candidate.source,
        source_applicant_id: a.id,
        recipient_email: String(a.email).trim().toLowerCase(),
        recipient_name: a.full_name || "",
        subject,
        body_text: body,
        template_key: templateKey,
        status: "queued",
        provider: "resend",
        sent_by: actorId,
      }).select("id").single();
      if (logInsert.error || !logInsert.data) {
        if (logInsert.error?.code === "23505") { result.skipped++; continue; }
        result.failed++;
        result.errors.push({ name: a.full_name || "Applicant", reason: "Could not create email history record." });
        continue;
      }
      const logId = logInsert.data.id;
      try {
        const html = `<!doctype html><html><body style="margin:0;background:#080808;color:#f4f0e6;font-family:Arial,sans-serif"><div style="max-width:640px;margin:32px auto;padding:32px;border:1px solid #8f7136;background:#111"><div style="color:#d7b66b;letter-spacing:3px;font-size:12px">WEST MUN · 2027</div><h2 style="font-weight:500;line-height:1.4">${esc(subject)}</h2><div style="white-space:pre-wrap;line-height:1.7;color:#e7e2d7">${esc(body)}</div><p style="margin-top:32px;color:#c8ad71">WEST MUN Secretariat</p></div></body></html>`;
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [String(a.email).trim().toLowerCase()], subject, text: body, html }),
        });
        const providerResult = await response.json().catch(() => ({}));
        if (!response.ok) {
          const reason = typeof providerResult?.message === "string" ? providerResult.message.slice(0, 400) : `Email provider returned HTTP ${response.status}.`;
          await db.from("wm_email_messages").update({ status: "failed", error_message: reason }).eq("id", logId);
          result.failed++;
          result.errors.push({ name: a.full_name || "Applicant", reason });
          continue;
        }
        await db.from("wm_email_messages").update({
          status: "sent",
          provider_message_id: typeof providerResult?.id === "string" ? providerResult.id : null,
          sent_at: new Date().toISOString(),
          error_message: null,
        }).eq("id", logId);
        result.sent++;
      } catch {
        await db.from("wm_email_messages").update({ status: "failed", error_message: "Email provider request failed. Check Edge Function logs." }).eq("id", logId);
        result.failed++;
        result.errors.push({ name: a.full_name || "Applicant", reason: "Email provider request failed." });
      }
    }
    return json({ ok: result.failed === 0, result, summary });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Magic Messaging could not complete the request." }, 500);
  }
});
