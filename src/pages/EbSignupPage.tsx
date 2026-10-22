import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Crown,
  Palette,
  Megaphone,
  CheckCircle2,
  Check,
  Search,
  Shield,
  Camera,
  HeartHandshake,
  Share2,
  Users2,
  Truck,
  Code2,
  Sparkles,
  Flame,
  User,
  Mail,
  Users,
  ChevronRight,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  InternationalPhoneInput,
  type PhoneValue,
} from "../components/InternationalPhoneInput";

type Notice = { type: "error" | "success"; text: string };

interface HeadRecord {
  user_id: string;
  head_name: string | null;
  department: string;
  section: string | null;
}

interface RoleOption {
  id: "co_head" | "designer" | "marketing";
  title: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  responsibilities: string[];
}

const ROLES: RoleOption[] = [
  {
    id: "co_head",
    title: "Department Co-Head",
    badge: "Executive Leadership",
    description: "Lead department operations, coordinate section teams, and report directly to your assigned department head.",
    icon: Crown,
    responsibilities: [
      "Operational leadership and shift management",
      "Coordination with active Department Head",
      "Committee and floor oversight during conference",
    ],
  },
  {
    id: "designer",
    title: "Design Team",
    badge: "Visual & Spatial Identity",
    description: "Craft official WEST MUN visual branding, committee placards, digital backdrops, badges, and publications.",
    icon: Palette,
    responsibilities: [
      "Summit branding and publication layouts",
      "Committee placards, passes, and signage",
      "Digital screen graphics and stage media",
    ],
  },
  {
    id: "marketing",
    title: "Marketing Team",
    badge: "Growth & Delegation Outreach",
    description: "Drive institutional delegation outreach, social media campaigns, delegate engagement, and summit visibility.",
    icon: Megaphone,
    responsibilities: [
      "School and university delegation outreach",
      "Digital campaigns and delegate recruitment",
      "Press releases and public announcements",
    ],
  },
];

const DEPT_ICONS: Record<string, LucideIcon> = {
  security: Shield,
  media_press: Camera,
  media: Camera,
  volunteers: HeartHandshake,
  volunteer: HeartHandshake,
  design: Palette,
  marketing: Megaphone,
  pr: Share2,
  hr: Users2,
  logistics: Truck,
  it: Code2,
  ceremonies: Sparkles,
  dcc: Flame,
};

