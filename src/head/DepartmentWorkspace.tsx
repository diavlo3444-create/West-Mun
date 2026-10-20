import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  Panel,
  Skeleton,
  Toast,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cx,
  iconButtonCls,
  inputCls,
  labelCls,
  selectCls,
  type NoticeTone,
} from '../dashboard/ui';
import type { DepartmentKey, SectionKey } from './departments';
import type { DepartmentRecord, RecordInput } from './services/departmentStore';
import {
  PRIORITY_OPTIONS,
  isOpenStatus,
  isOverdue,
  recordDeadline,
  type Priority,
  type WorkspaceField,
  type WorkspaceModule,
} from './workspaces';

interface DepartmentWorkspaceProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  module: WorkspaceModule;
  records: DepartmentRecord[];
  loading: boolean;
  storageError: string;
  onReload: () => void;
  onCreate: (input: RecordInput) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (id: string, input: Partial<RecordInput>) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

type FormValue = string | boolean;

interface FormState {
  title: string;
  status: string;
  priority: Priority;
  fields: Record<string, FormValue>;
}

const PRIORITY_TONE: Record<Priority, string> = {
  low: 'border-white/[0.1] bg-white/[0.03] text-neutral-400',
  medium: 'border-sky-400/20 bg-sky-400/[0.07] text-sky-300',
  high: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300',
  urgent: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-300',
};

function buildForm(module: WorkspaceModule, record?: DepartmentRecord | null): FormState {
  const fields: Record<string, FormValue> = {};
  for (const field of module.fields) {
    if (field.type === 'checkbox') {
      fields[field.key] = Boolean(record?.data?.[field.key]);
    } else {
      const raw = record?.data?.[field.key];
      fields[field.key] = raw === undefined || raw === null ? '' : String(raw);
    }
  }
  return {
    title: record?.title || '',
    status: record?.status || module.defaultStatus,
    priority: (record?.priority as Priority) || 'medium',
    fields,
  };
}

function serializeForm(form: FormState): RecordInput {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form.fields)) {
    if (typeof value === 'boolean') {
      data[key] = value;
    } else if (value.trim() !== '') {
      data[key] = value.trim();
    }
  }
  return {
    category: '',
    title: form.title.trim(),
    status: form.status,
    priority: form.priority,
    data,
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function shortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function summaryFor(module: WorkspaceModule, record: DepartmentRecord): string {
  const field = module.fields.find((entry) => entry.type !== 'checkbox');
  if (!field) return '';
  const value = record.data?.[field.key];
  if (value === undefined || value === null || value === '') {
    return record.category === module.category ? '' : record.category;
  }
  return String(value);
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.06em] text-[#e2c258]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" aria-hidden="true" />
      {status || 'Unknown'}
    </span>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: WorkspaceField;
  value: FormValue;
  onChange: (next: FormValue) => void;
}) {
  const id = `wf-${field.key}`;
  if (field.type === 'checkbox') {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-white/[0.08] bg-[#0f0f12] px-3 py-2.5">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-[#d4af37]"
        />
        <span className="text-[12px] text-neutral-200">{field.label}</span>
      </label>
    );
  }

  return (
    <div className={field.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className={labelCls}>
        {field.label}
        {field.required && <span className="ml-1 text-rose-300">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={3}
          className={inputCls}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          className={selectCls}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Not set</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          {value && !(field.options || []).includes(String(value)) && (
            <option value={String(value)}>{String(value)}</option>
          )}
        </select>
      ) : (
        <input
          id={id}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'date'
                ? 'date'
                : field.type === 'time'
                  ? 'time'
                  : field.type === 'email'
                    ? 'email'
                    : field.type === 'url'
                      ? 'url'
                      : 'text'
          }
          className={inputCls}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.help && <p className="mt-1 text-[10.5px] leading-snug text-neutral-400">{field.help}</p>}
    </div>
  );
}

const priorityLabel = (priority: Priority) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

