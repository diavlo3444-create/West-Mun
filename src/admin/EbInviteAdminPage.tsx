import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Copy, Loader2, ShieldCheck, Link2, RefreshCw } from "lucide-react";

export default function EbInviteAdminPage() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    const check = async () => {
      if (!supabase) { if (live) { setNotice({ type: "error", text: "The WEST MUN sign-in service is unavailable." }); setChecking(false); } return; }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) { window.location.replace("/login"); return; }
      const { data: admin, error: adminError } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!live) return;
      setAllowed(Boolean(admin && !adminError));
      if (adminError) setNotice({ type: "error", text: "Could not verify admin permissions. Refresh and try again." });
      else if (!admin) setNotice({ type: "error", text: "Only a WEST MUN admin can create the EB signup link." });
      setChecking(false);
    };
    void check();
    return () => { live = false; };
  }, []);

  const createLink = async () => {
    setNotice(null);
    setInviteUrl("");
    if (!supabase) return setNotice({ type: "error", text: "The WEST MUN sign-in service is unavailable." });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("wm-eb-access", { body: { action: "create_signup_link" } });
      if (error || !data?.success || !data.signupUrl) {
        let message = data?.error || error?.message || "Could not create the signup link.";
        try { const body = await (error as any)?.context?.json(); if (body?.error) message = body.error; } catch {}
        setNotice({ type: "error", text: message });
        return;
      }
      setInviteUrl(data.signupUrl);
      setCreatedAt(data.createdAt || "");
      setNotice({ type: "success", text: "Reusable EB signup link created. Send this same link to every EB member. Creating a new link disables the previous one." });
    } catch {
      setNotice({ type: "error", text: "A connection error occurred. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try { await navigator.clipboard.writeText(inviteUrl); setNotice({ type: "success", text: "Signup link copied. Send it privately to your EB members." }); }
    catch { setNotice({ type: "error", text: "Copy was blocked by the browser. Select and copy the link manually." }); }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 flex items-center justify-between border-b border-[#d4af37]/20 pb-5">
          <a href="/admin" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin dashboard</a>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Private EB Signup</span>
        </header>
        <section className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#17150f] to-[#0b0b0c] p-6 shadow-2xl sm:p-8">
          <ShieldCheck className="h-8 w-8 text-[#d4af37]" />
          <h1 className="mt-3 font-serif text-3xl text-white">EB signup link</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">Generate one reusable link and send it to your Executive Board members. Each person enters their own name, email, unique phone number, gender, and role. They create their own password. There is no fixed limit on Co-Heads, Designers, or Marketing Team members.</p>
          {checking ? <div className="mt-6 flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" /> Verifying admin access…</div> :
            !allowed ? <p role="alert" className="mt-5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{notice?.text || "Admin access required."}</p> :
            <div className="mt-6 space-y-4">
              <button type="button" onClick={() => void createLink()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#e5c158] to-[#aa8232] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : inviteUrl ? <RefreshCw className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{busy ? "Generating link…" : inviteUrl ? "Generate new link (disable old one)" : "Generate reusable EB signup link"}</button>
              {notice && <p role="status" className={`rounded-md border p-3 text-sm ${notice.type === "error" ? "border-rose-500/30 bg-rose-950/20 text-rose-200" : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"}`}>{notice.text}</p>}
              {inviteUrl && <div className="rounded-lg border border-[#d4af37]/20 bg-black/30 p-4"><label htmlFor="invite-url" className="mb-2 block text-xs font-medium text-neutral-300">Reusable signup link</label><input id="invite-url" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-xs text-white" /><button type="button" onClick={() => void copyLink()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37]/35 px-4 py-3 text-sm text-[#e6cc78] hover:bg-[#d4af37]/10"><Copy className="h-4 w-4" /> Copy signup link</button><p className="mt-2 text-[11px] text-neutral-500">Created: {createdAt ? new Date(createdAt).toLocaleString() : "just now"}. This link remains active until you generate a new one.</p></div>}
            </div>
          }
        </section>
      </div>
    </main>
  );
}
