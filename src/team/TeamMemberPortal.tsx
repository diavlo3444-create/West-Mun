import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldCheck, LockKeyhole, Loader2, ArrowLeft } from "lucide-react";

const teamMeta: Record<string, { title: string; route: string }> = {
  security: { title: "Security & Protocol", route: "/security" },
  media: { title: "Media & Press", route: "/media" },
  volunteers: { title: "Conference Volunteers", route: "/volunteer" },
};

export default function TeamMemberPortal() {
  const route = window.location.pathname.replace(/\/$/, "") || "/";
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [team, setTeam] = useState("");
  const [section, setSection] = useState<string | null>(null);
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
      if (!live) return;
      const validTeam = ["security", "media", "media_press", "volunteers", "volunteer"].includes(actualTeam);
      const normalizedTeam = actualTeam === "media_press" ? "media" : actualTeam === "volunteer" ? "volunteers" : actualTeam;
      if (!error && data.user && role === "team_member" && validTeam && (isTeamHub || normalizedTeam === requestedTeam)) {
        setAuthorized(true);
        setTeam(normalizedTeam);
        setSection(typeof meta?.wm_section === "string" ? meta.wm_section : null);
      } else {
        setAuthorized(false);
      }
      setLoading(false);
    };
    void check();
    return () => { live = false; };
  }, [requestedTeam, isTeamHub]);

  const info = teamMeta[team || requestedTeam] || teamMeta.volunteers;
  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-5">
          <a href="/" className="flex items-center gap-2 text-xs text-neutral-400 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> WEST MUN website</a>
          <div className="flex items-center gap-3">
            <a href="/pass" className="rounded-md border border-[#d4af37]/35 px-3 py-2 text-xs font-medium text-[#e6cc78] hover:bg-[#d4af37]/10">My QR Pass</a>
            {team === "security" && <a href="/scanner" className="rounded-md bg-[#d4af37] px-3 py-2 text-xs font-semibold text-black">Open Scanner</a>}
          </div>
        </header>
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /> Verifying team access…</div>
        ) : !authorized ? (
          <div className="mx-auto mt-20 max-w-md rounded-xl border border-rose-500/20 bg-[#101013] p-7 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-rose-300" />
            <h1 className="mt-4 font-serif text-2xl">Team access required</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">This page is only available to an account invited for this team. Sign up with your official one-time invitation link or contact your section head.</p>
            <a href="/login" className="mt-5 inline-flex rounded-md border border-[#d4af37]/30 px-4 py-2 text-xs text-[#e2c258] hover:bg-[#d4af37]/10">Sign in</a>
          </div>
        ) : (
          <>
            <div className="relative mt-8 overflow-hidden rounded-xl border border-[#d4af37]/20 bg-gradient-to-br from-[#17150f] to-[#0c0c0f] p-6 sm:p-9">
              <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#d4af37]/[0.07] blur-3xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 text-[#d4af37]"><ShieldCheck className="h-4 w-4" /><span className="font-mono text-[10px] uppercase tracking-[0.2em]">WEST MUN 2027</span></div>
                  <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Team Members</h1>
                  <p className="mt-2 text-sm text-neutral-400">{info.title}{section ? ` · ${section.charAt(0).toUpperCase() + section.slice(1)} Section` : ""}</p>
                </div>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">Access verified</span>
              </div>
            </div>

            <section className="relative mt-6 min-h-[340px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d10]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none blur-[5px] opacity-35">
                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
                  {[0,1,2].map((i) => <div key={i} className="h-28 rounded-lg border border-[#d4af37]/20 bg-gradient-to-br from-[#1c1a13] to-[#111114] p-4"><div className="h-2 w-20 rounded bg-[#d4af37]/30" /><div className="mt-4 h-2 w-full rounded bg-white/10" /><div className="mt-2 h-2 w-2/3 rounded bg-white/10" /></div>)}
                </div>
                <div className="mx-5 mt-2 h-36 rounded-lg border border-white/[0.07] bg-white/[0.025]" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-5">
                <div className="max-w-sm rounded-xl border border-[#d4af37]/25 bg-[#0a0a0b]/95 p-7 text-center shadow-2xl backdrop-blur-md">
                  <LockKeyhole className="mx-auto h-7 w-7 text-[#d4af37]" />
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">Team member access</p>
                  <h2 className="mt-2 font-serif text-2xl">Your team, your access</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">This is the dedicated Team Members area, separate from the Executive Board portal. Use your official QR pass for event access{team === "security" ? " and the Security scanner for authorized check-ins" : ""}.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <a href="/pass" className="rounded-md bg-[#d4af37] px-4 py-2.5 text-xs font-semibold text-black">Open my QR pass</a>
                    {team === "security" && <a href="/scanner" className="rounded-md border border-[#d4af37]/35 px-4 py-2.5 text-xs font-medium text-[#e6cc78]">Security scanner</a>}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
