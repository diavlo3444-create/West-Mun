import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Users,
  Clock,
  MapPin,
  Calendar,
  Search,
  Shield,
  UserCheck,
  AlertCircle,
  Loader2,
  FileText,
  Briefcase,
  ChevronRight,
  Save,
  Send,
  Layers,
  Sparkles,
  Trash2,
  Info,
  FolderPlus,
  CheckCheck,
} from 'lucide-react';
import type { DepartmentKey, SectionKey } from '../departments';
import {
  createDepartmentShift,
  batchAssignShiftPeople,
  listDepartmentRosterCandidates,
  listDepartmentGroups,
  type ShiftCandidate,
  type WmShift,
  type ShiftStatus,
  type WmTeamGroup,
  type WmTeamGroupMember,
} from '../services/operationsStore';
import { ShiftDatePicker, formatDateReadable } from './ShiftDatePicker';
import { ShiftTimePicker, formatTime12h, calculateShiftDuration } from './ShiftTimePicker';

interface ShiftCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
  initialDate?: string;
  initialGroup?: WmTeamGroup | null;
  onSuccess: (newShift: WmShift) => void;
}

interface AssignedPersonConfig {
  candidate: ShiftCandidate;
  responsibility: string;
  station: string;
  notes: string;
  is_supervisor: boolean;
  sourceGroupNames: string[];
  isIndividuallySelected: boolean;
}

type AssignCategoryTab = 'co_heads' | 'team_members' | 'custom_groups' | 'assigned_roster';

