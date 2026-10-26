import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  ShieldCheck,
  LockKeyhole,
  Loader2,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock3,
  UserRound,
  ScanLine,
  QrCode,
  Sparkles,
  LogOut,
  ChevronRight,
  Radio,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TeamWelcomeIntro } from "./TeamWelcomeIntro";

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

const teamMeta: Record<string, { title: string; department: string; briefing: string }> = {
  security: {
    title: "Security & Operations",
    department: "security",
    briefing: "Authorized security personnel ensuring diplomatic protocol, credential verification, and venue protection across WEST MUN 2027 halls.",
  },
  media: {
    title: "Media & Press Operations",
    department: "media_press",
    briefing: "Accredited conference press corps capturing proceedings, conducting delegate interviews, and publishing official conference communiqués.",
  },
  volunteers: {
    title: "Volunteers & Logistics",
    department: "volunteers",
    briefing: "Essential operational corps managing delegate registration, committee room logistics, page duties, and assembly coordination.",
  },
};

function dateLabel(value: string | null) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function timeLabel(value: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function TeamMemberPortal() {
  const route = window.location.pathname.replace(/\/$/, "") || "/";
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [memberName, setMemberName] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState<string>("");
  const [team, setTeam] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [shifts, setShifts] = useState<TeamAssignment[]>([]);
  const [shiftError, setShiftError] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const [activeShiftFilter, setActiveShiftFilter] = useState<"all" | "upcoming">("upcoming");

  const isTeamHub = route === "/team-members";
  const requestedTeam =
    route === "/security"
      ? "security"
      : route === "/media"
      ? "media"
      : route === "/volunteer"
      ? "volunteers"
      : "";

  useEffect(() => {
    let live = true;
    const check = async () => {
      if (!supabase) {
        if (live) setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;
      if (error || !user) {
        if (live) {
          setAuthorized(false);
          setLoading(false);
        }
        return;
      }

      const meta = (user.app_metadata || {}) as Record<string, unknown>;
      const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
      const actualTeam = typeof meta?.wm_team === "string" ? meta.wm_team : "";
      const role = meta?.wm_role;
      const validTeam = ["security", "media", "media_press", "volunteers", "volunteer"].includes(
        actualTeam
      );
      const normalizedTeam =
        actualTeam === "media_press"
          ? "media"
          : actualTeam === "volunteer"
          ? "volunteers"
          : actualTeam;

      if (role === "team_member" && validTeam && (isTeamHub || normalizedTeam === requestedTeam)) {
        setAuthorized(true);
        setUserId(user.id);
        setMemberEmail(user.email || "");
        setTeam(normalizedTeam);
        setSection(typeof meta?.wm_section === "string" ? meta.wm_section : null);

        // Resolve member's real name with robust fallbacks
        let resolvedName = typeof userMeta?.full_name === "string" ? userMeta.full_name.trim() : "";
        const metadataRole = typeof meta?.wm_role_title === "string" ? meta.wm_role_title : "";
        setRoleTitle(metadataRole);

        const registrationId = typeof meta?.wm_registration_id === "string" ? meta.wm_registration_id : "";

        // Query shifts and name lookup
        if (registrationId) {
          try {
            const [assignmentsRes, regRes] = await Promise.all([
              supabase
                .from("wm_team_assignments")
                .select("id, assignment_title, station, starts_at, ends_at, reporting_to, status, notes")
                .eq("registration_id", registrationId)
                .order("starts_at", { ascending: true, nullsFirst: false }),
              !resolvedName
                ? supabase
                    .from("team_registrations")
                    .select("full_name")
                    .eq("id", registrationId)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            ]);

            if (!live) return;

            if (regRes.data?.full_name && !resolvedName) {
              resolvedName = regRes.data.full_name;
            }

            if (assignmentsRes.error) {
              setShiftError(
                "Your shifts could not load right now. Please try again later or contact your section head."
              );
            } else {
              const rows = (assignmentsRes.data || []) as TeamAssignment[];
              setShifts(rows);
              if (!metadataRole && rows.length) {
                setRoleTitle(rows.find((item) => item.assignment_title)?.assignment_title || "");
              }
            }
          } catch (e) {
            if (live) setShiftError("Network communication error loading assigned shifts.");
          }
        } else {
          setShiftError("Your account is missing its team assignment link. Please contact your section head.");
        }

        // Secondary fallback for full name if still empty: check wm_qr_passes
        if (!resolvedName) {
          try {
            const { data: passData } = await supabase
              .from("wm_qr_passes")
              .select("full_name")
              .eq("user_id", user.id)
              .maybeSingle();
            if (passData?.full_name) {
              resolvedName = passData.full_name;
            }
          } catch {}
        }

        const finalName = resolvedName || user.email?.split("@")[0] || "Team Member";
        setMemberName(finalName);

        // Check whether welcome sequence should play
        try {
          const viewed = sessionStorage.getItem(`wm_team_welcome_${user.id}`);
          if (viewed !== "true") {
            setShowIntro(true);
          }
        } catch {
          setShowIntro(true);
        }
      } else {
        setAuthorized(false);
      }

      if (live) setLoading(false);
    };

    void check();
    return () => {
      live = false;
    };
  }, [requestedTeam, isTeamHub]);

  const handleIntroComplete = useCallback(() => {
    if (userId) {
      try {
        sessionStorage.setItem(`wm_team_welcome_${userId}`, "true");
      } catch {}
    }
    setShowIntro(false);
  }, [userId]);

  const handleReplayIntro = useCallback(() => {
    setShowIntro(true);
  }, []);

  const handleSignOut = async () => {
    if (userId) {
      try {
        sessionStorage.removeItem(`wm_team_welcome_${userId}`);
      } catch {}
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.replace("/login");
  };

  const info = teamMeta[team || requestedTeam] || teamMeta.volunteers;

  const upcomingShifts = useMemo(() => {
    return shifts.filter(
      (shift) =>
        !shift.starts_at ||
        new Date(shift.starts_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000
    );
  }, [shifts]);

  const displayedShifts = useMemo(() => {
    if (activeShiftFilter === "all") return shifts;
    return upcomingShifts;
  }, [shifts, upcomingShifts, activeShiftFilter]);

  const reportingSupervisor = useMemo(() => {
    const shiftWithSupervisor = shifts.find((s) => s.reporting_to && s.reporting_to.trim());
    return shiftWithSupervisor?.reporting_to || null;
  }, [shifts]);

  const defaultRoleLabel = section
    ? `${section.charAt(0).toUpperCase() + section.slice(1)} ${info.title} Member`
    : `${info.title} Member`;

  return (
    <>
      {/* Cinematic Welcome Intro Overlay */}
      {showIntro && (
        <TeamWelcomeIntro
          memberName={memberName}
          roleTitle={roleTitle || defaultRoleLabel}
          team={info.title}
          section={section}
          onComplete={handleIntroComplete}
        />
      )}

      <main
        className={`min-h-screen bg-[#070707] text-[#f5f5f5] selection:bg-[#d4af37]/30 selection:text-white transition-opacity duration-700 ${
          showIntro ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Subtle Ambient Vignette Header Glow */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-96 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.06)_0%,_transparent_70%)]" />

        <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10">
          {/* Top Bar Navigation */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="group flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1 text-[#d4af37]" />
                <span>WEST MUN Website</span>
              </a>
              <span className="text-neutral-700" aria-hidden="true">/</span>
              <span className="font-mono text-[11px] text-[#f5d47a] uppercase tracking-wider hidden sm:inline">
                Conference Portal
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Replay Cinematic Intro Button */}
              <button
                type="button"
                onClick={handleReplayIntro}
                className="flex items-center gap-1.5 border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-3 py-1.5 text-xs font-medium text-[#f5d47a] hover:border-[#d4af37]/70 hover:bg-[#d4af37]/15 transition-colors"
                title="Replay cinematic conference introduction"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="font-mono text-[11px] uppercase tracking-wider">Replay Intro</span>
              </button>

              {/* Security Scanner Launch Button (Strictly Security Only) */}
              {team === "security" && (
                <a
                  href="/scanner"
                  className="flex items-center gap-2 bg-[#d4af37] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-[#e5c158] transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  title="Launch official QR badge scanner"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  <span className="font-mono text-[11px] uppercase tracking-wider">Scan Passes</span>
                </a>
              )}

              {/* My QR Pass Link */}
              <a
                href="/pass"
                className="flex items-center gap-2 border border-white/15 bg-black/60 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-neutral-300 hover:border-white/40 hover:text-white transition-colors"
                title="Open official conference digital pass"
              >
                <QrCode className="h-3.5 w-3.5 text-[#d4af37]" />
                <span>My QR Pass</span>
              </a>

              {/* Sign Out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-rose-300 hover:border-rose-500/30 transition-colors"
                title="Sign out of team session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline uppercase tracking-wider text-[11px]">Sign out</span>
              </button>
            </div>
          </header>

          {loading ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-sm text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">
                Verifying operational credentials…
              </span>
            </div>
          ) : !authorized ? (
            <div className="mx-auto mt-16 max-w-md border border-rose-500/30 bg-[#0e0e13] p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-950/20 text-rose-300">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h1 className="font-serif text-2xl text-white">Team Access Required</h1>
              <p className="text-sm leading-relaxed text-neutral-400">
                Sign in with the verified account created from your official WEST MUN team invitation.
              </p>
              <div className="pt-2">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center bg-[#d4af37] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#e5c158] transition-colors"
                >
                  Sign In
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-8 sm:space-y-10">
              {/* 1. HERO: ANIMATED TEAM IDENTITY */}
              <section className="relative overflow-hidden border border-[#d4af37]/30 bg-[#0a0a0e] p-6 sm:p-8 lg:p-10">
                {/* Thin top gold highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />

                <div className="space-y-4 max-w-3xl">
                  {/* Metadata Rail (Zero-Pill Discipline) */}
                  <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#d4af37]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                      WEST MUN 2027
                    </span>
                    <span className="text-neutral-600" aria-hidden="true">/</span>
                    <span className="text-neutral-300">{info.title}</span>
                    {section && (
                      <>
                        <span className="text-neutral-600" aria-hidden="true">/</span>
                        <span className="text-neutral-300 capitalize">{section} Section</span>
                      </>
                    )}
                    <span className="text-neutral-600" aria-hidden="true">/</span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Deployment
                    </span>
                  </div>

                  {/* Member Full Name Headline */}
                  <div className="overflow-hidden pt-1">
                    <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-wide text-white leading-tight">
                      {memberName}
                    </h1>
                  </div>

                  {/* Expanding Hairline Divider */}
                  <div className="w-full pt-1 pb-2">
                    <div className="h-[1px] w-full max-w-md bg-gradient-to-r from-[#d4af37]/60 via-[#d4af37]/20 to-transparent" />
                  </div>

                  {/* Role Designation & Operational Mandate */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-base sm:text-lg text-[#f5d47a] font-medium tracking-wide uppercase">
                        {roleTitle || defaultRoleLabel}
                      </span>
                      {reportingSupervisor && (
                        <span className="font-mono text-xs text-neutral-400">
                          · Reports to <span className="text-neutral-200">{reportingSupervisor}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-300 max-w-2xl font-sans">
                      {info.briefing}
                    </p>
                  </div>
                </div>

                {/* Telemetry Quick Bar at Bottom of Hero */}
                <div className="mt-8 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                      Department
                    </span>
                    <span className="font-mono text-sm text-neutral-200 mt-1 block truncate">
                      {info.title}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                      Section
                    </span>
                    <span className="font-mono text-sm text-neutral-200 mt-1 block capitalize">
                      {section ? `${section} Division` : "General"}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                      Assigned Shifts
                    </span>
                    <span className="font-mono text-sm text-[#f5d47a] mt-1 block">
                      {shifts.length} {shifts.length === 1 ? "Duty" : "Duties"}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                      Accreditation
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 mt-1 block font-semibold">
                      Verified Active
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. MAIN GRID: MY ROLE & DIGITAL BADGE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                {/* Left Column: Role Details & Briefing (7 cols) */}
                <section className="lg:col-span-7 space-y-6">
                  <div className="border border-white/10 bg-[#0d0d10] p-6 sm:p-7 space-y-5">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-[#d4af37]" />
                        <h2 className="font-serif text-lg text-white">My Role & Mandate</h2>
                      </div>
                      <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                        Official Dossier
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                          Assigned Title
                        </span>
                        <p className="mt-1 font-serif text-xl sm:text-2xl text-white">
                          {roleTitle || defaultRoleLabel}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="border border-white/5 bg-black/40 p-3.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                            Department Corps
                          </span>
                          <span className="text-sm font-medium text-neutral-200 mt-1 block">
                            {info.title}
                          </span>
                          <span className="text-[11px] text-neutral-400 mt-0.5 block">
                            WEST MUN 2027 Operations
                          </span>
                        </div>

                        <div className="border border-white/5 bg-black/40 p-3.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                            Reporting Supervisor
                          </span>
                          <span className="text-sm font-medium text-neutral-200 mt-1 block">
                            {reportingSupervisor || "Section Head"}
                          </span>
                          <span className="text-[11px] text-neutral-400 mt-0.5 block">
                            Department Leadership
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-white/[0.08] pt-4 space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] block">
                          Operational Instructions
                        </span>
                        <ul className="space-y-2 text-xs text-neutral-300 leading-relaxed">
                          <li className="flex items-start gap-2">
                            <span className="text-[#d4af37] font-bold">·</span>
                            <span>
                              Report to your assigned station at least 15 minutes before the scheduled start time.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#d4af37] font-bold">·</span>
                            <span>
                              Keep your official digital QR pass active on your mobile device for venue access checks.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#d4af37] font-bold">·</span>
                            <span>
                              Coordinate directly with your reporting supervisor for handover notes and station duties.
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Security Scanner Card (Security Only) */}
                  {team === "security" && (
                    <div className="border border-[#d4af37]/40 bg-gradient-to-br from-[#121008] to-[#0a0a0e] p-6 space-y-3 shadow-[0_0_30px_rgba(212,175,55,0.06)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ScanLine className="h-4 w-4 text-[#d4af37]" />
                          <h3 className="font-serif text-base text-white">Security Badge Scanner</h3>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-black bg-[#d4af37] px-2 py-0.5 font-bold">
                          Security Gate
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Authorized Security personnel tool for scanning delegate and executive passes at conference gates, committee chambers, and secure assembly spaces.
                      </p>
                      <div className="pt-2">
                        <a
                          href="/scanner"
                          className="inline-flex items-center gap-2 bg-[#d4af37] px-4 py-2 text-xs font-semibold text-black hover:bg-[#e5c158] transition-all"
                        >
                          <ScanLine className="h-4 w-4" />
                          <span>Launch Live Scanner</span>
                          <ChevronRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </section>

                {/* Right Column: QR Pass Quick Action & Status (5 cols) */}
                <section className="lg:col-span-5 space-y-6">
                  {/* Digital Pass Card */}
                  <div className="border border-white/10 bg-[#0d0d10] p-6 sm:p-7 space-y-5">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-[#d4af37]" />
                        <h2 className="font-serif text-lg text-white">My QR Pass</h2>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="border border-white/5 bg-black/60 p-4 text-center space-y-2">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]">
                          <QrCode className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="font-serif text-base text-white">{memberName}</p>
                          <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                            {roleTitle || defaultRoleLabel}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Present your official digital pass at entrance checkpoints, security desks, and committee registration desks for contactless scan verification.
                      </p>

                      <a
                        href="/pass"
                        className="flex items-center justify-center gap-2 w-full border border-[#d4af37] bg-[#d4af37]/10 py-2.5 text-xs font-mono uppercase tracking-wider text-[#f5d47a] hover:bg-[#d4af37] hover:text-black transition-all"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>View Full QR Pass</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Conference Support & Secretariat Contact */}
                  <div className="border border-white/5 bg-black/40 p-5 space-y-2 text-xs">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 block">
                      Conference Operations Hub
                    </span>
                    <p className="text-neutral-300">
                      Need schedule adjustments or station assistance? Contact your designated Section Head or the Secretariat desk on site.
                    </p>
                    <div className="pt-2 font-mono text-[11px] text-[#f5d47a]">
                      WEST MUN 2027 · General Assembly Hall
                    </div>
                  </div>
                </section>
              </div>

              {/* 3. MY SHIFTS: SCHEDULE & ASSIGNMENTS */}
              <section className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#d4af37]" />
                      <h2 className="font-serif text-2xl text-white">My Shifts & Deployment</h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Verified station assignments and roster coverage for <span className="text-white">{memberName}</span>.
                    </p>
                  </div>

                  {/* Filter Segmented Control (Zero-Pill Discipline) */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveShiftFilter("upcoming")}
                      className={`px-3 py-1.5 transition-colors ${
                        activeShiftFilter === "upcoming"
                          ? "border-b-2 border-[#d4af37] text-white font-semibold bg-white/[0.04]"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Upcoming ({upcomingShifts.length})
                    </button>
                    <span className="text-neutral-700" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => setActiveShiftFilter("all")}
                      className={`px-3 py-1.5 transition-colors ${
                        activeShiftFilter === "all"
                          ? "border-b-2 border-[#d4af37] text-white font-semibold bg-white/[0.04]"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      All ({shifts.length})
                    </button>
                  </div>
                </div>

                {shiftError ? (
                  <div className="border border-amber-500/30 bg-amber-950/15 p-5 text-xs text-amber-200 flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <p>{shiftError}</p>
                  </div>
                ) : displayedShifts.length === 0 ? (
                  /* Clean, tailored editorial empty state - no fake data! */
                  <div className="border border-white/10 bg-[#0d0d10] py-14 px-6 text-center space-y-3">
                    <CalendarDays className="mx-auto h-8 w-8 text-[#d4af37]/40" />
                    <h3 className="font-serif text-lg text-white">
                      {activeShiftFilter === "upcoming" && shifts.length > 0
                        ? "No upcoming shifts remaining"
                        : "No shifts assigned yet"}
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                      {shifts.length > 0
                        ? "All scheduled shift duties have concluded. You can switch to 'All' above to review completed duty records."
                        : "Your section head is preparing station schedules. Once your shifts are published, your stations, reporting supervisors, and timetable will appear here automatically."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {displayedShifts.map((shift) => (
                      <article
                        key={shift.id}
                        className="border border-white/10 bg-[#0d0d10] p-5 sm:p-6 flex flex-col justify-between hover:border-[#d4af37]/40 transition-colors space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37] block">
                                Assigned Duty
                              </span>
                              <h3 className="font-serif text-lg sm:text-xl text-white mt-0.5">
                                {shift.assignment_title || "Conference Shift Duty"}
                              </h3>
                            </div>
                            {shift.status && (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[#f5d47a] border border-[#d4af37]/30 px-2 py-0.5 bg-[#d4af37]/5 shrink-0">
                                {shift.status.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 text-neutral-300">
                              <MapPin className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                              <span className="truncate">
                                Station: {shift.station || "Station to be designated"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-neutral-300">
                              <Clock3 className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                              <span className="font-mono">
                                {timeLabel(shift.starts_at)} – {timeLabel(shift.ends_at)}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs font-mono text-neutral-400 pt-1">
                            <span>Date: {dateLabel(shift.starts_at)}</span>
                          </div>

                          {shift.reporting_to && (
                            <div className="pt-2 border-t border-white/[0.06] text-xs">
                              <span className="font-mono text-[10px] uppercase text-neutral-500 block">
                                Reporting To
                              </span>
                              <span className="text-neutral-200 mt-0.5 block font-medium">
                                {shift.reporting_to}
                              </span>
                            </div>
                          )}

                          {shift.notes && (
                            <div className="pt-2 border-t border-white/[0.06] text-xs">
                              <span className="font-mono text-[10px] uppercase text-neutral-500 block">
                                Station Instructions
                              </span>
                              <p className="mt-1 text-neutral-300 leading-relaxed bg-black/40 p-2.5 border border-white/5 font-mono text-[11px]">
                                {shift.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-500">
                          <span>WEST MUN 2027 Operations</span>
                          <span className="text-[#f5d47a]">Verified Duty</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