export const DepartmentWorkspace: React.FC<DepartmentWorkspaceProps> = ({
  department,
  section,
  module,
  records,
  loading,
  storageError,
  onReload,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);
  const [form, setForm] = useState<FormState>(() => buildForm(module));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<DepartmentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [toast, setToast] = useState<{ message: string; tone: NoticeTone } | null>(null);

  const moduleRecords = useMemo(
    () => records.filter((record) => record.category === module.category),
    [records, module.category],
  );

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setOnlyOpen(false);
  }, [module.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return moduleRecords.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && record.priority !== priorityFilter) return false;
      if (onlyOpen && !isOpenStatus(module, record.status)) return false;
      if (!needle) return true;
      const haystack = [record.title, record.status, summaryFor(module, record), recordDeadline(record.data)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [moduleRecords, module, search, statusFilter, priorityFilter, onlyOpen]);

  const openCount = useMemo(
    () => moduleRecords.filter((record) => isOpenStatus(module, record.status)).length,
    [moduleRecords, module],
  );
  const overdueCount = useMemo(
    () => moduleRecords.filter((record) => isOverdue(module, record)).length,
    [moduleRecords, module],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(buildForm(module));
    setFormError('');
    setFormOpen(true);
  }, [module]);

  const openEdit = useCallback(
    (record: DepartmentRecord) => {
      setEditing(record);
      setForm(buildForm(module, record));
      setFormError('');
      setFormOpen(true);
    },
    [module],
  );

  const submit = useCallback(async () => {
    setFormError('');
    if (!form.title.trim()) {
      setFormError('A title is required.');
      return;
    }
    const missing = module.fields.filter((field) => field.required && !String(form.fields[field.key] ?? '').trim());
    if (missing.length > 0) {
      setFormError(`Please complete: ${missing.map((field) => field.label).join(', ')}.`);
      return;
    }

    const payload = serializeForm(form);
    payload.category = module.category;

    setSaving(true);
    const result = editing ? await onUpdate(editing.id, payload) : await onCreate(payload);
    setSaving(false);

    if (!result.ok) {
      setFormError(result.error || 'The record could not be saved.');
      return;
    }
    setFormOpen(false);
    setToast({
      message: editing ? 'Record updated and saved to Supabase.' : 'Record created and saved to Supabase.',
      tone: 'success',
    });
  }, [form, module, editing, onCreate, onUpdate]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    const result = await onDelete(pendingDelete.id);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error || 'The record could not be deleted.');
      return;
    }
    setPendingDelete(null);
    setToast({ message: 'Record deleted.', tone: 'success' });
  }, [pendingDelete, onDelete]);

  const statusOptions = useMemo(() => {
    const values = [...module.statuses];
    for (const record of moduleRecords) {
      if (record.status && !values.includes(record.status)) values.push(record.status);
    }
    return values;
  }, [module.statuses, moduleRecords]);

  const Icon = module.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={module.navLabel}
        title={module.label}
        description={module.description}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] text-neutral-300">
              {moduleRecords.length} saved
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] text-amber-300">
              {openCount} open
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/[0.07] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] text-rose-300">
                {overdueCount} overdue
              </span>
            )}
            {section && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[0.08em] text-[#e2c258]">
                {section} division
              </span>
            )}
          </>
        }
        actions={
          <>
            <button type="button" onClick={onReload} className={btnSecondary} disabled={loading}>
              <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={openCreate} className={btnPrimary} disabled={Boolean(storageError)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New item
            </button>
          </>
        }
      />

      {storageError && (
        <Notice tone="error" title="Workspace storage is unavailable">
          {storageError}{' '}
          <button
            type="button"
            onClick={onReload}
            className="font-semibold underline underline-offset-2 hover:text-white"
          >
            Retry
          </button>
        </Notice>
      )}

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="relative min-w-[180px] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${module.label.toLowerCase()}`}
              aria-label={`Search ${module.label}`}
              className={cx(inputCls, 'pl-8')}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
            className={cx(selectCls, 'w-auto min-w-[130px]')}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            aria-label="Filter by priority"
            className={cx(selectCls, 'w-auto min-w-[120px]')}
          >
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabel(priority)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOnlyOpen((value) => !value)}
            aria-pressed={onlyOpen}
            className={cx(btnGhost, onlyOpen && 'bg-[#d4af37]/[0.08] text-[#e2c258]')}
          >
            Open only
          </button>
          {(search || statusFilter !== 'all' || priorityFilter !== 'all' || onlyOpen) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setOnlyOpen(false);
              }}
              className={btnGhost}
              aria-label="Clear filters"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {loading && moduleRecords.length === 0 ? (
          <div className="space-y-2.5 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : moduleRecords.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={storageError ? 'Records cannot be loaded yet' : module.emptyTitle}
            description={
              storageError
                ? 'Once the workspace storage migration has been applied, records will appear here.'
                : module.emptyDescription
            }
            action={
              !storageError ? (
                <button type="button" onClick={openCreate} className={btnPrimary}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Create the first item
                </button>
              ) : undefined
            }
          />
        ) : visibleRecords.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No items match these filters"
            description="Adjust the search or filters to see more records."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[9.5px] font-mono uppercase tracking-[0.14em] text-neutral-400">
                    <th scope="col" className="px-4 py-2.5 font-normal">Item</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Priority</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Deadline</th>
                    <th scope="col" className="px-3 py-2.5 font-normal">Updated</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => {
                    const deadline = recordDeadline(record.data);
                    const overdue = isOverdue(module, record);
                    const detail = summaryFor(module, record);
                    return (
                      <tr key={record.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        <td className="max-w-[340px] px-4 py-3 align-top">
                          <p className="truncate text-[12.5px] font-medium text-neutral-100">{record.title}</p>
                          {detail && <p className="mt-0.5 truncate text-[10.5px] text-neutral-400">{detail}</p>}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <StatusPill status={record.status} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={cx(
                              'inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-mono uppercase tracking-[0.08em]',
                              PRIORITY_TONE[record.priority],
                            )}
                          >
                            {record.priority}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top text-[11px]">
                          {deadline ? (
                            <span className={overdue ? 'text-rose-300' : 'text-neutral-300'}>
                              {shortDate(deadline)}
                              {overdue && ' · overdue'}
                            </span>
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[10px] text-neutral-400">
                          {formatDate(record.updated_at || record.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(record)}
                              className={iconButtonCls}
                              aria-label={`Edit ${record.title}`}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingDelete(record);
                                setDeleteError('');
                              }}
                              className={cx(iconButtonCls, 'hover:border-rose-400/30 hover:text-rose-300')}
                              aria-label={`Delete ${record.title}`}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/[0.05] md:hidden">
              {visibleRecords.map((record) => {
                const deadline = recordDeadline(record.data);
                const overdue = isOverdue(module, record);
                const detail = summaryFor(module, record);
                return (
                  <li key={record.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-neutral-100">{record.title}</p>
                        {detail && <p className="mt-0.5 text-[10.5px] text-neutral-400">{detail}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          className={iconButtonCls}
                          aria-label={`Edit ${record.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingDelete(record);
                            setDeleteError('');
                          }}
                          className={cx(iconButtonCls, 'hover:border-rose-400/30 hover:text-rose-300')}
                          aria-label={`Delete ${record.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={record.status} />
                      <span
                        className={cx(
                          'inline-flex rounded border px-1.5 py-0.5 text-[9.5px] font-mono uppercase tracking-[0.08em]',
                          PRIORITY_TONE[record.priority],
                        )}
                      >
                        {record.priority}
                      </span>
                      {deadline && (
                        <span className={cx('text-[10px]', overdue ? 'text-rose-300' : 'text-neutral-400')}>
                          Due {shortDate(deadline)}
                          {overdue && ' · overdue'}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      <p className="px-1 text-[10px] text-neutral-500">
        {visibleRecords.length} of {moduleRecords.length} records shown · department scope: {department}
        {section ? ` / ${section}` : ''} · stored in Supabase.
      </p>

      <Modal
        open={formOpen}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        eyebrow={editing ? 'Edit record' : 'New record'}
        title={editing ? `Edit ${module.titleLabel.toLowerCase()}` : `Add ${module.titleLabel.toLowerCase()}`}
        description={`Saved to Supabase for the ${department} workspace.`}
        size="lg"
        closeOnBackdrop={!saving}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className={btnSecondary} disabled={saving}>
              Cancel
            </button>
            <button type="button" onClick={submit} className={btnPrimary} disabled={saving}>
              {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {editing ? 'Save changes' : 'Create record'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Notice tone="error">{formError}</Notice>}

          <div>
            <label htmlFor="workspace-title" className={labelCls}>
              {module.titleLabel}
              <span className="ml-1 text-rose-300">*</span>
            </label>
            <input
              id="workspace-title"
              data-autofocus
              className={inputCls}
              value={form.title}
              maxLength={200}
              placeholder={module.titlePlaceholder}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="workspace-status" className={labelCls}>
                Status
              </label>
              <select
                id="workspace-status"
                className={selectCls}
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="workspace-priority" className={labelCls}>
                Priority
              </label>
              <select
                id="workspace-priority"
                className={selectCls}
                value={form.priority}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, priority: event.target.value as Priority }))
                }
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {module.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={form.fields[field.key] ?? ''}
                onChange={(next) =>
                  setForm((previous) => ({
                    ...previous,
                    fields: { ...previous.fields, [field.key]: next },
                  }))
                }
              />
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) {
            setPendingDelete(null);
            setDeleteError('');
          }
        }}
        onConfirm={confirmDelete}
        title="Delete this record?"
        description={
          <>
            <strong className="text-neutral-200">{pendingDelete?.title}</strong> will be permanently removed
            from the {department} workspace. This cannot be undone.
          </>
        }
        confirmLabel="Delete record"
        tone="danger"
        busy={deleting}
        error={deleteError}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
};