export const ShiftCreationModal: React.FC<ShiftCreationModalProps> = ({
  isOpen,
  onClose,
  department,
  section,
  testToken,
  initialDate,
  initialGroup,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form Data
  const [title, setTitle] = useState('');
  const [shiftDate, setShiftDate] = useState(() => {
    if (initialDate) return initialDate;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number>(4);

  // Step 2 Assignment Data
  const [coHeadsList, setCoHeadsList] = useState<ShiftCandidate[]>([]);
  const [teamMembersList, setTeamMembersList] = useState<ShiftCandidate[]>([]);
  const [customGroupsList, setCustomGroupsList] = useState<WmTeamGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  // Assigned personnel map: key = candidate email (lowercase) or candidate id
  const [assignedMap, setAssignedMap] = useState<Map<string, AssignedPersonConfig>>(new Map());

  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [searchCandidates, setSearchCandidates] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<AssignCategoryTab>('custom_groups');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Helper to derive stable deduplication key
  const getCandidateKey = useCallback((candidate: { id: string; email?: string | null }) => {
    return candidate.email && candidate.email.trim()
      ? candidate.email.trim().toLowerCase()
      : candidate.id;
  }, []);

  // Update date if initialDate changes
  useEffect(() => {
    if (initialDate) {
      setShiftDate(initialDate);
    }
  }, [initialDate]);

  // Load roster candidates and custom groups when modal opens
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFormError('');
      setSelectedGroupIds(new Set());
      setAssignedMap(new Map());
      return;
    }

    let isMounted = true;
    setCandidatesLoading(true);
    setGroupsLoading(true);

    // 1. Fetch Candidates (Co-Heads & Team Members)
    void listDepartmentRosterCandidates(department, section, testToken)
      .then((res) => {
        if (!isMounted) return;
        if (res.ok && res.data) {
          setCoHeadsList(res.data.coHeads);
          setTeamMembersList(res.data.teamMembers);
        }
      })
      .finally(() => {
        if (isMounted) setCandidatesLoading(false);
      });

    // 2. Fetch Custom Groups
    void listDepartmentGroups(department, section, testToken)
      .then((res) => {
        if (!isMounted) return;
        if (res.ok && res.data) {
          setCustomGroupsList(res.data);

          // If initialGroup was provided, preselect it immediately
          if (initialGroup) {
            const foundGroup = res.data.find((g) => g.id === initialGroup.id) || initialGroup;
            setSelectedGroupIds(new Set([foundGroup.id]));

            // Expand members into assigned map
            const members = foundGroup.members || [];
            if (members.length > 0) {
              setAssignedMap((prev) => {
                const next = new Map(prev);
                members.forEach((m) => {
                  const mEmail = m.member_email.trim().toLowerCase();
                  const fakeCandidate: ShiftCandidate = {
                    id: m.member_id || m.person_id || `grp-mem-${m.id}`,
                    type: 'team_member',
                    name: m.member_name,
                    email: m.member_email,
                    roleTitle: m.role_title || 'Team Member',
                    status: 'active',
                    sourceId: m.id,
                    personId: m.person_id || null,
                    memberId: m.member_id || null,
                  };
                  const key = mEmail || fakeCandidate.id;
                  next.set(key, {
                    candidate: fakeCandidate,
                    responsibility: '',
                    station: location || '',
                    notes: '',
                    is_supervisor: false,
                    sourceGroupNames: [foundGroup.name],
                    isIndividuallySelected: false,
                  });
                });
                return next;
              });
            }
          }
        }
      })
      .finally(() => {
        if (isMounted) setGroupsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, department, section, testToken, initialGroup, location]);

  // Duration
  const duration = calculateShiftDuration(startTime, endTime);

  // Filter candidates by search
  const filteredCoHeads = useMemo(() => {
    if (!searchCandidates.trim()) return coHeadsList;
    const q = searchCandidates.toLowerCase();
    return coHeadsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.roleTitle.toLowerCase().includes(q)
    );
  }, [coHeadsList, searchCandidates]);

  const filteredTeamMembers = useMemo(() => {
    if (!searchCandidates.trim()) return teamMembersList;
    const q = searchCandidates.toLowerCase();
    return teamMembersList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.roleTitle.toLowerCase().includes(q)
    );
  }, [teamMembersList, searchCandidates]);

  const filteredCustomGroups = useMemo(() => {
    if (!searchCandidates.trim()) return customGroupsList;
    const q = searchCandidates.toLowerCase();
    return customGroupsList.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q)
    );
  }, [customGroupsList, searchCandidates]);

  // Assignment counters & live summary stats
  const assignedList = useMemo(() => Array.from(assignedMap.values()), [assignedMap]);

  const assignedCoHeadsCount = useMemo(
    () => assignedList.filter((a) => a.candidate.type === 'co_head').length,
    [assignedList]
  );

  const assignedIndividualMembersCount = useMemo(
    () =>
      assignedList.filter(
        (a) => a.candidate.type === 'team_member' && a.isIndividuallySelected
      ).length,
    [assignedList]
  );

  const selectedGroupsCount = selectedGroupIds.size;
  const totalAssignedCount = assignedList.length;

  // Toggle selection of a custom group (Bulk assign with deduplication)
  const toggleGroupSelection = (group: WmTeamGroup) => {
    const isSelected = selectedGroupIds.has(group.id);
    const nextGroupIds = new Set(selectedGroupIds);

    if (isSelected) {
      nextGroupIds.delete(group.id);
      setSelectedGroupIds(nextGroupIds);

      // Remove this group's association from assigned candidates
      setAssignedMap((prev) => {
        const next = new Map(prev);
        const members = group.members || [];
        const memberEmails = new Set(members.map((m) => m.member_email.trim().toLowerCase()));

        for (const [key, val] of next.entries()) {
          const cKey = getCandidateKey(val.candidate);
          if (memberEmails.has(cKey)) {
            const updatedGroups = val.sourceGroupNames.filter((name) => name !== group.name);
            if (updatedGroups.length === 0 && !val.isIndividuallySelected) {
              // Not individually selected and not in any other group -> remove from shift
              next.delete(key);
            } else {
              next.set(key, { ...val, sourceGroupNames: updatedGroups });
            }
          }
        }
        return next;
      });
    } else {
      nextGroupIds.add(group.id);
      setSelectedGroupIds(nextGroupIds);

      // Expand group members into assignedMap with deduplication
      setAssignedMap((prev) => {
        const next = new Map(prev);
        const members = group.members || [];

        for (const m of members) {
          const mEmail = m.member_email.trim().toLowerCase();
          // Find matching candidate from loaded team rosters to keep full details
          const matchedCandidate =
            teamMembersList.find((c) => c.email.trim().toLowerCase() === mEmail) ||
            coHeadsList.find((c) => c.email.trim().toLowerCase() === mEmail) ||
            ({
              id: m.member_id || m.person_id || `grp-mem-${m.id}`,
              type: 'team_member',
              name: m.member_name,
              email: m.member_email,
              roleTitle: m.role_title || 'Team Member',
              status: 'active',
              sourceId: m.id,
              personId: m.person_id || null,
              memberId: m.member_id || null,
            } as ShiftCandidate);

          const key = getCandidateKey(matchedCandidate);
          const existing = next.get(key);

          if (existing) {
            // Already present: append group name to sourceGroupNames for transparency
            const groupNames = existing.sourceGroupNames.includes(group.name)
              ? existing.sourceGroupNames
              : [...existing.sourceGroupNames, group.name];
            next.set(key, { ...existing, sourceGroupNames: groupNames });
          } else {
            // Add new candidate configuration
            next.set(key, {
              candidate: matchedCandidate,
              responsibility: '',
              station: location || '',
              notes: '',
              is_supervisor: false,
              sourceGroupNames: [group.name],
              isIndividuallySelected: false,
            });
          }
        }
        return next;
      });
    }
  };

  // Toggle selection of an individual candidate (Co-Head or Team Member)
  const toggleCandidate = (candidate: ShiftCandidate) => {
    const key = getCandidateKey(candidate);
    setAssignedMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);

      if (existing) {
        if (existing.isIndividuallySelected) {
          if (existing.sourceGroupNames.length > 0) {
            // Kept in shift because they belong to an active group, but unmark individual flag
            next.set(key, { ...existing, isIndividuallySelected: false });
          } else {
            next.delete(key);
          }
        } else {
          // If they were added only through a group, clicking marks them as individually selected too
          next.set(key, { ...existing, isIndividuallySelected: true });
        }
      } else {
        next.set(key, {
          candidate,
          responsibility: '',
          station: location || '',
          notes: '',
          is_supervisor: false,
          sourceGroupNames: [],
          isIndividuallySelected: true,
        });
      }
      return next;
    });
  };

  // Remove a specific person from this shift entirely
  const removePersonFromShift = (candidateKey: string) => {
    setAssignedMap((prev) => {
      const next = new Map(prev);
      next.delete(candidateKey);
      return next;
    });
  };

  // Update specific assignment config (responsibility, station, supervisor)
  const updateCandidateConfig = (candidateKey: string, updates: Partial<AssignedPersonConfig>) => {
    setAssignedMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(candidateKey);
      if (existing) {
        next.set(candidateKey, { ...existing, ...updates });
      }
      return next;
    });
  };

  // Step 1 Validation
  const handleNextStep1 = () => {
    setFormError('');
    if (!title.trim()) {
      setFormError('Please enter a shift title or station name.');
      return;
    }
    if (!shiftDate) {
      setFormError('Please select a shift date.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Please select valid start and end times.');
      return;
    }
    if (capacity < 1) {
      setFormError('Staffing capacity must be at least 1 person.');
      return;
    }
    setStep(2);
  };

  // Final Save to Supabase (Draft or Open)
  const handleSaveShift = async (targetStatus: ShiftStatus) => {
    setSubmitting(true);
    setFormError('');

    try {
      // Calculate full ISO timestamps for starts_at and ends_at
      const startsAtIso = new Date(`${shiftDate}T${startTime}:00`).toISOString();

      let endsAtDate = shiftDate;
      if (duration.isOvernight) {
        // Shift ends on the next calendar day
        const [y, m, d] = shiftDate.split('-').map(Number);
        const nextDay = new Date(y, m - 1, d + 1);
        endsAtDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      }
      const endsAtIso = new Date(`${endsAtDate}T${endTime}:00`).toISOString();

      // 1. Create the shift in Supabase
      const shiftResult = await createDepartmentShift(
        {
          department,
          section,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          starts_at: startsAtIso,
          ends_at: endsAtIso,
          capacity: Math.max(1, capacity),
          status: targetStatus,
        },
        testToken,
      );

      if (!shiftResult.ok || !shiftResult.data) {
        throw new Error(shiftResult.error || 'Failed to create shift in database.');
      }

      const createdShift = shiftResult.data;

      // 2. Batch-assign all deduplicated personnel
      if (assignedList.length > 0) {
        const assignmentsPayload = assignedList.map((a) => ({
          person_id: a.candidate.personId || null,
          member_id: a.candidate.memberId || null,
          role_type: a.candidate.type === 'co_head' ? ('co_head' as const) : ('team_member' as const),
          responsibility: a.responsibility,
          station: a.station,
          notes: a.notes,
          is_supervisor: a.is_supervisor,
          assignee_name: a.candidate.name,
          assignee_email: a.candidate.email,
          status: 'assigned' as const,
        }));

        const assignResult = await batchAssignShiftPeople(
          createdShift.id,
          assignmentsPayload,
          testToken,
        );

        if (!assignResult.ok) {
          console.warn('Shift created but some assignments failed:', assignResult.error);
        }
      }

      // 3. Callback with updated count
      onSuccess({
        ...createdShift,
        assigned_count: assignedList.length,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save shift. Please try again.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[94vh] rounded-2xl border border-white/10 bg-[#0c0c12] shadow-2xl overflow-hidden text-white">
        {/* Modal Top Bar */}
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#111118]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#f1d98c] border border-[#d4af37]/30">
              <Calendar size={18} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                Schedule New Shift
              </h2>
              <p className="text-xs text-neutral-400">
                Department Operations · Step {step} of 3
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </header>

        {/* Step Progress Indicators */}
        <div className="flex border-b border-white/5 bg-[#0e0e16] px-5 py-2.5">
          <div className="flex w-full items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 cursor-pointer ${step === 1 ? 'text-[#f1d98c]' : 'text-neutral-400 hover:text-white'}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 1 ? 'bg-[#d4af37] text-black font-bold' : 'bg-white/10 text-neutral-400'}`}>
                1
              </span>
              Shift Details
            </button>

            <ChevronRight size={14} className="text-neutral-600" />

            <button
              type="button"
              onClick={() => {
                if (title.trim()) setStep(2);
              }}
              className={`flex items-center gap-2 cursor-pointer ${step === 2 ? 'text-[#f1d98c]' : 'text-neutral-400 hover:text-white'}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 2 ? 'bg-[#d4af37] text-black font-bold' : 'bg-white/10 text-neutral-400'}`}>
                2
              </span>
              Assign People ({totalAssignedCount})
            </button>

            <ChevronRight size={14} className="text-neutral-600" />

            <button
              type="button"
              onClick={() => {
                if (title.trim()) setStep(3);
              }}
              className={`flex items-center gap-2 cursor-pointer ${step === 3 ? 'text-[#f1d98c]' : 'text-neutral-400 hover:text-white'}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 3 ? 'bg-[#d4af37] text-black font-bold' : 'bg-white/10 text-neutral-400'}`}>
                3
              </span>
              Review & Publish
            </button>
          </div>
        </div>

        {/* Error message alert */}
        {formError && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* STEP 1: SHIFT DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Shift Title / Position Name <span className="text-[#d4af37]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Entrance Coordinator / VIP Station Lead / Stage Technician"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#121218] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Visual Date Picker */}
              <ShiftDatePicker
                value={shiftDate}
                onChange={setShiftDate}
                label="Date of Shift"
              />

              {/* Intuitive Time Selection */}
              <ShiftTimePicker
                startTime={startTime}
                endTime={endTime}
                onChangeStart={setStartTime}
                onChangeEnd={setEndTime}
              />

              {/* Location and Capacity */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Location / Station / Work Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gate 3, Registration Desk, Main Hall"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#121218] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Target Staffing Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={capacity}
                    onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full rounded-lg border border-white/10 bg-[#121218] px-3.5 py-2.5 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description & Instructions */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  General Instructions & Shift Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline briefing notes, radio channels, dress code, handover instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#121218] px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Live Summary Box */}
              <div className="rounded-xl border border-white/5 bg-[#12121a] p-4 text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                  Shift Summary
                </span>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#d4af37]" />
                    <span>{formatDateReadable(shiftDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#d4af37]" />
                    <span>{formatTime12h(startTime)} – {formatTime12h(endTime)} ({duration.formatted})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-[#d4af37]" />
                    <span>Target capacity: {capacity} people</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ASSIGN PEOPLE (3 CLEAR CATEGORIES + ASSIGNED ROSTER) */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Header live summary bar matching requirements */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4af37]/30 bg-gradient-to-r from-[#171510] via-[#12121a] to-[#12121a] p-3.5 shadow-sm">
                <div>
                  <h3 className="font-semibold text-white text-sm">Assign People to Shift</h3>
                  <p className="text-xs text-neutral-400">
                    Assign Co-Heads, individual members, or complete custom groups in one click.
                  </p>
                </div>

                {/* Live summary display: 2 Co-Heads · 3 individually selected · 2 groups selected · 9 unique people assigned */}
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs">
                  <span className="text-[#f1d98c] font-semibold">
                    {assignedCoHeadsCount} Co-Heads
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-white font-semibold">
                    {assignedIndividualMembersCount} individually selected
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-[#f1d98c] font-semibold">
                    {selectedGroupsCount} groups selected
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-[#d4af37] font-bold">
                    {totalAssignedCount} unique people assigned ({totalAssignedCount}/{capacity})
                  </span>
                </div>
              </div>

              {/* Three Clear Categories Tab Navigation + Assigned Roster Tab */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="inline-flex rounded-xl border border-white/10 bg-[#121218] p-1 text-xs gap-1">
                  {/* Category 1: Co-Heads */}
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('co_heads')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                      activeCategoryTab === 'co_heads'
                        ? 'bg-[#d4af37] text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Shield size={13} />
                    <span>1. Co-Heads</span>
                    <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                      {coHeadsList.length}
                    </span>
                  </button>

                  {/* Category 2: Individual Team Members */}
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('team_members')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                      activeCategoryTab === 'team_members'
                        ? 'bg-[#d4af37] text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Users size={13} />
                    <span>2. Individual Members</span>
                    <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                      {teamMembersList.length}
                    </span>
                  </button>

                  {/* Category 3: Custom Groups */}
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('custom_groups')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                      activeCategoryTab === 'custom_groups'
                        ? 'bg-[#d4af37] text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>3. Custom Groups</span>
                    <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                      {customGroupsList.length}
                    </span>
                  </button>

                  {/* Final Review: Assigned Roster */}
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('assigned_roster')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                      activeCategoryTab === 'assigned_roster'
                        ? 'bg-[#d4af37] text-black font-bold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <UserCheck size={13} />
                    <span>Assigned Roster</span>
                    <span className="rounded-full bg-[#d4af37]/20 text-[#f1d98c] px-1.5 py-0.2 text-[10px] font-bold">
                      {totalAssignedCount}
                    </span>
                  </button>
                </div>

                {/* Search bar */}
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search people or groups..."
                    value={searchCandidates}
                    onChange={(e) => setSearchCandidates(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#121218] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* CATEGORY 1: CO-HEADS */}
              {activeCategoryTab === 'co_heads' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                      <Shield size={13} /> Category 1: Co-Heads ({filteredCoHeads.length})
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {assignedCoHeadsCount} currently selected
                    </span>
                  </div>

                  {candidatesLoading ? (
                    <div className="py-10 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                      Loading Co-Heads...
                    </div>
                  ) : filteredCoHeads.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-[#121218] p-6 text-center text-xs text-neutral-500">
                      No Co-Heads found matching your search.
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {filteredCoHeads.map((c) => {
                        const key = getCandidateKey(c);
                        const isAssigned = assignedMap.has(key);
                        const cfg = assignedMap.get(key);

                        return (
                          <div
                            key={c.id}
                            className={`rounded-xl border p-3.5 transition-all ${
                              isAssigned
                                ? 'border-[#d4af37] bg-[#1a181e] shadow-[0_0_12px_rgba(212,175,55,0.12)]'
                                : 'border-white/10 bg-[#111116] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-semibold text-sm text-white truncate">{c.name}</h4>
                                  <span className="rounded bg-[#d4af37]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#f1d98c]">
                                    Co-Head
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400 truncate mt-0.5">{c.email}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleCandidate(c)}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                  isAssigned
                                    ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-sm'
                                    : 'border-white/20 bg-white/5 text-transparent hover:border-white/40'
                                }`}
                              >
                                <Check size={14} />
                              </button>
                            </div>

                            {/* Configuration fields for assigned Co-Head */}
                            {isAssigned && cfg && (
                              <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Task / Responsibility"
                                    value={cfg.responsibility}
                                    onChange={(e) =>
                                      updateCandidateConfig(key, { responsibility: e.target.value })
                                    }
                                    className="rounded border border-white/10 bg-[#161622] px-2 py-1 text-[11px] text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Station / Area"
                                    value={cfg.station}
                                    onChange={(e) =>
                                      updateCandidateConfig(key, { station: e.target.value })
                                    }
                                    className="rounded border border-white/10 bg-[#161622] px-2 py-1 text-[11px] text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={cfg.is_supervisor}
                                      onChange={(e) =>
                                        updateCandidateConfig(key, { is_supervisor: e.target.checked })
                                      }
                                      className="rounded border-white/20 bg-transparent text-[#d4af37] focus:ring-0"
                                    />
                                    <span>Designate as supervisor</span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => removePersonFromShift(key)}
                                    className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORY 2: INDIVIDUAL TEAM MEMBERS */}
              {activeCategoryTab === 'team_members' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                      <Users size={13} className="text-[#d4af37]" /> Category 2: Individual Team Members ({filteredTeamMembers.length})
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {assignedIndividualMembersCount} individually selected
                    </span>
                  </div>

                  {candidatesLoading ? (
                    <div className="py-10 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                      Loading team members...
                    </div>
                  ) : filteredTeamMembers.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-[#121218] p-6 text-center text-xs text-neutral-500">
                      No accepted team members found.
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {filteredTeamMembers.map((c) => {
                        const key = getCandidateKey(c);
                        const isAssigned = assignedMap.has(key);
                        const cfg = assignedMap.get(key);
                        const isFromGroup = cfg && cfg.sourceGroupNames.length > 0;

                        return (
                          <div
                            key={c.id}
                            className={`rounded-xl border p-3.5 transition-all ${
                              isAssigned
                                ? 'border-[#d4af37] bg-[#1a181e] shadow-[0_0_12px_rgba(212,175,55,0.12)]'
                                : 'border-white/10 bg-[#111116] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-semibold text-sm text-white truncate">{c.name}</h4>
                                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-neutral-300">
                                    {c.roleTitle}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400 truncate mt-0.5">
                                  {c.institution ? `${c.institution} · ` : ''}{c.email}
                                </p>

                                {/* Group source badge if included in group */}
                                {isFromGroup && cfg && (
                                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#f1d98c]">
                                    <Layers size={11} className="shrink-0" />
                                    <span>
                                      Already included via {cfg.sourceGroupNames.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleCandidate(c)}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                  isAssigned
                                    ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-sm'
                                    : 'border-white/20 bg-white/5 text-transparent hover:border-white/40'
                                }`}
                              >
                                <Check size={14} />
                              </button>
                            </div>

                            {/* Configuration fields for assigned Team Member */}
                            {isAssigned && cfg && (
                              <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Task / Responsibility"
                                    value={cfg.responsibility}
                                    onChange={(e) =>
                                      updateCandidateConfig(key, { responsibility: e.target.value })
                                    }
                                    className="rounded border border-white/10 bg-[#161622] px-2 py-1 text-[11px] text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Station / Area"
                                    value={cfg.station}
                                    onChange={(e) =>
                                      updateCandidateConfig(key, { station: e.target.value })
                                    }
                                    className="rounded border border-white/10 bg-[#161622] px-2 py-1 text-[11px] text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={cfg.is_supervisor}
                                      onChange={(e) =>
                                        updateCandidateConfig(key, { is_supervisor: e.target.checked })
                                      }
                                      className="rounded border-white/20 bg-transparent text-[#d4af37] focus:ring-0"
                                    />
                                    <span>Designate as supervisor</span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => removePersonFromShift(key)}
                                    className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORY 3: CUSTOM GROUPS (BULK SELECTION WITH DEDUPLICATION) */}
              {activeCategoryTab === 'custom_groups' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                        <Layers size={13} /> Category 3: Custom Team Groups ({filteredCustomGroups.length})
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Selecting a group instantly adds its members to this shift without creating duplicate assignments.
                      </p>
                    </div>

                    <span className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f1d98c]">
                      {selectedGroupsCount} of {customGroupsList.length} groups selected
                    </span>
                  </div>

                  {groupsLoading ? (
                    <div className="py-10 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                      Loading custom team groups...
                    </div>
                  ) : filteredCustomGroups.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-[#121218] p-8 text-center text-xs text-neutral-400 space-y-2">
                      <Layers size={28} className="mx-auto text-neutral-600" />
                      <p className="font-semibold text-white">No custom groups created yet</p>
                      <p className="max-w-md mx-auto text-neutral-400">
                        Create custom groups such as &ldquo;Bathroom Cleaners&rdquo;, &ldquo;Registration Desk&rdquo;, or &ldquo;VIP Support&rdquo; in the Team Groups section to assign everyone in one click.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredCustomGroups.map((group) => {
                        const isSelected = selectedGroupIds.has(group.id);
                        const memberCount = group.member_count ?? (group.members?.length || 0);
                        const members = group.members || [];

                        return (
                          <div
                            key={group.id}
                            className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                              isSelected
                                ? 'border-[#d4af37] bg-[#1a1712] shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                                : 'border-white/10 bg-[#101016] hover:border-white/20'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm text-white truncate">
                                      {group.name}
                                    </h4>
                                    <span className="rounded-md bg-[#d4af37]/15 px-2 py-0.5 text-[10px] font-bold text-[#f1d98c]">
                                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                    </span>
                                  </div>

                                  {group.description && (
                                    <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                                      {group.description}
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleGroupSelection(group)}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all cursor-pointer shrink-0 ${
                                    isSelected
                                      ? 'border-[#d4af37] bg-[#d4af37] text-black shadow-sm font-bold'
                                      : 'border-white/20 bg-white/5 text-transparent hover:border-white/40'
                                  }`}
                                >
                                  <Check size={14} />
                                </button>
                              </div>

                              {/* Members roster chips */}
                              {members.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {members.slice(0, 5).map((m) => (
                                    <span
                                      key={m.id}
                                      className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300 border border-white/5 truncate max-w-[140px]"
                                    >
                                      {m.member_name}
                                    </span>
                                  ))}
                                  {members.length > 5 && (
                                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400">
                                      +{members.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                              <span className={isSelected ? 'text-[#f1d98c] font-semibold' : 'text-neutral-500'}>
                                {isSelected ? 'Group members added to shift' : 'Click checkmark to add group'}
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleGroupSelection(group)}
                                className={`text-[11px] font-semibold underline underline-offset-2 cursor-pointer ${
                                  isSelected ? 'text-red-400 hover:text-red-300' : 'text-[#d4af37] hover:text-[#f1d98c]'
                                }`}
                              >
                                {isSelected ? 'Deselect group' : 'Select all in group'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ASSIGNED ROSTER (FULL DEDUPLICATED LIST WITH INDIVIDUAL CONTROLS) */}
              {activeCategoryTab === 'assigned_roster' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                        <UserCheck size={13} /> Unique Personnel Assigned ({totalAssignedCount} / {capacity})
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        All members from selected groups and individual candidates are combined without duplicates.
                      </p>
                    </div>

                    {totalAssignedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignedMap(new Map());
                          setSelectedGroupIds(new Set());
                        }}
                        className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Clear all assignments
                      </button>
                    )}
                  </div>

                  {totalAssignedCount === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-[#121218] p-8 text-center text-xs text-neutral-500 space-y-2">
                      <Users size={24} className="mx-auto text-neutral-600" />
                      <p className="font-semibold text-white">No one assigned yet</p>
                      <p>
                        Select Co-Heads, Individual Members, or Custom Groups from the tabs above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {assignedList.map((a) => {
                        const key = getCandidateKey(a.candidate);
                        const isCoHead = a.candidate.type === 'co_head';
                        const inMultipleGroups = a.sourceGroupNames.length > 1;

                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-white/10 bg-[#12121a] p-3.5 space-y-2.5 transition-all hover:border-[#d4af37]/40"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-semibold text-sm text-white">
                                    {a.candidate.name}
                                  </h4>
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      isCoHead
                                        ? 'bg-[#d4af37]/20 text-[#f1d98c] border border-[#d4af37]/30'
                                        : 'bg-white/10 text-neutral-300'
                                    }`}
                                  >
                                    {a.candidate.roleTitle || (isCoHead ? 'Co-Head' : 'Member')}
                                  </span>

                                  {/* Duplicate prevention explanation badges */}
                                  {inMultipleGroups && (
                                    <span className="rounded bg-blue-950/50 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                                      Included in {a.sourceGroupNames.length} groups: {a.sourceGroupNames.join(', ')}
                                    </span>
                                  )}

                                  {!inMultipleGroups && a.sourceGroupNames.length === 1 && (
                                    <span className="rounded bg-[#d4af37]/10 border border-[#d4af37]/20 px-2 py-0.5 text-[10px] text-[#f1d98c]">
                                      Group: {a.sourceGroupNames[0]}
                                    </span>
                                  )}

                                  {a.isIndividuallySelected && a.sourceGroupNames.length > 0 && (
                                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-neutral-300">
                                      + Individually selected
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-neutral-400 mt-0.5">
                                  {a.candidate.email}
                                </p>
                              </div>

                              <button
                                type="button"
                                title="Remove this person from shift"
                                onClick={() => removePersonFromShift(key)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-950/20 px-2.5 py-1 text-xs text-red-300 hover:bg-red-950/40 cursor-pointer"
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            </div>

                            {/* Individual Station & Responsibility Controls */}
                            <div className="grid gap-2 sm:grid-cols-2 pt-1 border-t border-white/5">
                              <div>
                                <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                                  Task / Responsibility
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Lead check-in desk, coordinate radios"
                                  value={a.responsibility}
                                  onChange={(e) =>
                                    updateCandidateConfig(key, { responsibility: e.target.value })
                                  }
                                  className="w-full rounded border border-white/10 bg-[#161622] px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                                  Station / Location
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. West Gate, Auditorium Door B"
                                  value={a.station}
                                  onChange={(e) =>
                                    updateCandidateConfig(key, { station: e.target.value })
                                  }
                                  className="w-full rounded border border-white/10 bg-[#161622] px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={a.is_supervisor}
                                  onChange={(e) =>
                                    updateCandidateConfig(key, { is_supervisor: e.target.checked })
                                  }
                                  className="rounded border-white/20 bg-transparent text-[#d4af37] focus:ring-0"
                                />
                                <span>Designate as shift supervisor</span>
                              </label>

                              {a.is_supervisor && (
                                <span className="rounded bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                  Supervisor Designated
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW & PUBLISH */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#12121a] p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                      Shift Details
                    </span>
                    <h3 className="text-lg font-bold font-serif text-white">{title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                  >
                    Edit details
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 text-xs text-neutral-300 border-t border-white/5 pt-3">
                  <div>
                    <span className="block text-neutral-500 text-[10px] uppercase">Date</span>
                    <span className="font-semibold text-white">{formatDateReadable(shiftDate)}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 text-[10px] uppercase">Time & Duration</span>
                    <span className="font-semibold text-white">
                      {formatTime12h(startTime)} – {formatTime12h(endTime)} ({duration.formatted})
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-500 text-[10px] uppercase">Location / Station</span>
                    <span className="font-semibold text-white">{location || 'Main Venue'}</span>
                  </div>
                </div>

                {description && (
                  <div className="border-t border-white/5 pt-2 text-xs">
                    <span className="block text-neutral-500 text-[10px] uppercase mb-0.5">Instructions</span>
                    <p className="text-neutral-300 whitespace-pre-wrap">{description}</p>
                  </div>
                )}
              </div>

              {/* Roster Assignment Breakdown with Groups Summary */}
              <div className="rounded-xl border border-white/10 bg-[#12121a] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Assigned Personnel ({totalAssignedCount} / {capacity})
                    </span>
                    {totalAssignedCount >= capacity && (
                      <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Fully Staffed
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                  >
                    Manage assignments
                  </button>
                </div>

                {/* Custom Groups Summary Strip */}
                {selectedGroupsCount > 0 && (
                  <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 p-3 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#f1d98c] flex items-center gap-1.5">
                      <Layers size={12} /> Custom Groups Applied ({selectedGroupsCount})
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Array.from(selectedGroupIds).map((gid) => {
                        const g = customGroupsList.find((x) => x.id === gid);
                        if (!g) return null;
                        return (
                          <span
                            key={gid}
                            className="inline-flex items-center gap-1 rounded bg-[#161622] border border-[#d4af37]/40 px-2.5 py-1 text-xs text-white"
                          >
                            <span className="font-semibold text-[#f1d98c]">{g.name}</span>
                            <span className="text-[10px] text-neutral-400">
                              ({g.member_count ?? g.members?.length ?? 0} members)
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Co-Heads Assigned */}
                <div>
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2 flex items-center gap-1.5">
                    <Shield size={12} /> Co-Heads ({assignedCoHeadsCount})
                  </h5>
                  {assignedCoHeadsCount === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No Co-Heads assigned to this shift.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {assignedList
                        .filter((a) => a.candidate.type === 'co_head')
                        .map((a) => {
                          const key = getCandidateKey(a.candidate);
                          return (
                            <div
                              key={key}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-[#161622] px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-white">{a.candidate.name}</span>
                                <span className="ml-2 text-[11px] text-neutral-400">({a.candidate.email})</span>
                                {a.responsibility && (
                                  <span className="ml-2 text-[#d4af37]">· {a.responsibility}</span>
                                )}
                                {a.station && (
                                  <span className="ml-2 text-neutral-400">@ {a.station}</span>
                                )}
                              </div>
                              {a.is_supervisor && (
                                <span className="rounded bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                  Supervisor
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Team Members Assigned */}
                <div className="pt-2">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                    <Users size={12} /> Team Members ({assignedList.filter((a) => a.candidate.type === 'team_member').length})
                  </h5>
                  {assignedList.filter((a) => a.candidate.type === 'team_member').length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No regular team members assigned to this shift.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {assignedList
                        .filter((a) => a.candidate.type === 'team_member')
                        .map((a) => {
                          const key = getCandidateKey(a.candidate);
                          return (
                            <div
                              key={key}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-[#161622] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white">{a.candidate.name}</span>
                                <span className="text-[11px] text-neutral-400">({a.candidate.email})</span>
                                {a.sourceGroupNames.length > 0 && (
                                  <span className="rounded bg-[#d4af37]/10 px-1.5 py-0.2 text-[10px] text-[#f1d98c]">
                                    Group: {a.sourceGroupNames.join(', ')}
                                  </span>
                                )}
                                {a.responsibility && (
                                  <span className="text-[#d4af37]">· {a.responsibility}</span>
                                )}
                                {a.station && (
                                  <span className="text-neutral-400">@ {a.station}</span>
                                )}
                              </div>
                              {a.is_supervisor && (
                                <span className="rounded bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                  Supervisor
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 bg-[#111118]">
          <div>
            {step > 1 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={step === 1 ? handleNextStep1 : () => setStep(3)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-4 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                Next Step <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveShift('draft')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} />
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveShift('open')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b89628] px-5 py-2 text-xs font-bold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Publish Shift
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
