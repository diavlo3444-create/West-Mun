import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldCheck, LockKeyhole, Loader2, ArrowLeft, CalendarDays, MapPin, Clock3, UserRound, ScanLine } from "lucide-react";

type TeamAssignment = {
  id: string;
  assignment_title: string | null;
  station: string | null;
  starts_at: string | null;
  ends_at: string | null;
  reporting_to: string | null;
  status: string | null;
  notes: string | null;
};

const teamMeta: Record<string, { title: string; department: string }> = {
  security: { title: "Security", department: "security" },
  media: { title: "Media", department: "media_press" },
  volunteers: { title: "Volunteers", department: "volunteers" },
};

function dateLabel(value: string | null) {
  if (!value) return "Time to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}
function timeLabel(value: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function TeamMemberPortal() {
  const route = window.location.pathname.replace(/\/$/, "") || "/";
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [team, setTeam] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [shifts, setShifts] = useState<TeamAssignment[]>([]);
  const [shiftError, setShiftError] = useState("");
  const isTeamHub = route === "/team-members";
  const requestedTeam = route === "/security" ? "security" : route === "/media" ? "media" : route === "/volunteer" ? "volunteers" : "";

  useEffect(() => {
    let live = true;
    const check = async () => {
      if (!supabase) { if (live) setLoading(false); return; }
      const { data, error } = await supabase.auth.getUser();
      const meta = data.user?.app_metadata as Record<string, unknown> | undefined;
      const actualTeam = typeof meta?.wm_team === "string" ? meta.wm_team : "";
      const role = meta?.wm_role;
      const validTeam = ["security", "media", "media_press", "volunteers", "volunteer"].includes(actualTeam);
      const normalizedTeam = actualTeam === "media_press" ? "media" : actualTeam === "volunteer" ? "volunteers" : actualTeam;
      if (!error && data.user && role === "team_member" && validTeam && (isTeamHub || normalizedTeam === requestedTeam)) {
        setAuthorized(true);
        setTeam(normalizedTeam);
        setSection(typeof meta?.wm_section === "string" ? meta.wm_section : null);
        const metadataRole = typeof meta?.wm_role_title === "string" ? meta.wm_role_title : "";
        setRoleTitle(metadataRole);
        const registrationId = typeof meta?.wm_registration_id === "string" ? meta.wm_registration_id : "";
        if (registrationId) {
          const { data: assignmentRows, error: assignmentsError } = await supabase
            .from("wm_team_assignments")
            .select("id, assignment_title, station, starts_at, ends_at, reporting_to, status, notes")
            .eq("registration_id", registrationId)
            .order("starts_at", { ascending: true, nullsFirst: false });
          if (!live) return;
          if (assignmentsError) {
            setShiftError("Your shifts could not load right now. Please try again later or contact your section head.");
          } else {
            const rows = (assignmentRows || []) as TeamAssignment[];
            setShifts(rows);
            if (!metadataRole && rows.length) setRoleTitle(rows.find((item) => item.assignment_title)?.assignment_title || "");
          }
        } else {
          setShiftError("Your account is missing its team assignment link. Please contact your section head.");
        }
      } else {
        setAuthorized(false);
      }
      if (live) setLoading(false);
    };
    void check();
    return () => { live = false; };
  }, [requestedTeam, isTeamHub]);

  const info = teamMeta[team || requestedTeam] || teamMeta.volunteers;
  const upcomingShifts = useMemo(() => shifts.filter((shift) => !shift.starts_at || new Date(shift.starts_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000), [shifts]);

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-[#f5f5f5] sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-5">
          <a href="/" className="flex items-center gap-2 text-xs text-neutral-400 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> WEST MUN website</a>
          <div className="flex items-center gap-2">
            {team === "security" && <a href="/scanner" className="inline-flex items-center gap-2 rounded-md bg-[#d4af37] px-3 py-2 text-xs font-semibold text-black hover:brightness-110"><ScanLine className="h-4 w-4" /> Scan passes</a>}
            <a href="/pass" className="rounded-md border border-[#d4af37]/35 px-3 py-2 text-xs font-medium text-[#e6cc78] hover:bg-[#d4af37]/10">My QR Pass</a>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center gap-3 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /> Loading your team workspace…</div>
        ) : !authorized ? (
          <div className="mx-auto mt-20 max-w-md rounded-xl border border-rose-500/20 bg-[#101013] p-7 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-rose-300" />
            <h1 className="mt-4 font-serif text-2xl">Team access required</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">Sign in with the account created from your official team invitation link.</p>
            <a href="/login" className="mt-5 inline-flex rounded-md border border-[#d4af37]/30 px-4 py-2 text-xs text-[#e2c258] hover:bg-[#d4af37]/10">Sign in</a>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]"><ShieldCheck className="h-4 w-4" /> WEST MUN 2027</p>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Team Members</h1>
              <p className="mt-2 text-sm text-neutral-400">{info.title}{section ? ` · ${section.charAt(0).toUpperCase() + section.slice(1)} Section` : ""}</p>
            </div>

            <section className="mt-6 rounded-xl border border-[#d4af37]/20 bg-gradient-to-br from-[#17150f] to-[#0c0c0f] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 p-3 text-[#e2c258]"><UserRound className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">Your assigned role</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{roleTitle || (section ? `${section} Team Member` : `${info.title} Team Member`)}</h2>
                  <p className="mt-1 text-sm text-neutral-400">Check your shift details below and arrive at your assigned station on time.</p>
                </div>
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Your schedule</p>
                  <h2 className="mt-1 font-serif text-2xl">My shifts</h2>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-400">{upcomingShifts.length} upcoming</span>
              </div>

              {shiftError ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-4 text-sm text-amber-200">{shiftError}</div>
              ) : upcomingShifts.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#0d0d10] px-5 py-8 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-neutral-500" />
                  <h3 className="mt-3 text-base font-medium">No shifts assigned yet</h3>
                  <p className="mt-1 text-sm text-neutral-500">Your section head will add your shifts here when the schedule is ready.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingShifts.map((shift) => (
                    <article key={shift.id} className="rounded-xl border border-white/10 bg-[#0d0d10] p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-white">{shift.assignment_title || "Team shift"}</h3>
                          <p className="mt-1 text-sm text-neutral-400">{dateLabel(shift.starts_at)}</p>
                        </div>
                        {shift.status && <span className="rounded-full border border-[#d4af37]/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#e2c258]">{shift.status.replace(/_/g, " ")}</span>}
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
                        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-[#d4af37]" />{timeLabel(shift.starts_at)} – {timeLabel(shift.ends_at)}</p>
                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#d4af37]" />{shift.station || "Station TBA"}</p>
                      </div>
                      {shift.reporting_to && <p className="mt-3 text-xs text-neutral-400">Report to: <span className="text-neutral-200">{shift.reporting_to}</span></p>}
                      {shift.notes && <p className="mt-3 border-t border-white/[0.07] pt-3 text-sm leading-relaxed text-neutral-400">{shift.notes}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
