import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

type CheckedInPerson = {
  user_id: string;
  full_name: string;
  account_role: string;
  team: string | null;
  section: string | null;
  last_scanned_at: string | null;
};

export function CheckedInPeople() {
  const [people, setPeople] = useState<CheckedInPerson[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPeople = useCallback(async (quiet = false) => {
    if (!supabase) {
      setError("The WEST MUN sign-in service is unavailable.");
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("wm-qr-access", {
        body: { action: "checked_in" },
      });
      if (invokeError) {
        let detail = "";
        const context = (invokeError as unknown as { context?: Response }).context;
        if (context && typeof context.clone === "function") {
          try {
            const payload = await context.clone().json();
            detail = typeof payload?.error === "string" ? payload.error : "";
          } catch {}
        }
        throw new Error(detail || invokeError.message || "Could not load the check-in list.");
      }
      if (!data?.success) throw new Error(data?.error || "Could not load the check-in list.");
      setPeople(Array.isArray(data.people) ? data.people : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the check-in list.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPeople();
    const interval = window.setInterval(() => void loadPeople(true), 20000);
    return () => window.clearInterval(interval);
  }, [loadPeople]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return people;
    return people.filter((person) =>
      [person.full_name, person.team, person.section, person.account_role]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [people, search]);

  const formatTime = (value: string | null) => {
    if (!value) return "Time unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Time unavailable";
    return new Intl.DateTimeFormat("en-SA", {
      timeZone: "Asia/Riyadh",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <section className="rounded-2xl border border-[#d4af37]/20 bg-[#0d0d0f] p-4 text-neutral-100 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#d4af37]">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Venue attendance</span>
          </div>
          <h2 className="mt-2 font-serif text-2xl text-white">Currently checked in</h2>
          <p className="mt-1 text-sm text-neutral-400">Live list of people currently inside the venue.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3 py-2">
          <Users className="h-4 w-4 text-[#d4af37]" />
          <span className="text-sm font-semibold tabular-nums">{people.length}</span>
          <span className="text-xs text-neutral-400">inside</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, team, or section…"
            className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#d4af37]/50"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadPeople(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-neutral-200 transition hover:border-[#d4af37]/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/25 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-neutral-400">Loading check-ins…</p>
      ) : !error && filtered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
          <Users className="mx-auto h-7 w-7 text-neutral-600" />
          <p className="mt-3 text-sm font-medium text-neutral-200">{people.length === 0 ? "Nobody is checked in yet" : "No matching people"}</p>
          <p className="mt-1 text-xs text-neutral-500">{people.length === 0 ? "Approved entry scans will appear here automatically." : "Try another name, team, or section."}</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08]">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)] gap-3 border-b border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500 sm:grid">
            <span>Person</span><span>Team / section</span><span>Checked in at (Riyadh)</span>
          </div>
          <div className="divide-y divide-white/[0.07]">
            {filtered.map((person) => (
              <div key={person.user_id} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)] sm:items-center sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{person.full_name}</p>
                  <p className="mt-0.5 text-[11px] capitalize text-neutral-500">{person.account_role.replace(/_/g, " ")}</p>
                </div>
                <div className="text-xs text-neutral-300">{[person.team, person.section].filter(Boolean).join(" · ") || "—"}</div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400"><Clock3 className="h-3.5 w-3.5 shrink-0 text-[#d4af37]/70" />{formatTime(person.last_scanned_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-neutral-500">Automatically refreshes every 20 seconds. Only authorized Security accounts and admins can view this list.</p>
    </section>
  );
}
