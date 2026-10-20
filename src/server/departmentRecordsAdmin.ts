import {
  getSupabaseAdmin,
  recordTestAuditLog,
  verifyTestSession,
} from './superAdminHandler.ts';
import { VALID_DEPARTMENTS, isGenderSeparatedDepartment, type DepartmentKey } from './headStore.ts';

/**
 * Privileged department_records access for Super IT *test sessions*.
 *
 * Test sessions intentionally have no Supabase Auth session, so regular RLS
 * cannot apply. Every call here re-verifies the signed test token server-side
 * and is written to the test audit log. Regular department heads never reach
 * this code path: they use their own JWT against RLS policies.
 */

const MISSING_TABLE_MESSAGE =
  'Department workspace storage is not initialized. Run supabase/migration_department_workspaces.sql in the Supabase SQL Editor.';
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const MAX_TITLE = 200;
const MAX_STATUS = 60;
const MAX_CATEGORY = 60;
const MAX_DATA_BYTES = 20_000;

interface HandlerResult<T> {
  statusCode: number;
  body: T & { success: boolean; error?: string; code?: string };
}

function isMissingTable(code?: string, message?: string): boolean {
  if (code === 'PGRST205' || code === '42P01' || code === 'PGRST204') return true;
  return /could not find the table|relation .* does not exist|schema cache/i.test(message || '');
}

function normalizeDepartment(value: unknown): DepartmentKey | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'media') return 'media_press';
  return (VALID_DEPARTMENTS as string[]).includes(normalized) ? (normalized as DepartmentKey) : null;
}

function sanitizeData(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_DATA_BYTES) return null;
    const parsed = JSON.parse(serialized);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validateFields(input: {
  category?: unknown;
  title?: unknown;
  status?: unknown;
  priority?: unknown;
}): string | null {
  if (input.category !== undefined) {
    const category = String(input.category || '').trim();
    if (!category || category.length > MAX_CATEGORY) return 'Invalid record category.';
  }
  if (input.title !== undefined) {
    const title = String(input.title || '').trim();
    if (!title) return 'A title is required.';
    if (title.length > MAX_TITLE) return `The title must be ${MAX_TITLE} characters or fewer.`;
  }
  if (input.status !== undefined) {
    const status = String(input.status || '').trim();
    if (!status) return 'A status is required.';
    if (status.length > MAX_STATUS) return `The status must be ${MAX_STATUS} characters or fewer.`;
  }
  if (input.priority !== undefined && !PRIORITIES.includes(String(input.priority))) {
    return 'Invalid priority.';
  }
  return null;
}

export async function handleTestSessionRecords(
  sessionToken: string,
  params: { department?: string; section?: string | null },
): Promise<HandlerResult<{ records?: any[] }>> {
  const session = verifyTestSession(sessionToken);
  if (!session) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: a valid Super IT test session is required.' },
    };
  }

  const department = normalizeDepartment(params.department || session.department);
  if (!department) {
    return { statusCode: 400, body: { success: false, error: 'Unknown department.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      statusCode: 503,
      body: {
        success: false,
        error:
          'The server-side Supabase service role key is not configured, so test-mode workspace records cannot be read.',
      },
    };
  }

  recordTestAuditLog(
    'access_data',
    session.adminEmail,
    session.adminId,
    session.headEmail,
    department,
    params.section ?? session.section ?? null,
    sessionToken,
    'Department workspace records read during an active test session',
  );

  const { data, error } = await supabaseAdmin
    .from('department_records')
    .select('*')
    .eq('department', department)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    const missing = isMissingTable(error.code, error.message);
    return {
      statusCode: missing ? 409 : 400,
      body: {
        success: false,
        code: error.code,
        error: missing ? MISSING_TABLE_MESSAGE : error.message,
      },
    };
  }

  return { statusCode: 200, body: { success: true, records: data || [] } };
}

