import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Copy, Loader2, ShieldCheck, Link2 } from "lucide-react";

const roles = [
  ["executive", "Executive Board"],
  ["dcc", "DCC"],
  ["secretary", "Secretariat"],
  ["logistics", "Logistics"],
  ["designers", "Design"],
  ["media_and_press", "Media & Press"],
  ["marketing", "Marketing"],
  ["hr", "Human Resources"],
  ["pr", "Public Relations"],
  ["volunteers", "Volunteers"],
  ["ceremonies", "Ceremonies"],
  ["doc_department", "Documentation"],
  ["it", "IT"],
  ["security", "Security"],
];

export default function EbInviteAdminPage() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [section, setSection] = useState("");
  const [ebRole, setEbRole] = useState("executive");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    const check = async () => {
      if (!supabase) { if (live) { setNotice({ type: "error", text: "The WEST MUN sign-in service is unavailable." }); setChecking(false); } return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { window.location.replace("/login"); return; }
      const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (!live) return;
      setAllowed(Boolean(admin));
      if (!admin) setNotice({ type: "error", text: "Only a WEST MUN admin can create EB signup links." });
      setChecking(false);
    };
    void check();
    return () => { live = false; };
  }, []);

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setInviteUrl("");
    if (!supabase) return setNotice({ type: "error", text: "The WEST MUN sign-in service is unavailable." });
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("wm-eb-access", {
        body: { action: "create_invite", email: email.trim().toLowerCase(), department: department.trim(), section: section.trim(), ebRole },
      });
      if (error || !data?.success || !data.signupUrl) {
        let message = data?.error || error?.message || "Could not create the signup link.";
        try { const body = await (error as any)?.context?.json(); if (body?.error) message = body.error; } catch {}
        setNotice({ type: "error", text: message });
        return;
      }
      setInviteUrl(data.signupUrl);
      setExpiresAt(data.expiresAt || "");
      setNotice({ type: "success", text: `Private EB signup link created for ${data.email}. It expires in 7 days or when used/revoked.` });
    } catch {
      setNotice({ type: "error", text: "A connection error occurred. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try { await navigator.clipboard.writeText(inviteUrl); setNotice({ type: "success", text: "Signup link copied. Send it privately to the intended EB member." }); }
    catch { setNotice({ type: "error", text: "Copy was blocked by the browser. Select and copy the link manually." }); }
  };

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 flex items-center justify-between border-b border-[#d4af37]/20 pb-5">
          <a href="/admin" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin dashboard</a>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Private EB Invitations</span>
        </header>
        <section className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#17150f] to-[#0b0b0c] p-6 shadow-2xl sm:p-8">
          <ShieldCheck className="h-8 w-8 text-[#d4af37]" />
          <h1 className="mt-3 font-serif text-3xl text-white">Create an EB signup link</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">Assign the member's email, department, role, and section here. The member must enter their full real name and create a password. The assignment cannot be selected or changed by the recipient.</p>
          {checking ? <div className="mt-6 flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" /> Verifying admin access…</div> :
            !allowed ? <p role="alert" className="mt-5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{notice?.text || "Admin access required."}</p> :
            <form onSubmit={createInvite} className="mt-6 space-y-4">
              <div><label htmlFor="invite-email" className="mb-1.5 block text-xs font-medium text-neutral-300">EB member email</label><input id="invite-email" type="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70" placeholder="member@example.com" /></div>
              <div><label htmlFor="invite-department" className="mb-1.5 block text-xs font-medium text-neutral-300">Assigned department</label><input id="invite-department" required maxLength={80} value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70" placeholder="e.g. Logistics" /></div>
              <div><label htmlFor="invite-section" className="mb-1.5 block text-xs font-medium text-neutral-300">Assigned section</label><input id="invite-section" required maxLength={100} value={section} onChange={(e) => setSection(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70" placeholder="e.g. Male Security or DCC" /></div>
              <div><label htmlFor="invite-role" className="mb-1.5 block text-xs font-medium text-neutral-300">Assigned EB role</label><select id="invite-role" required value={ebRole} onChange={(e) => setEbRole(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]/70">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              {notice && <p role="status" className={`rounded-md border p-3 text-sm ${notice.type === "error" ? "border-rose-500/30 bg-rose-950/20 text-rose-200" : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"}`}>{notice.text}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#e5c158] to-[#aa8232] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}{busy ? "Creating private link…" : "Create private signup link"}</button>
            </form>
          }
          {inviteUrl && <div className="mt-6 rounded-lg border border-[#d4af37]/20 bg-black/30 p-4"><label htmlFor="invite-url" className="mb-2 block text-xs font-medium text-neutral-300">Private signup link</label><input id="invite-url" readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 text-xs text-white" /><button onClick={() => void copyInvite()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37]/35 px-4 py-3 text-sm text-[#e6cc78] hover:bg-[#d4af37]/10"><Copy className="h-4 w-4" /> Copy signup link</button><p className="mt-2 text-[11px] text-neutral-500">Expires: {expiresAt ? new Date(expiresAt).toLocaleString() : "7 days after creation"}. Creating another link for the same email revokes the previous unused link.</p></div>}
        </section>
      </div>
    </main>
  );
}
