import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    if (!supabase) return setErrorMessage("The sign-in service is temporarily unavailable.");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) {
        setErrorMessage("Email or password is incorrect. If you have not created a team account, use your one-time signup link.");
        return;
      }
      const meta = data.user.app_metadata as Record<string, unknown>;
      if (meta?.wm_role === "eb_member") {
        window.location.replace("/eb");
        return;
      }
      if (meta?.wm_role === "team_member") {
        const team = meta.wm_team;
        window.location.replace(team === "security" ? "/security" : team === "media" ? "/media" : team === "volunteers" ? "/volunteer" : "/");
        return;
      }
      const admin = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (admin.data) { window.location.replace("/admin"); return; }
      const head = await supabase.from("department_heads").select("user_id").eq("user_id", data.user.id).eq("active", true).limit(1).maybeSingle();
      if (head.data) { window.location.replace("/head"); return; }
      await supabase.auth.signOut();
      setErrorMessage("This account has no active WEST MUN team assignment. Contact the Secretariat.");
    } catch {
      setErrorMessage("Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-12 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <section className="w-full rounded-xl border border-[#d4af37]/25 bg-gradient-to-b from-[#15140f] to-[#0c0c0f] p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e2c258]"><ShieldCheck className="h-6 w-6" /></div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">WEST MUN 2027</p>
          <h1 className="mt-2 font-serif text-3xl text-white">Team sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">Sign in to continue to your assigned WEST MUN workspace.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-neutral-300">Email address</label>
              <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70 disabled:opacity-50" />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-neutral-300">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70 disabled:opacity-50" />
            </div>
            {errorMessage && <p role="alert" className="rounded-md border border-rose-500/30 bg-rose-950/20 p-3 text-sm text-rose-200">{errorMessage}</p>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center text-[11px] text-neutral-500">No account yet? Ask your section head for a private signup link.</p>
        </section>
      </div>
    </main>
  );
}
