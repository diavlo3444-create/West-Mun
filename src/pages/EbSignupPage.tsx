import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function EbSignupPage() {
  const token = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "", []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (!supabase) return setNotice({ type: "error", text: "The WEST MUN sign-in service is unavailable." });
    if (!token) return setNotice({ type: "error", text: "This private EB signup link is missing its token. Ask an admin for a new link." });
    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    if (normalizedName.length < 5 || normalizedName.split(" ").filter(Boolean).length < 2) {
      return setNotice({ type: "error", text: "Enter your full real name, including at least your first and last name." });
    }
    if (password.length < 12) return setNotice({ type: "error", text: "Use a password with at least 12 characters." });
    if (password !== confirmPassword) return setNotice({ type: "error", text: "The passwords do not match." });

    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke("wm-eb-access", {
        body: { action: "signup", token, fullName: normalizedName, email: normalizedEmail, password },
      });
      if (error || !data?.success) {
        let message = data?.error || error?.message || "Could not create your EB account.";
        try { const body = await (error as any)?.context?.json(); if (body?.error) message = body.error; } catch {}
        setNotice({ type: "error", text: message });
        return;
      }
      const signedIn = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signedIn.error) {
        setNotice({ type: "success", text: "Your account was created. Sign in with the same email and password to continue." });
        return;
      }
      window.location.replace("/eb");
    } catch {
      setNotice({ type: "error", text: "A connection error occurred. Try again or ask a WEST MUN admin for help." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-12 text-[#f5f5f5]">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <section className="w-full rounded-xl border border-[#d4af37]/25 bg-gradient-to-b from-[#15140f] to-[#0c0c0f] p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e2c258]"><ShieldCheck className="h-6 w-6" /></div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">WEST MUN 2027 · Executive Board</p>
          <h1 className="mt-2 font-serif text-3xl text-white">Create your EB account</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">Use the email address this private invitation was sent to. Your department, role, and section are assigned by an admin and cannot be changed here.</p>
          {!token && <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">Invitation token missing. Ask an admin for a new signup link.</div>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="eb-full-name" className="mb-1.5 block text-xs font-medium text-neutral-300">Full real name</label>
              <input id="eb-full-name" type="text" autoComplete="name" required minLength={5} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy || !token} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70 disabled:opacity-50" placeholder="First and last name" />
              <p className="mt-1 text-[11px] text-neutral-500">Enter your full legal name. This name appears on your official QR pass.</p>
            </div>
            <div>
              <label htmlFor="eb-email" className="mb-1.5 block text-xs font-medium text-neutral-300">Invitation email</label>
              <input id="eb-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy || !token} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70 disabled:opacity-50" placeholder="The email this link was issued to" />
            </div>
            <div>
              <label htmlFor="eb-password" className="mb-1.5 block text-xs font-medium text-neutral-300">Create password</label>
              <input id="eb-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy || !token} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70 disabled:opacity-50" placeholder="At least 12 characters" />
            </div>
            <div>
              <label htmlFor="eb-confirm-password" className="mb-1.5 block text-xs font-medium text-neutral-300">Confirm password</label>
              <input id="eb-confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={busy || !token} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70 disabled:opacity-50" placeholder="Re-enter your password" />
            </div>
            {notice && <div role="status" className={`rounded-md border p-3 text-sm ${notice.type === "error" ? "border-rose-500/30 bg-rose-950/20 text-rose-200" : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"}`}>{notice.text}</div>}
            <button type="submit" disabled={busy || !token} className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {busy ? "Creating account…" : "Create EB account"}
            </button>
          </form>
          <p className="mt-5 text-center text-[11px] text-neutral-400">Already have an account? <a href="/login" className="text-[#d4af37] underline underline-offset-4">Sign in</a></p>
        </section>
      </div>
    </main>
  );
}