function formatDepartmentTitle(raw: string): string {
  const norm = (raw || "").toLowerCase().replace(/_/g, " ");
  if (norm.includes("media")) return "Media & Press Corps";
  if (norm.includes("security")) return "Security & Protocol";
  if (norm.includes("volunteer")) return "Volunteers Directorate";
  if (norm.includes("design")) return "Design & Visual Identity";
  if (norm.includes("marketing")) return "Marketing & Outreach";
  if (norm.includes("logistics")) return "Logistics & Operations";
  if (norm.includes("ceremonies")) return "Opening & Ceremonies";
  if (norm.includes("dcc")) return "Crisis Center (DCC)";
  if (norm.includes("pr")) return "Public Relations";
  if (norm.includes("hr")) return "Human Resources";
  if (norm.includes("it")) return "IT & Tech Systems";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EbSignupPage() {
  const token = useMemo(
    () =>
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ||
      "",
    []
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneData, setPhoneData] = useState<PhoneValue>({
    countryCode: "SA",
    callingCode: "966",
    nationalNumber: "",
    fullNumber: "",
    digits: "",
    isValid: false,
  });
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [ebRole, setEbRole] = useState<"co_head" | "designer" | "marketing" | "">("");
  const [department, setDepartment] = useState("");
  const [heads, setHeads] = useState<HeadRecord[]>([]);
  const [headsLoading, setHeadsLoading] = useState(false);
  const [headSearch, setHeadSearch] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!token || !supabase) return;
    let active = true;
    setHeadsLoading(true);
    supabase.functions
      .invoke("wm-eb-access", { body: { action: "list_active_heads" } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.success) {
          setNotice({
            type: "error",
            text: data?.error || error?.message || "Could not load active heads.",
          });
        } else {
          setHeads(data.heads || []);
        }
      })
      .catch(() => {
        if (active) {
          setNotice({
            type: "error",
            text: "Could not load active heads. Refresh and try again.",
          });
        }
      })
      .finally(() => {
        if (active) setHeadsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  // When changing roles, clear department so stale selection is never sent
  const handleRoleSelect = (roleId: "co_head" | "designer" | "marketing") => {
    setEbRole(roleId);
    if (roleId !== "co_head") {
      setDepartment("");
    }
  };

  // Filter heads for search in Co-Head view
  const filteredHeads = useMemo(() => {
    const q = headSearch.trim().toLowerCase();
    if (!q) return heads;
    return heads.filter((h) => {
      const nameMatch = (h.head_name || "").toLowerCase().includes(q);
      const deptMatch = (h.department || "").toLowerCase().includes(q);
      const sectionMatch = (h.section || "").toLowerCase().includes(q);
      return nameMatch || deptMatch || sectionMatch;
    });
  }, [heads, headSearch]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!supabase) {
      return setNotice({
        type: "error",
        text: "The WEST MUN sign-in service is unavailable.",
      });
    }
    if (!token) {
      return setNotice({
        type: "error",
        text: "This EB signup link is missing its token. Ask an admin for the current link.",
      });
    }

    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    if (
      normalizedName.length < 5 ||
      normalizedName.split(" ").filter(Boolean).length < 2
    ) {
      return setNotice({
        type: "error",
        text: "Enter your full name, including first and last name.",
      });
    }

    // Phone validation
    const digits = phoneData.digits.replace(/[^0-9]/g, "");
    if (!phoneData.nationalNumber.trim()) {
      return setNotice({
        type: "error",
        text: "Please enter your phone number.",
      });
    }
    if (!phoneData.isValid || digits.length < 7 || digits.length > 15) {
      return setNotice({
        type: "error",
        text: `Please enter a valid phone number for ${phoneData.countryCode} (7–15 digits with international calling code).`,
      });
    }

    if (!gender || !["male", "female"].includes(gender)) {
      return setNotice({
        type: "error",
        text: "Please choose your gender.",
      });
    }

    if (!ebRole || !["co_head", "designer", "marketing"].includes(ebRole)) {
      return setNotice({
        type: "error",
        text: "Please choose your Executive Board role.",
      });
    }

    if (ebRole === "co_head" && !department) {
      return setNotice({
        type: "error",
        text: "Please select the active department head you will report to.",
      });
    }

    if (password.length < 12) {
      return setNotice({
        type: "error",
        text: "Use a password with at least 12 characters.",
      });
    }
    if (password !== confirmPassword) {
      return setNotice({
        type: "error",
        text: "The passwords do not match.",
      });
    }

    setBusy(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke("wm-eb-access", {
        body: {
          action: "signup_public",
          token,
          fullName: normalizedName,
          email: normalizedEmail,
          phone: digits,
          gender,
          ebRole,
          reportingHeadId: ebRole === "co_head" ? department : "",
          password,
        },
      });

      if (error || !data?.success) {
        let message =
          data?.error || error?.message || "Could not create your EB account.";
        try {
          const body = await (error as any)?.context?.json();
          if (body?.error) message = body.error;
        } catch {}
        setNotice({ type: "error", text: message });
        return;
      }

      const signedIn = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signedIn.error) {
        setNotice({
          type: "success",
          text: "Your account was created! Sign in with your email and password to access the EB portal.",
        });
        return;
      }

      window.location.replace("/eb");
    } catch {
      setNotice({
        type: "error",
        text: "A connection error occurred. Try again or ask a WEST MUN admin for help.",
      });
    } finally {
      setBusy(false);
    }
  };

  const inputFieldClass =
    "w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-[#d4af37]/70 disabled:opacity-50";
  const labelClass = "mb-1.5 block text-xs font-medium text-neutral-300";

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-12 text-[#f5f5f5] selection:bg-[#d4af37]/30 selection:text-white">
      <div className="mx-auto flex min-h-[75vh] max-w-2xl items-center">
        <section className="w-full rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#15140f] via-[#0d0d10] to-[#08080a] p-6 shadow-2xl sm:p-9">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e2c258] shadow-[0_0_16px_rgba(212,175,55,0.15)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">
              WEST MUN 2027
            </span>
          </div>

          <h1 className="font-serif text-3xl font-normal tracking-wide text-white sm:text-4xl">
            Join the Executive Board
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
            Complete your credentials to create your official EB account and digital QR accreditation.
            Each phone number and email can only be registered once.
          </p>

          {!token && (
            <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-sm text-amber-200">
              Signup token is missing or expired. Request a new invite link from an authorized WEST MUN administrator.
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-6">
            {/* Personal Information Group */}
            <div className="space-y-4">
              <h2 className="border-b border-white/[0.08] pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                1. Personal Details
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="eb-full-name" className={labelClass}>
                    Full Name <span className="text-[#d4af37]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="eb-full-name"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={5}
                      maxLength={120}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={busy || !token}
                      className={inputFieldClass}
                      placeholder="First and last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="eb-email" className={labelClass}>
                    Email Address <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    id="eb-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={120}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy || !token}
                    className={inputFieldClass}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* International Phone Selector */}
              <div>
                <InternationalPhoneInput
                  id="eb-phone"
                  initialCountry="SA"
                  label="Phone Number"
                  required
                  disabled={busy || !token}
                  onChange={(val) => setPhoneData(val)}
                  hint="Select country code (+966 default) and enter your number. Formatted and validated automatically."
                />
              </div>

              {/* Gender Selector as Sleek Segmented Buttons */}
              <div>
                <label className={labelClass}>
                  Gender <span className="text-[#d4af37]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      disabled={busy || !token}
                      onClick={() => setGender(g)}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-4 text-xs font-medium capitalize transition-all ${
                        gender === g
                          ? "border-[#d4af37] bg-gradient-to-r from-[#d4af37]/20 to-[#d4af37]/10 text-white shadow-[0_0_12px_rgba(212,175,55,0.15)] font-semibold"
                          : "border-white/10 bg-black/40 text-neutral-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      {g} Section
                      {gender === g && <Check className="ml-1 h-3.5 w-3.5 text-[#d4af37]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Role Selection Group */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                  2. Executive Board Role
                </h2>
                <span className="text-[11px] text-neutral-400">Choose your assigned designation</span>
              </div>

              {/* Attractive Role Cards */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = ebRole === role.id;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={busy || !token}
                      onClick={() => handleRoleSelect(role.id)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 focus:outline-none ${
                        isSelected
                          ? "border-[#d4af37] bg-gradient-to-b from-[#d4af37]/15 via-[#d4af37]/[0.06] to-transparent shadow-[0_0_20px_rgba(212,175,55,0.18)] translate-y-[-2px]"
                          : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/[0.03] hover:translate-y-[-1px]"
                      }`}
                    >
                      {/* Top indicator & icon */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                              isSelected
                                ? "border-[#d4af37] bg-[#d4af37]/20 text-[#f5d47a] shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                                : "border-white/10 bg-white/[0.04] text-neutral-400 group-hover:border-white/20 group-hover:text-white"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          {isSelected ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d4af37] text-black">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-white/20 group-hover:border-white/40" />
                          )}
                        </div>

                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4af37]">
                          {role.badge}
                        </span>
                        <h3 className="mt-0.5 text-sm font-semibold text-white">
                          {role.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                          {role.description}
                        </p>
                      </div>

                      {/* Responsibilities list snippet */}
                      <div className="mt-3.5 border-t border-white/[0.06] pt-2.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                          Key focus
                        </span>
                        <p className="mt-0.5 truncate text-[11px] text-neutral-300">
                          {role.responsibilities[0]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dedicated Head Role Experience */}
            {ebRole === "co_head" && (
              <div className="rounded-xl border border-[#d4af37]/40 bg-gradient-to-b from-[#1a170e] to-[#0f0e0b] p-4.5 sm:p-5 shadow-[0_0_24px_rgba(212,175,55,0.08)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/15 text-[#e5c158]">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4af37]">
                      Department Leadership Alignment
                    </span>
                    <h3 className="text-base font-semibold text-white">
                      Department Head Assignment
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                      As a Co-Head, you report directly to an active Department Head. Select the department and head who will supervise your role during WEST MUN 2027.
                    </p>
                  </div>
                </div>

                {/* Head Search & Selectable Cards */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-neutral-200">
                      Select Your Reporting Head <span className="text-[#d4af37]">*</span>
                    </label>
                    {heads.length > 3 && (
                      <div className="relative w-48">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={headSearch}
                          onChange={(e) => setHeadSearch(e.target.value)}
                          placeholder="Filter department…"
                          className="w-full rounded-md border border-white/10 bg-black/60 pl-7 pr-2 py-1 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d4af37]/60"
                        />
                      </div>
                    )}
                  </div>

                  {headsLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/40 py-8 text-xs text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                      Loading active department heads…
                    </div>
                  ) : filteredHeads.length === 0 ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-4 text-center text-xs text-amber-200">
                      {headSearch
                        ? `No department head matches "${headSearch}".`
                        : "No active department heads found. Contact an administrator to ensure heads are configured."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1">
                      {filteredHeads.map((h) => {
                        const Icon = DEPT_ICONS[h.department] || Users;
                        const isSelected = department === h.user_id;
                        const formattedTitle = formatDepartmentTitle(h.department);

                        return (
                          <button
                            key={h.user_id}
                            type="button"
                            disabled={busy || !token}
                            onClick={() => setDepartment(h.user_id)}
                            className={`group flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                              isSelected
                                ? "border-[#d4af37] bg-gradient-to-r from-[#d4af37]/25 to-[#d4af37]/10 shadow-[0_0_12px_rgba(212,175,55,0.18)]"
                                : "border-white/10 bg-black/50 hover:border-white/25 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                                isSelected
                                  ? "border-[#d4af37] bg-[#d4af37]/30 text-white"
                                  : "border-white/10 bg-white/[0.03] text-neutral-400 group-hover:text-white"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="truncate text-xs font-semibold text-white">
                                  {h.head_name || formattedTitle}
                                </h4>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-neutral-300">
                                {formattedTitle}
                              </p>
                              {h.section && (
                                <span className="mt-1 inline-block rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-neutral-300">
                                  {h.section} section
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-1">
                    <Info className="h-3 w-3 text-[#d4af37] shrink-0" />
                    <span>Multiple Co-Heads can be assigned under the same Department Head.</span>
                  </p>
                </div>
              </div>
            )}

            {/* Security & Password Group */}
            <div className="space-y-4 pt-2">
              <h2 className="border-b border-white/[0.08] pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                3. Security Credentials
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="eb-password" className={labelClass}>
                    Create Password <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    id="eb-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy || !token}
                    className={inputFieldClass}
                    placeholder="At least 12 characters"
                  />
                  <p className="mt-1 text-[10px] text-neutral-500">Minimum 12 characters required</p>
                </div>

                <div>
                  <label htmlFor="eb-confirm-password" className={labelClass}>
                    Confirm Password <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    id="eb-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={busy || !token}
                    className={inputFieldClass}
                    placeholder="Re-enter password"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-[10px] text-rose-400">Passwords do not match</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications */}
            {notice && (
              <div
                role="status"
                className={`rounded-lg border p-3.5 text-xs leading-relaxed ${
                  notice.type === "error"
                    ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                    : "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                }`}
              >
                {notice.text}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy || !token}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] px-6 py-3.5 text-sm font-semibold tracking-wide text-black transition-all hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_24px_rgba(212,175,55,0.2)]"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating EB Account…
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  Create Executive Board Account
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Already registered?{" "}
            <a
              href="/login"
              className="font-medium text-[#d4af37] underline underline-offset-4 hover:text-[#f3dd88]"
            >
              Sign in to your portal
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