export async function handleTestSessionRecordSave(
  sessionToken: string,
  body: { id?: string; record?: Record<string, unknown>; patch?: Record<string, unknown> },
): Promise<HandlerResult<{ record?: any }>> {
  const session = verifyTestSession(sessionToken);
  if (!session) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: a valid Super IT test session is required.' },
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      statusCode: 503,
      body: {
        success: false,
        error:
          'The server-side Supabase service role key is not configured, so test-mode workspace records cannot be written.',
      },
    };
  }

  const isUpdate = Boolean(body.id);
  let payload: Record<string, unknown>;

  if (isUpdate) {
    const patch = body.patch || {};
    const validationError = validateFields({
      title: patch.title,
      status: patch.status,
      priority: patch.priority,
    });
    if (validationError) return { statusCode: 400, body: { success: false, error: validationError } };

    payload = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) payload.title = String(patch.title).trim();
    if (patch.status !== undefined) payload.status = String(patch.status).trim();
    if (patch.priority !== undefined) payload.priority = String(patch.priority);
    if (patch.data !== undefined) {
      const data = sanitizeData(patch.data);
      if (!data) return { statusCode: 400, body: { success: false, error: 'Invalid record details.' } };
      payload.data = data;
    }
  } else {
    const record = body.record || {};
    const department = normalizeDepartment(record.department);
    if (!department) {
      return { statusCode: 400, body: { success: false, error: 'Unknown department.' } };
    }
    const validationError = validateFields({
      category: record.category,
      title: record.title,
      status: record.status,
      priority: record.priority,
    });
    if (validationError) return { statusCode: 400, body: { success: false, error: validationError } };

    const data = sanitizeData(record.data);
    if (!data) return { statusCode: 400, body: { success: false, error: 'Invalid record details.' } };

    const section =
      isGenderSeparatedDepartment(department) &&
      (record.section === 'male' || record.section === 'female')
        ? record.section
        : null;

    payload = {
      department,
      section,
      category: String(record.category).trim(),
      title: String(record.title).trim(),
      status: String(record.status).trim(),
      priority: String(record.priority || 'medium'),
      data,
    };
  }

  recordTestAuditLog(
    'department_record_write',
    session.adminEmail,
    session.adminId,
    session.headEmail,
    session.department,
    session.section,
    sessionToken,
    isUpdate ? `Workspace record ${body.id} updated (test mode)` : 'Workspace record created (test mode)',
  );

  const query = isUpdate
    ? supabaseAdmin.from('department_records').update(payload).eq('id', body.id)
    : supabaseAdmin.from('department_records').insert(payload);

  const { data, error } = await query.select('*').maybeSingle();

  if (error) {
    const missing = isMissingTable(error.code, error.message);
    return {
      statusCode: missing ? 409 : 400,
      body: {
        success: false,
        code: error.code,
        error: missing ? MISSING_TABLE_MESSAGE : error.message,
      },
    };
  }
  if (!data) {
    return {
      statusCode: 404,
      body: { success: false, error: 'The workspace record was not found.' },
    };
  }

  return { statusCode: 200, body: { success: true, record: data } };
}

export async function handleTestSessionRecordDelete(
  sessionToken: string,
  body: { id?: string },
): Promise<HandlerResult<{ deleted?: number }>> {
  const session = verifyTestSession(sessionToken);
  if (!session) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: a valid Super IT test session is required.' },
    };
  }

  const id = String(body.id || '').trim();
  if (!id) {
    return { statusCode: 400, body: { success: false, error: 'A record id is required.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      statusCode: 503,
      body: {
        success: false,
        error:
          'The server-side Supabase service role key is not configured, so test-mode records cannot be deleted.',
      },
    };
  }

  recordTestAuditLog(
    'department_record_write',
    session.adminEmail,
    session.adminId,
    session.headEmail,
    session.department,
    session.section,
    sessionToken,
    `Workspace record ${id} deleted (test mode)`,
  );

  const { data, error } = await supabaseAdmin
    .from('department_records')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    const missing = isMissingTable(error.code, error.message);
    return {
      statusCode: missing ? 409 : 400,
      body: {
        success: false,
        code: error.code,
        error: missing ? MISSING_TABLE_MESSAGE : error.message,
      },
    };
  }
  if (!data || data.length === 0) {
    return { statusCode: 404, body: { success: false, error: 'The workspace record was not found.' } };
  }

  return { statusCode: 200, body: { success: true, deleted: data.length } };
}
