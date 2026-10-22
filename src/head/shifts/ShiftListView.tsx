import React, { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  MapPin,
  Users,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { WmShift } from '../services/operationsStore';
import { formatTime12h, calculateShiftDuration } from './ShiftTimePicker';
import { formatDateReadable } from './ShiftDatePicker';

interface ShiftListViewProps {
  shifts: WmShift[];
  onSelectShift: (shift: WmShift) => void;
  onEditShift: (shift: WmShift) => void;
  onDuplicateShift: (shift: WmShift) => void;
  onDeleteShift: (shift: WmShift) => void;
  onOpenCreate: () => void;
}

type DateFilterOption = 'all' | 'today' | 'tomorrow' | 'week' | 'upcoming' | 'past';
type StatusFilterOption = 'all' | 'open' | 'draft' | 'closed';

export const ShiftListView: React.FC<ShiftListViewProps> = ({
  shifts,
  onSelectShift,
  onEditShift,
  onDuplicateShift,
  onDeleteShift,
  onOpenCreate,
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // 1. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchLoc = (s.location || '').toLowerCase().includes(q);
        const matchDesc = (s.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchDesc) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }

      // 3. Date range filter
      const shiftDate = s.starts_at.slice(0, 10);
      const shiftTime = new Date(s.starts_at).getTime();
      const currentTime = now.getTime();

      if (dateFilter === 'today') {
        if (shiftDate !== todayStr) return false;
      } else if (dateFilter === 'tomorrow') {
        if (shiftDate !== tomorrowStr) return false;
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        if (shiftTime < startOfWeek.getTime() || shiftTime > endOfWeek.getTime()) return false;
      } else if (dateFilter === 'upcoming') {
        if (shiftTime < currentTime) return false;
      } else if (dateFilter === 'past') {
        if (shiftTime >= currentTime) return false;
      }

      return true;
    });
  }, [shifts, search, statusFilter, dateFilter, todayStr, tomorrowStr, now]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0e0e14] p-3.5">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search shifts by title, location, or instructions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#14141c] pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <select
            aria-label="Filter by date range"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
            className="rounded-lg border border-white/10 bg-[#14141c] px-3 py-2 text-xs text-neutral-300 focus:border-[#d4af37] focus:outline-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilterOption)}
            className="rounded-lg border border-white/10 bg-[#14141c] px-3 py-2 text-xs text-neutral-300 focus:border-[#d4af37] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open / Published</option>
            <option value="draft">Drafts</option>
            <option value="closed">Closed</option>
          </select>

          <button
            type="button"
            onClick={onOpenCreate}
            className="rounded-lg border border-[#d4af37] bg-[#d4af37]/15 px-3 py-2 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25 transition-all"
          >
            + Create Shift
          </button>
        </div>
      </div>

      {/* Shifts List Content */}
      {filteredShifts.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0e0e14] py-16 text-center">
          <Calendar size={36} className="mx-auto text-neutral-600 mb-3" />
          <h4 className="text-base font-semibold text-white">No shifts match your filters</h4>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
            {shifts.length === 0
              ? 'Get started by creating your first coverage shift for this department.'
              : 'Try clearing your search or date filters to see more scheduled shifts.'}
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37] bg-[#d4af37] px-4 py-2 text-xs font-bold text-black hover:brightness-110 shadow-lg"
          >
            Create New Shift
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map((shift) => {
            const shiftDate = shift.starts_at.slice(0, 10);
            const startTime24 = shift.starts_at.slice(11, 16);
            const endTime24 = shift.ends_at.slice(11, 16);
            const duration = calculateShiftDuration(startTime24, endTime24);
            const assignedCount = shift.assigned_count ?? 0;
            const isFull = assignedCount >= shift.capacity;

            return (
              <article
                key={shift.id}
                className="group relative rounded-xl border border-white/10 bg-[#0e0e14] p-4 transition-all hover:border-[#d4af37]/50 hover:bg-[#12121a] shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Title, Date, Timing, Location */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        onClick={() => onSelectShift(shift)}
                        className="text-base font-semibold text-white hover:text-[#d4af37] cursor-pointer transition-colors"
                      >
                        {shift.title}
                      </h3>

                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          shift.status === 'draft'
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                            : shift.status === 'closed'
                            ? 'bg-neutral-800 text-neutral-400'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {shift.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-400">
                      <div className="flex items-center gap-1.5 text-neutral-200">
                        <Calendar size={13} className="text-[#d4af37]" />
                        <span className="font-medium">{formatDateReadable(shiftDate)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#d4af37]" />
                        <span>
                          {formatTime12h(startTime24)} – {formatTime12h(endTime24)}
                        </span>
                        <span className="text-neutral-500">({duration.formatted})</span>
                      </div>

                      {shift.location && (
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <MapPin size={13} className="text-[#d4af37]" />
                          <span>{shift.location}</span>
                        </div>
                      )}
                    </div>

                    {shift.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2 max-w-3xl">
                        {shift.description}
                      </p>
                    )}
                  </div>

                  {/* Middle: Staffing Capacity Bar */}
                  <div className="flex items-center gap-3 lg:w-48 lg:border-l lg:border-white/5 lg:pl-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-400">Staffing</span>
                        <span className={`font-mono font-bold ${isFull ? 'text-emerald-400' : 'text-[#f1d98c]'}`}>
                          {assignedCount} / {shift.capacity}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-emerald-500' : 'bg-[#d4af37]'
                          }`}
                          style={{ width: `${Math.min(100, (assignedCount / shift.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 lg:border-t-0 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => onSelectShift(shift)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/20 transition-all"
                    >
                      <Eye size={13} /> Details & Roster
                    </button>

                    <button
                      type="button"
                      title="Edit shift"
                      onClick={() => onEditShift(shift)}
                      className="rounded-lg border border-white/10 p-2 text-neutral-400 hover:border-white/30 hover:text-white transition-all"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      title="Duplicate shift"
                      onClick={() => onDuplicateShift(shift)}
                      className="rounded-lg border border-white/10 p-2 text-neutral-400 hover:border-white/30 hover:text-[#d4af37] transition-all"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      type="button"
                      title="Delete shift"
                      onClick={() => onDeleteShift(shift)}
                      className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-950/20 hover:border-red-500/40 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
