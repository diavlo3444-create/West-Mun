import { supabase, supabaseConfigured } from '../../lib/supabase';
import { isDepartmentKey, isSectionKey, type DepartmentKey, type SectionKey } from '../departments';
import { PRIORITY_OPTIONS, type Priority } from '../workspaces';

/**
 * Department records live in public.department_records.
 *
 * There is deliberately no localStorage fallback and no seeded sample data:
 * a workspace either reads and writes real Supabase rows, or it surfaces a
 * clear error explaining exactly what an administrator must run. Simulating a
 * successful save would corrupt operational planning.
 *
 * Super IT test sessions have no Supabase Auth session, so their reads and
 * writes go through the privileged server endpoints in /api/super-admin and
 * are audit-logged there.
 */

export interface DepartmentRecord {
  id: string;
  department: DepartmentKey;
  section: SectionKey | null;
  category: string;
  title: string;
  status: string;
  priority: Priority;
  data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface RecordScope {
  department: DepartmentKey;
  section?: SectionKey | null;
  /** Verified Super IT test session token, when testing as a head. */
  testToken?: string | null;
}

export interface RecordInput {
  category: string;
  title: string;
  status: string;
  priority?: Priority;
  data?: Record<string, unknown>;
}

export interface StoreResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export const WORKSPACE_STORAGE_MIGRATION = 'supabase/migration_department_workspaces.sql';

const MAX_TITLE = 200;
const MAX_STATUS = 60;
const MAX_CATEGORY = 60;

export const WORKSPACE_STORAGE_ERROR =
  'Department workspace storage is not initialized in this Supabase project. ' +
  `An administrator must run ${WORKSPACE_STORAGE_MIGRATION} in the Supabase SQL Editor, then reload this page.`;

function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204') return true;
  return /could not find the table|relation .* does not exist|schema cache/i.test(error.message || '');
}

export function explainStoreError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return 'The request failed for an unknown reason.';
  if (isMissingTable(error)) return WORKSPACE_STORAGE_ERROR;
  if (
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    /row-level security|permission denied|policy/i.test(error.message || '')
  ) {
    return 'Row Level Security blocked this operation. Your department assignment may be inactive, or the record belongs to another department.';
  }
  if (/auth session missing|jwt expired|session expired|invalid claim/i.test(error.message || '')) {
    return 'Your session expired. Sign in again to continue.';
  }
  if (/failed to fetch|network|timeout|ECONN/i.test(error.message || '')) {
    return 'Could not reach Supabase. Check the connection and retry.';
  }
  return error.message || 'The workspace request failed.';
}

function normalizePriority(value: unknown): Priority {
  return typeof value === 'string' && (PRIORITY_OPTIONS as readonly string[]).includes(value)
    ? (value as Priority)
    : 'medium';
}

function normalizeSection(department: DepartmentKey, section?: SectionKey | null): SectionKey | null {
  const separated = department === 'media_press' || department === 'security' || department === 'volunteers';
  if (!separated) return null;
  return isSectionKey(section) ? section : null;
}

function normalizeRecord(row: Record<string, unknown>): DepartmentRecord | null {
  const department = String(row.department || '').trim().toLowerCase();
  if (!isDepartmentKey(department)) return null;
  const section = isSectionKey(row.section) ? row.section : null;
  const rawPriority = row.priority;
  return {
    id: String(row.id || ''),
    department,
    section,
    category: String(row.category || ''),
    title: String(row.title || ''),
    status: String(row.status || ''),
    priority: normalizePriority(rawPriority),
    data:
      row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {},
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
  };
}

/** Validates user input before it reaches Supabase or the test-mode endpoint. */
export function validateRecordInput(input: RecordInput): string | null {
  const title = String(input.title || '').trim();
  if (!title) return 'A title is required.';
  if (title.length > MAX_TITLE) return `The title must be ${MAX_TITLE} characters or fewer.`;
  const category = String(input.category || '').trim();
  if (!category) return 'A record category is required.';
  if (category.length > MAX_CATEGORY) return 'The record category is invalid.';
  const status = String(input.status || '').trim();
  if (!status) return 'A status is required.';
  if (status.length > MAX_STATUS) return `The status must be ${MAX_STATUS} characters or fewer.`;
  if (input.data !== undefined && (typeof input.data !== 'object' || Array.isArray(input.data))) {
    return 'Record details must be a JSON object.';
  }
  return null;
}

async function ensureFreshSession(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const expiresAt = data?.session?.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now() + 60_000) {
      await supabase.auth.refreshSession();
    }
  } catch {
    // Non-fatal: the request below will surface an auth error if it matters.
  }
}

