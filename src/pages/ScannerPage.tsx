import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { CheckedInPeople } from "../components/CheckedInPeople";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
      if (error) {
        let detail = "";
        const context = (error as unknown as { context?: Response }).context;
        if (context && typeof context.clone === "function") {
          try { const payload = await context.clone().json(); detail = typeof payload?.error === "string" ? payload.error : ""; } catch {}
        }
        if (!data) throw new Error(detail || error.message || "Could not verify this QR code.");
        setMessage({ ...(data as ScanReply), error: detail || (data as ScanReply).error });
        return;
      }
      setMessage((data ?? { success: false, outcome: "denied", error: "No response received from the scanner service." }) as ScanReply);
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
    let started = false;
    let instance: Html5Qrcode | null = null;
    const config = { fps: 12, qrbox: { width: 250, height: 250 }, aspectRatio: 1 };
    const onDecoded = (text: string) => { if (live) void handleDecoded(text); };
    const start = async () => {
      try {
        instance = new Html5Qrcode("westmun-qr-reader", { verbose: false });
        scannerRef.current = instance;
        // Start with the browser's native camera selector first. The explicit permission
        // request already ran from the user's click, so don't enumerate devices before startup.
        // If this selector is unsupported by a device, fall back to a concrete camera ID.
        try {
          await instance.start({ facingMode: "environment" }, config, onDecoded, () => {});
        } catch (facingModeError) {
          if (!live) return;
          const cameras = await Html5Qrcode.getCameras();
          if (!live) return;
          if (!cameras.length) throw new Error("No camera was found. Check that a webcam is connected and enabled in Windows.");
          const preferred = cameras.find((camera) => /back|rear|environment|world/i.test(camera.label) && camera.id) ?? cameras[0];
          try {
            await instance.start(preferred.id, config, onDecoded, () => {});
          } catch {
            throw facingModeError;
          }
        }
        started = true;
        if (!live) {
          await instance.stop().catch(() => {});
          started = false;
        }
      } catch (e) {
        if (live) {
          setScanning(false);
          const detail = e instanceof Error ? e.message : String(e);
          setMessage({ success: false, outcome: "denied", error: `Camera could not start: ${detail}. Check browser camera permission and use the HTTPS WEST MUN website.` });
        }
      }
    };
    void start();
    return () => {
      live = false;
      const active = instance;
      if (active && started) {
        void active.stop().catch(() => {}).finally(() => { try { active.clear(); } catch {} });
      } else if (active) {
        // If startup is still pending, its continuation will stop the camera once it resolves.
        try { active.clear(); } catch {}
      }
      if (scannerRef.current === active) scannerRef.current = null;
    };
  }, [scanning, allowed, handleDecoded]);

  // Request camera permission directly inside the button click. Starting permission
  // from an effect after an async device enumeration can lose browser user activation.
  const startCamera = async () => {
    setMessage(null);
    if (!window.isSecureContext) {
      setMessage({ success: false, outcome: "denied", error: "Camera access requires HTTPS. Open https://west-mun.vercel.app and try again." });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage({ success: false, outcome: "denied", error: "This browser does not provide camera access. Open WEST MUN in the latest Chrome or Edge." });
      return;
    }
    try {
      // This call runs directly from the user's click so the browser can show its prompt.
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      permissionStream.getTracks().forEach((track) => track.stop());
      setScanning(true);
    } catch (e) {
      const errorName = e instanceof DOMException ? e.name : "";
      let detail = e instanceof Error ? e.message : String(e);
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || errorName === "SecurityError") {
        detail = "Chrome/Edge is blocking camera access for this site, so it will not show a prompt. Click the site-controls icon beside the address bar → Site settings → Camera → Allow, then reload WEST MUN. Also check Windows Settings → Privacy & security → Camera and enable desktop-app camera access.";
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        detail = "No camera was found. Connect a webcam or use a phone with a working camera.";
      } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
        detail = "The camera may be in use by another app. Close Camera, Teams, Zoom, or other browser tabs using it, then try again.";
      }
      setMessage({ success: false, outcome: "denied", error: `Camera permission could not be obtained: ${detail}` });
    }
  };
  const scanQrImage = async (file?: File) => {
    if (!file || busy) return;
    setMessage(null);
    setBusy(true);
    try {
      // Image scanning works even when browser camera permission is blocked.
      const imageScanner = new Html5Qrcode("westmun-qr-reader", { verbose: false });
      const decoded = await imageScanner.scanFile(file, true);
      try { imageScanner.clear(); } catch {}
      await handleDecoded(decoded);
    } catch (e) {
      setMessage({ success: false, outcome: "denied", error: e instanceof Error ? `Could not read a QR code from that image: ${e.message}` : "Could not read a QR code from that image. Try a clearer screenshot or photo." });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
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
              <p className="mb-3 text-xs leading-relaxed text-neutral-400">When you click <span className="font-semibold text-neutral-200">Allow camera in Chrome</span>, Chrome may show its official camera permission popup. Choose <span className="font-semibold text-neutral-200">Allow</span> to start scanning. WEST MUN never receives camera access unless your browser grants it.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={startCamera} disabled={scanning || busy} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#e5c158] to-[#aa8232] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"><Camera className="h-4 w-4" /> {scanning ? "Camera active…" : "Allow camera in Chrome"}</button>
                <button onClick={() => setScanning(false)} disabled={!scanning} className="flex items-center justify-center gap-2 rounded-md border border-white/15 px-4 py-3 text-sm text-neutral-300 disabled:opacity-40"><CameraOff className="h-4 w-4" /> Stop</button>
              </div>
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-medium text-neutral-200">Camera not available?</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">Use a screenshot or photo of the person's WEST MUN QR pass. This fallback does not need camera permission.</p>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="mt-3 block w-full text-xs text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-[#d4af37] file:px-3 file:py-2 file:font-semibold file:text-black" disabled={busy} onChange={(event) => void scanQrImage(event.target.files?.[0])} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-500">To restore live scanning after a previous denial, the browser's camera permission must be changed back to Allow. A website cannot override a browser denial.</p>
              {busy && <p className="mt-4 flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="h-4 w-4 animate-spin" /> Verifying pass…</p>}
              {message && <div role="status" className={`mt-4 rounded-lg border p-4 ${statusClass}`}>
                <p className="font-semibold">{message.success ? (direction === "entry" ? "Entry approved" : "Exit recorded") : "Scan denied"}</p>
                {message.person?.fullName && <p className="mt-2 text-lg font-medium">{message.person.fullName}</p>}
                {message.person && <p className="mt-1 text-sm opacity-80">{[message.person.team, message.person.section].filter(Boolean).join(" · ")}</p>}
                {message.error && <p className="mt-2 text-sm">{message.error}</p>}
              </div>}
              <p className="mt-5 text-center text-[11px] leading-relaxed text-neutral-500">Only authorized Security accounts and WEST MUN admins can verify passes. Each entry and exit attempt is recorded.</p>
              <div className="mt-7 border-t border-[#d4af37]/15 pt-6"><CheckedInPeople /></div>
            </>
          }
        </section>
      </div>
    </main>
  );
}
