import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Loader2, ShieldCheck, RefreshCw } from "lucide-react";

type PassData = {
  user_id: string;
  qr_token: string;
  full_name: string;
  email: string;
  account_role: string;
  team: string | null;
  section: string | null;
  active: boolean;
  inside: boolean;
  last_scanned_at: string | null;
};

export default function PassPage() {
  const [pass, setPass] = useState<PassData | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");

  const loadPass = async (providedName = fullNameInput) => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("The WEST MUN sign-in service is unavailable.");
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.replace("/login");
        return;
      }
      const { data, error: invokeError } = await supabase.functions.invoke("wm-qr-access", { body: { action: "pass", fullName: providedName.trim() } });
      if (invokeError) {
        let detail = "";
        const context = (invokeError as unknown as { context?: Response }).context;
        if (context && typeof context.clone === "function") {
          try { const payload = await context.clone().json(); detail = typeof payload?.error === "string" ? payload.error : ""; } catch {}
        }
        throw new Error(detail || data?.error || invokeError.message || "Could not load your QR pass.");
      }
      if (!data?.success || !data?.pass) throw new Error(data?.error || "Could not load your QR pass.");
      const current = data.pass as PassData;
      const image = await QRCode.toDataURL(current.qr_token, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#FFFFFF" },
      });
      setPass(current);
      setQrImage(image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your QR pass.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPass(); }, []);

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto max-w-lg">
        <header className="mb-7 flex items-center justify-between border-b border-[#d4af37]/20 pb-5">
          <a href={(() => {
            if (!pass) return "/eb";
            const role = (pass.account_role || "").toLowerCase().replace(/[ -]+/g, "_");
            if (role === "admin" || role === "super_admin") return "/admin";
            if (role === "head" || role === "department_head" || role === "co_head") return "/head";
            if (role === "team_member") {
              const team = (pass.team || "").toLowerCase();
              if (team.includes("security")) return "/security";
              if (team.includes("media")) return "/media";
              if (team.includes("volunteer")) return "/volunteer";
              return "/eb";
            }
            return "/eb";
          })()} className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</a>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Official QR Pass</span>
        </header>
        <section className="overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#17150f] to-[#0b0b0c] shadow-2xl">
          <div className="border-b border-[#d4af37]/20 px-6 py-5 text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#d4af37]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">WEST MUN 2027</p>
            <h1 className="mt-2 font-serif text-3xl text-white">Your official pass</h1>
            <p className="mt-2 text-sm text-neutral-400">Show this QR code to an authorized Security member at the venue.</p>
          </div>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" /> Preparing your pass…</div>
          ) : error ? (
            <div className="p-6">
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{error}</p>
              {error.toLowerCase().includes("full real name") && (
                <div className="mt-4">
                  <label htmlFor="pass-full-name" className="mb-2 block text-sm text-neutral-300">Your full real name</label>
                  <input id="pass-full-name" value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} autoComplete="name" placeholder="First and last name" className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#d4af37]" />
                  <p className="mt-2 text-xs text-neutral-500">This name will be saved to your WEST MUN account and printed on your official pass.</p>
                </div>
              )}
              <button onClick={() => void loadPass()} disabled={error.toLowerCase().includes("full real name") && fullNameInput.trim().split(/\s+/).filter(Boolean).length < 2} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className="h-4 w-4" /> {error.toLowerCase().includes("full real name") ? "Save name & issue pass" : "Try again"}</button>
            </div>
          ) : pass && (
            <>
              <div className="flex flex-col items-center px-6 py-7">
                <div className="rounded-xl bg-white p-3 shadow-xl"><img src={qrImage} alt="Your unique WEST MUN QR pass" className="h-64 w-64 max-w-full" /></div>
                <h2 className="mt-5 text-center font-serif text-2xl text-white">{pass.full_name}</h2>
                <p className="mt-1 text-sm text-[#d4af37]">{pass.account_role === "admin" ? "WEST MUN Administrator" : pass.account_role === "head" ? "Executive / Department Head" : pass.account_role === "team_member" ? "WEST MUN Team Member" : pass.account_role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</p>
                {(pass.team || pass.section) && <p className="mt-1 text-xs text-neutral-400">{[pass.team, pass.section].filter(Boolean).join(" · ")}</p>}
                <div className="mt-5 w-full rounded-lg border border-white/10 bg-black/25 p-3 text-center">
                  <p className="text-xs text-neutral-400">Entry status</p>
                  <p className={pass.inside ? "mt-1 text-sm font-semibold text-emerald-300" : "mt-1 text-sm font-semibold text-neutral-200"}>{pass.inside ? "Checked in" : "Not checked in"}</p>
                </div>
                <p className="mt-4 max-w-sm text-center text-[11px] leading-relaxed text-neutral-500">This pass is linked to your signed-in WEST MUN account. Do not share screenshots or copies with other people.</p>
              </div>
              <div className="border-t border-[#d4af37]/15 p-4">
                <button onClick={() => void loadPass()} className="flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37]/30 px-4 py-3 text-sm text-[#e6cc78] hover:bg-[#d4af37]/10"><RefreshCw className="h-4 w-4" /> Refresh pass status</button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