async function testRequest<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<StoreResult<T>> {
  try {
    const response = await fetch(`/api/super-admin${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || payload?.success === false) {
      return {
        ok: false,
        code: String(payload?.code || response.status),
        error: String(payload?.error || 'The Super IT test request failed.'),
      };
    }
    return { ok: true, data: payload as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error while contacting the test endpoint.',
    };
  }
}

/**
 * Reads every department record the caller is allowed to see. RLS scopes the
 * result to the caller's department (plus intentionally shared categories such
 * as venue and run-of-show). The explicit department filter keeps the request
 * aligned with the UI even if a policy is later widened on purpose.
 */
export async function listDepartmentRecords(scope: RecordScope): Promise<StoreResult<DepartmentRecord[]>> {
  if (!isDepartmentKey(scope.department)) {
    return { ok: false, error: 'Unknown department.' };
  }

  if (scope.testToken) {
    const params = new URLSearchParams({ action: 'test-records', department: scope.department });
    if (scope.section) params.set('section', scope.section);
    const result = await testRequest<{ records?: Record<string, unknown>[] }>(
      scope.testToken,
      `?${params.toString()}`,
    );
    if (!result.ok) return { ok: false, error: result.error, code: result.code };
    const records = (result.data?.records || [])
      .map((row) => normalizeRecord(row))
      .filter((row): row is DepartmentRecord => Boolean(row));
    return { ok: true, data: records };
  }

  if (!supabaseConfigured || !supabase) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      error: 'Supabase is not configured for this deployment. Contact the IT Super Admin.',
    };
  }

  await ensureFreshSession();

  const { data, error } = await supabase
    .from('department_records')
    .select('*')
    .eq('department', scope.department)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    return { ok: false, code: error.code, error: explainStoreError(error) };
  }

  const records = (data || [])
    .map((row) => normalizeRecord(row as Record<string, unknown>))
    .filter((row): row is DepartmentRecord => Boolean(row));

  return { ok: true, data: records };
}

export async function createDepartmentRecord(
  scope: RecordScope,
  input: RecordInput,
): Promise<StoreResult<DepartmentRecord>> {
  const validationError = validateRecordInput(input);
  if (validationError) return { ok: false, error: validationError };

  const section = normalizeSection(scope.department, scope.section);
  const payload = {
    department: scope.department,
    section,
    category: String(input.category).trim(),
    title: String(input.title).trim(),
    status: String(input.status).trim(),
    priority: normalizePriority(input.priority),
    data: input.data || {},
  };

  if (scope.testToken) {
    const result = await testRequest<{ record?: Record<string, unknown> }>(
      scope.testToken,
      '?action=test-record-save',
      { method: 'POST', body: JSON.stringify({ record: payload }) },
    );
    if (!result.ok) return { ok: false, error: result.error, code: result.code };
    const record = result.data?.record ? normalizeRecord(result.data.record) : null;
    return record ? { ok: true, data: record } : { ok: false, error: 'The record was saved but could not be read back.' };
  }

  if (!supabaseConfigured || !supabase) {
    return { ok: false, code: 'NOT_CONFIGURED', error: 'Supabase is not configured for this deployment.' };
  }

  await ensureFreshSession();

  const { data, error } = await supabase
    .from('department_records')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { ok: false, code: error.code, error: explainStoreError(error) };

  const record = data ? normalizeRecord(data as Record<string, unknown>) : null;
  return record ? { ok: true, data: record } : { ok: false, error: 'The record was saved but could not be read back.' };
}

export async function updateDepartmentRecord(
  scope: RecordScope,
  id: string,
  patch: Partial<RecordInput>,
): Promise<StoreResult<DepartmentRecord>> {
  if (!id) return { ok: false, error: 'A record id is required.' };

  const validationError = validateRecordInput({
    category: patch.category ?? 'unchanged',
    title: patch.title ?? 'unchanged',
    status: patch.status ?? 'unchanged',
    data: patch.data,
  });
  if (validationError) return { ok: false, error: validationError };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = String(patch.title).trim();
  if (patch.status !== undefined) update.status = String(patch.status).trim();
  if (patch.priority !== undefined) update.priority = normalizePriority(patch.priority);
  if (patch.data !== undefined) update.data = patch.data;

  if (scope.testToken) {
    const result = await testRequest<{ record?: Record<string, unknown> }>(
      scope.testToken,
      '?action=test-record-save',
      { method: 'POST', body: JSON.stringify({ id, patch: update }) },
    );
    if (!result.ok) return { ok: false, error: result.error, code: result.code };
    const record = result.data?.record ? normalizeRecord(result.data.record) : null;
    return record ? { ok: true, data: record } : { ok: false, error: 'The change was saved but could not be read back.' };
  }

  if (!supabaseConfigured || !supabase) {
    return { ok: false, code: 'NOT_CONFIGURED', error: 'Supabase is not configured for this deployment.' };
  }

  await ensureFreshSession();

  const { data, error } = await supabase
    .from('department_records')
    .update(update)
    .eq('id', id)
    .eq('department', scope.department)
    .select('*')
    .maybeSingle();

  if (error) return { ok: false, code: error.code, error: explainStoreError(error) };
  if (!data) {
    return {
      ok: false,
      error:
        'No record was updated. It may belong to another department, or your assignment no longer allows this change.',
    };
  }

  const record = normalizeRecord(data as Record<string, unknown>);
  return record ? { ok: true, data: record } : { ok: false, error: 'The change was saved but could not be read back.' };
}

export async function deleteDepartmentRecord(
  scope: RecordScope,
  id: string,
): Promise<StoreResult<null>> {
  if (!id) return { ok: false, error: 'A record id is required.' };

  if (scope.testToken) {
    const result = await testRequest<{ deleted?: number }>(
      scope.testToken,
      '?action=test-record-delete',
      { method: 'POST', body: JSON.stringify({ id }) },
    );
    return result.ok ? { ok: true, data: null } : { ok: false, error: result.error, code: result.code };
  }

  if (!supabaseConfigured || !supabase) {
    return { ok: false, code: 'NOT_CONFIGURED', error: 'Supabase is not configured for this deployment.' };
  }

  await ensureFreshSession();

  const { data, error } = await supabase
    .from('department_records')
    .delete()
    .eq('id', id)
    .eq('department', scope.department)
    .select('id');

  if (error) return { ok: false, code: error.code, error: explainStoreError(error) };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: 'No record was deleted. It may belong to another department, or deletion is restricted for this category.',
    };
  }

  return { ok: true, data: null };
}
