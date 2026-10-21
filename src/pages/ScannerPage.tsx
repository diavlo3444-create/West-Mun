import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Camera, CameraOff, Loader2, ShieldCheck } from "lucide-react";

type ScanReply = { success?: boolean; outcome?: string; error?: string; direction?: string; person?: { fullName?: string; team?: string | null; section?: string | null; role?: string } };

export default function ScannerPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [direction, setDirection] = useState<"entry" | "exit">("entry");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<ScanReply | null>(null);
  const [accessError, setAccessError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanBusyRef = useRef(false);

  const handleDecoded = useCallback(async (decodedText: string) => {
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    setScanning(false);
    setBusy(true);
    setMessage(null);
    try {
      let token = decodedText.trim();
      try {
        const parsed = JSON.parse(token);
        if (parsed && typeof parsed.token === "string") token = parsed.token;
        else if (parsed && typeof parsed.qrToken === "string") token = parsed.qrToken;
      } catch {}
      if (!supabase) throw new Error("The WEST MUN sign-in service is unavailable.");
      const { data, error } = await supabase.functions.invoke("wm-qr-access", { body: { action: "scan", qrToken: token, direction } });
      if (error && !data) throw new Error(error.message || "Could not verify this QR code.");
      setMessage((data ?? { success: false, outcome: "denied", error: error?.message }) as ScanReply);
    } catch (e) {
      setMessage({ success: false, outcome: "denied", error: e instanceof Error ? e.message : "Could not verify this QR code." });
    } finally {
      setBusy(false);
      scanBusyRef.current = false;
    }
  }, [direction]);

  useEffect(() => {
    let live = true;
    const check = async () => {
      if (!supabase) { if (live) { setAccessError("The WEST MUN sign-in service is unavailable."); setLoading(false); } return; }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { window.location.replace("/login"); return; }
      const { data, error } = await supabase.functions.invoke("wm-qr-access", { body: { action: "access" } });
      if (!live) return;
      if (error || !data?.success) setAccessError(data?.error || error?.message || "Could not verify scanner permissions.");
      else if (data.canScan) setAllowed(true);
      else setAccessError("Scanner access is restricted to authorized Security members and WEST MUN admins.");
      setLoading(false);
    };
    void check();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!scanning || !allowed) return;
    let live = true;
    let instance: Html5Qrcode | null = null;
    const start = async () => {
      try {
        instance = new Html5Qrcode("westmun-qr-reader");
        scannerRef.current = instance;
        await instance.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 }, (text) => { if (live) void handleDecoded(text); }, () => {});
      } catch {
        if (live) {
          setScanning(false);
          setMessage({ success: false, outcome: "denied", error: "Camera could not start. Allow camera access and use HTTPS, or try another device." });
        }
      }
    };
    void start();
    return () => {
      live = false;
      const active = instance;
      if (active) {
        void active.stop().catch(() => {}).finally(() => { try { active.clear(); } catch {} });
      }
      scannerRef.current = null;
    };
  }, [scanning, allowed, handleDecoded]);

  const startCamera = () => { setMessage(null); setScanning(true); };
  const statusClass = message?.success ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200" : "border-rose-500/30 bg-rose-950/20 text-rose-200";

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-[#f5f5f5]">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 flex items-center justify-between border-b border-[#d4af37]/20 pb-5">
          <a href="/" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> WEST MUN</a>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Authorized Scanner</span>
        </header>
        <section className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#17150f] to-[#0b0b0c] p-5 shadow-2xl sm:p-7">
          <div className="mb-5 flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-[#d4af37]" /><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">WEST MUN 2027</p><h1 className="font-serif text-3xl text-white">Venue QR scanner</h1></div></div>
          {loading ? <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" /> Verifying scanner permissions…</div> :
            accessError ? <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">{accessError}</p> :
            <>
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/30 p-1">
                <button onClick={() => setDirection("entry")} className={direction === "entry" ? "rounded-md bg-[#d4af37] px-3 py-2 text-sm font-semibold text-black" : "rounded-md px-3 py-2 text-sm text-neutral-400"}>Check in</button>
                <button onClick={() => setDirection("exit")} className={direction === "exit" ? "rounded-md bg-[#d4af37] px-3 py-2 text-sm font-semibold text-black" : "rounded-md px-3 py-2 text-sm text-neutral-400"}>Check out</button>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black p-2"><div id="westmun-qr-reader" className="min-h-16 w-full" /></div>
              <div className="mt-4 flex gap-2">
                <button onClick={startCamera} disabled={scanning || busy} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#e5c158] to-[#aa8232] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"><Camera className="h-4 w-4" /> {scanning ? "Camera active…" : "Start camera"}</button>
                <button onClick={() => setScanning(false)} disabled={!scanning} className="flex items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-3 text-sm text-neutral-300 disabled:opacity-40"><CameraOff className="h-4 w-4" /> Stop</button>
              </div>
              {busy && <p className="mt-4 flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" /> Verifying pass…</p>}
              {message && <div role="status" className={`mt-4 rounded-lg border p-4 ${statusClass}`}>
                <p className="font-semibold">{message.success ? (direction === "entry" ? "Entry approved" : "Exit recorded") : "Scan denied"}</p>
                {message.person?.fullName && <p className="mt-2 text-lg font-medium">{message.person.fullName}</p>}
                {message.person && <p className="mt-1 text-sm opacity-80">{[message.person.team, message.person.section].filter(Boolean).join(" · ")}</p>}
                {message.error && <p className="mt-2 text-sm">{message.error}</p>}
              </div>}
              <p className="mt-5 text-center text-[11px] leading-relaxed text-neutral-500">Only authorized Security accounts and WEST MUN admins can verify passes. Each entry and exit attempt is recorded.</p>
            </>
          }
        </section>
      </div>
    </main>
  );
}
