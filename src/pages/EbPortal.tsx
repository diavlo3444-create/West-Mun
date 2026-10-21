import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Loader2, LockKeyhole, ShieldCheck, LogOut, QrCode } from "lucide-react";

export default function EbPortal() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; email: string; role: string; department: string; section: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const load = async () => {
      if (!supabase) { if (live) { setError("The WEST MUN sign-in service is unavailable."); setLoading(false); } return; }
      const { data, error: authError } = await supabase.auth.getUser();
      const user = data.user;
      if (authError || !user) { window.location.replace("/login"); return; }
      const meta = user.app_metadata as Record<string, unknown>;
      if (meta.wm_role !== "eb_member") {
        if (meta.wm_role === "team_member") {
          window.location.replace(meta.wm_team === "security" ? "/security" : meta.wm_team === "media" ? "/media" : "/volunteer");
        } else {
          const admin = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
          if (admin.data) window.location.replace("/admin");
          else window.location.replace("/head");
        }
        return;
      }
      if (!live) return;
      setProfile({
        name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
        email: user.email || "",
        role: typeof meta.wm_eb_role === "string" ? meta.wm_eb_role : "Executive Board",
        department: typeof meta.wm_team === "string" ? meta.wm_team : "",
        section: typeof meta.wm_section === "string" ? meta.wm_section : "",
      });
      setLoading(false);
    };
    void load();
    return () => { live = false; };
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    window.location.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-5">
          <a href="/" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> WEST MUN website</a>
          <div className="flex gap-2">
            <a href="/pass" className="flex items-center gap-2 rounded-md border border-[#d4af37]/35 px-3 py-2 text-xs font-medium text-[#e6cc78]"><QrCode className="h-4 w-4" /> My QR Pass</a>
            <button onClick={() => void signOut()} className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-neutral-300"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </header>
        <section className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#17150f] to-[#0b0b0c] p-6 shadow-2xl sm:p-9">
          {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /> Verifying your assignment…</div> :
            error ? <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{error}</p> :
            profile && <>
              <ShieldCheck className="h-8 w-8 text-[#d4af37]" />
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">WEST MUN 2027 · Executive Board</p>
              <h1 className="mt-2 font-serif text-3xl text-white">Welcome, {profile.name || "Executive Board member"}</h1>
              <p className="mt-2 text-sm text-neutral-400">{profile.email}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Assigned role</p><p className="mt-2 font-medium text-white">{profile.role}</p></div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Department</p><p className="mt-2 font-medium text-white">{profile.department}</p></div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Locked section</p><p className="mt-2 font-medium text-white">{profile.section}</p></div>
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 text-sm text-neutral-300">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" />
                <p>Your department, role, and section are assigned by the WEST MUN admin team. They are tied to your account and cannot be changed by editing the URL or signup form.</p>
              </div>
            </>
          }
        </section>
      </div>
    </main>
  );
}
