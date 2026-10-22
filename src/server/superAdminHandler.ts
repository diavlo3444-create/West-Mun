import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  HeadStore,
  VALID_DEPARTMENTS,
  isGenderSeparatedDepartment,
  type DepartmentKey,
  type SectionKey,
  type HeadAccountRecord,
} from './headStore.ts';

// Authorized IT Super Admin Email (strictly enforced on server)
export const SUPER_ADMIN_EMAIL = 'diavlo3444@gmail.com';

export interface VerificationResult {
  authorized: boolean;
  statusCode: number;
  error?: string;
  code?: string;
  user?: {
    id: string;
    email?: string;
  };
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

/**
 * Strips password hash and salt from local records before sending over the wire
 */
function sanitizeHeadRecord(record: any) {
  const { passwordHash, salt, ...safe } = record;
  return safe;
}

/**
 * Retrieves the privileged Supabase Admin client using the server-side service_role key.
 * Never exposed to frontend clients.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';

  // Do not attempt if URL is a placeholder or missing
  if (!url || !serviceRoleKey || url.includes('YOUR-PROJECT')) {
    return null;
  }

  try {
    return createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (err) {
    console.error('[Supabase Admin Init Error]:', err);
    return null;
  }
}

/**
 * Server-side Supabase endpoint + public anon key, used only to verify a
 * caller's access token with Supabase Auth and to read the caller's own
 * public.admins row under RLS. The anon key is public by design; the
 * service-role key is never required for identity verification.
 */
function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const url = rawUrl.replace(/\/+$/, '');
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!/^https:\/\/[a-z0-9.-]+$/i.test(url) || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Verifies an access token with Supabase Auth itself. A random password, a
 * self-made JWT or a client-supplied email header can never pass this check.
 */
async function getSupabaseUserFromToken(
  token: string
): Promise<{ user: { id: string; email: string } | null; misconfigured: boolean }> {
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user?.id && data.user.email) {
        return {
          user: {
            id: data.user.id,
            email: data.user.email.trim().toLowerCase(),
          },
          misconfigured: false,
        };
      }
      return { user: null, misconfigured: false };
    } catch {
      return { user: null, misconfigured: false };
    }
  }

  const config = getSupabasePublicConfig();
  if (!config) return { user: null, misconfigured: true };

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return { user: null, misconfigured: false };

    const payload = (await response.json()) as { id?: string; email?: string };
    if (!payload?.id) return { user: null, misconfigured: false };

    return {
      user: { id: payload.id, email: String(payload.email || '').trim().toLowerCase() },
      misconfigured: false,
    };
  } catch {
    return { user: null, misconfigured: false };
  }
}

/**
 * Returns true only when the authenticated user has a row in public.admins.
 * With a service-role key this is a direct query. Without one, the caller's
 * own access token is used against PostgREST, so the existing
 * "admins read self" RLS policy is what decides the answer.
 */
async function isRegisteredAdmin(userId: string, accessToken: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    return !error && Boolean(data);
  }

  const config = getSupabasePublicConfig();
  if (!config) return false;

  try {
    const response = await fetch(
      `${config.url}/rest/v1/admins?select=user_id&user_id=eq.${encodeURIComponent(userId)}`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) return false;
    const rows = (await response.json()) as Array<{ user_id?: string }>;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Strict Server-Side Identity & Authorization Verification:
 * 1. The bearer token MUST be a live Supabase Auth access token.
 * 2. The user MUST have a row in public.admins.
 * 3. The IT Super Admin console additionally requires the allow-listed email.
 *
 * Client-supplied headers (x-admin-email), localStorage flags, email strings
 * and password-shaped bearer tokens are never treated as proof of identity.
 */
export async function verifyAdminCaller(
  authHeader?: string | null
): Promise<VerificationResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      statusCode: 401,
      code: 'MISSING_TOKEN',
      error: 'Authentication required. Sign in with Supabase Auth first.',
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      authorized: false,
      statusCode: 401,
      code: 'EMPTY_TOKEN',
      error: 'Empty authentication token provided.',
    };
  }

  const verified = await getSupabaseUserFromToken(token);

  if (verified.misconfigured) {
    return {
      authorized: false,
      statusCode: 503,
      code: 'AUTH_NOT_CONFIGURED',
      error:
        'Server authentication is not configured. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) in the hosting environment.',
    };
  }

  if (!verified.user) {
    return {
      authorized: false,
      statusCode: 401,
      code: 'INVALID_TOKEN',
      error: 'Your session is invalid or has expired. Please sign in again.',
    };
  }

  // The fixed Super Admin identity is authorized by the verified Supabase Auth token
  // itself. Do not require a duplicate public.admins row for this account.
  const isSuperAdmin = (verified.user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAdmin = isSuperAdmin || await isRegisteredAdmin(verified.user.id, token);
  if (!isAdmin) {
    return {
      authorized: false,
      statusCode: 403,
      code: 'NOT_ADMIN',
      error: `Access denied: ${verified.user.email || 'this account'} is not registered as an organiser in public.admins.`,
      user: verified.user,
    };
  }

  return {
    authorized: true,
    statusCode: 200,
    user: verified.user,
    isAdmin: true,
    isSuperAdmin,
  };
}

/**
 * Only the verified IT Super Admin (diavlo3444@gmail.com, present in
 * public.admins) may manage department-head accounts.
 */
export async function verifySuperAdminCaller(
  authHeader?: string | null
): Promise<VerificationResult> {
  const caller = await verifyAdminCaller(authHeader);
  if (!caller.authorized) return caller;

  if (!caller.isSuperAdmin) {
    return {
      authorized: false,
      statusCode: 403,
      code: 'NOT_SUPER_ADMIN',
      error: `Access Denied: Only ${SUPER_ADMIN_EMAIL} is authorized to manage department head accounts.`,
      user: caller.user,
      isAdmin: true,
      isSuperAdmin: false,
    };
  }

  return caller;
}

const HOSTED_ENV = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface HeadAssignmentInput {
  userId: string;
  email: string;
  headName: string;
  department: DepartmentKey;
  section: SectionKey | null;
  active: boolean;
}

interface HeadAssignmentResult {
  ok: boolean;
  code?: string;
  message: string;
}

function explainAssignmentError(error: { code?: string; message?: string; details?: string | null }): {
  code: string;
  message: string;
} {
  const raw = error.message || 'Unknown database error.';

  // PostgREST schema-cache error: a column used by the code is not on the
  // table that the Data API can see (or the cache is stale).
  if (error.code === 'PGRST204' || raw.includes('schema cache')) {
    const missing = raw.match(/'([^']+)' column/)?.[1];
    return {
      code: 'SCHEMA_MISMATCH',
      message: `public.department_heads is missing ${missing ? `the "${missing}" column` : 'a required column'} (${raw}). Run supabase/migration_department_heads_repair.sql in the Supabase SQL Editor, then retry the assignment. The Auth account is kept and will not be duplicated.`,
    };
  }

  if (error.code === '23505' || raw.toLowerCase().includes('duplicate key')) {
    return {
      code: 'SLOT_TAKEN',
      message: `${raw} Another head may already hold this department/division. Choose a different division, edit the existing head, or remove the conflicting assignment first.`,
    };
  }

  if (error.code === '23503') {
    return {
      code: 'AUTH_USER_MISSING',
      message: `${raw} The Supabase Auth user for this assignment no longer exists.`,
    };
  }

  return { code: error.code || 'ASSIGNMENT_FAILED', message: raw };
}

/**
 * Single source of truth for writing a head assignment. Upserts on user_id so
 * re-running the operation is idempotent and cannot create a second row or a
 * second Auth user.
 */
async function writeHeadAssignment(
  supabaseAdmin: SupabaseClient,
  input: HeadAssignmentInput
): Promise<HeadAssignmentResult> {
  const { error } = await supabaseAdmin.from('department_heads').upsert(
    {
      id: input.userId,
      user_id: input.userId,
      email: input.email,
      head_name: input.headName,
      department: input.department,
      section: input.section,
      active: input.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { ok: false, ...explainAssignmentError(error) };
  }

  // Read the row back so a silent no-op can never be reported as success.
  const { data, error: verifyErr } = await supabaseAdmin
    .from('department_heads')
    .select('user_id, department, section, active')
    .eq('user_id', input.userId)
    .maybeSingle();

  if (verifyErr) {
    return { ok: false, ...explainAssignmentError(verifyErr) };
  }

  if (!data) {
    return {
      ok: false,
      code: 'ASSIGNMENT_NOT_PERSISTED',
      message: 'The database accepted the request but no department_heads row with this user_id could be read back.',
    };
  }

  if (data.department !== input.department || (data.section || null) !== input.section) {
    return {
      ok: false,
      code: 'ASSIGNMENT_MISMATCH',
      message: `Stored assignment (${data.department}/${data.section || 'none'}) does not match the requested one (${input.department}/${input.section || 'none'}).`,
    };
  }

  return { ok: true, message: 'Assignment stored.' };
}

/**
 * Server-side creation of Department Head account.
 * Uses Supabase Admin API (service role) to invite/create user in auth.users
 * and records assignment in public.department_heads.
 */
export async function handleCreateHeadAccount(
  authHeader: string | null,
  body: {
    fullName?: string;
    email?: string;
    password?: string;
    department?: string;
    section?: string | null;
    active?: boolean;
    inviteOnly?: boolean;
  },
  _headers?: Record<string, string | string[] | undefined>,
  origin: string = 'https://west-mun.vercel.app'
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  const { fullName, email, password, department, section, active = true, inviteOnly } = body || {};

  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const isInvite = Boolean(inviteOnly) || !password || password.trim().length === 0;
  const cleanPassword = password ? password.trim() : '';

  const cleanDept = (department || '').trim().toLowerCase() as DepartmentKey;
  const cleanSec = section ? (section.trim().toLowerCase() as SectionKey) : null;

  if (!cleanName || cleanName.length < 2) {
    return { statusCode: 400, body: { success: false, error: 'Department head full name is required (min 2 characters).' } };
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { statusCode: 400, body: { success: false, error: 'Please provide a valid official email address.' } };
  }

  if (!isInvite && cleanPassword.length < 8) {
    return { statusCode: 400, body: { success: false, error: 'Password must be at least 8 characters in length.' } };
  }

  if (!VALID_DEPARTMENTS.includes(cleanDept)) {
    return {
      statusCode: 400,
      body: { success: false, error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}.` },
    };
  }

  if (isGenderSeparatedDepartment(cleanDept)) {
    if (cleanSec !== 'male' && cleanSec !== 'female') {
      return {
        statusCode: 400,
        body: { success: false, error: `Department "${cleanDept}" requires division to be either "male" or "female".` },
      };
    }
  } else {
    // Non-gender separated departments must have null section
    if (cleanSec !== null) {
      return {
        statusCode: 400,
        body: { success: false, error: `Department "${cleanDept}" does not use gender divisions; section must be None.` },
      };
    }
  }

  const supabaseAdmin = getSupabaseAdmin();

  // ---------------------------------------------------------------------------
  // Case A: Supabase Admin Client is Available (Production Flow)
  // ---------------------------------------------------------------------------
  if (supabaseAdmin) {
    try {
      let authUser: any = null;
      let invitationLink: string | undefined;

      if (isInvite) {
        // 1. Generate invitation link via Supabase Auth Admin API
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: cleanEmail,
          options: {
            redirectTo: `${origin}/head?type=invite`,
            data: {
              full_name: cleanName,
              department: cleanDept,
              section: cleanSec,
            },
          },
        });

        if (!linkErr && linkData?.user) {
          authUser = linkData.user;
          invitationLink = linkData.properties?.action_link;
        } else if (linkErr && linkErr.message?.toLowerCase().includes('already')) {
          // If user already exists in auth.users, find their UID and generate a password recovery link
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existing = listData?.users?.find(
            (u) => u.email?.toLowerCase().trim() === cleanEmail
          );
          if (existing) {
            authUser = existing;
            const { data: recData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: cleanEmail,
              options: {
                redirectTo: `${origin}/head?type=recovery`,
              },
            });
            invitationLink = recData?.properties?.action_link;
          } else {
            throw new Error(linkErr.message);
          }
        } else {
          // Fallback to direct inviteUserByEmail
          const { data: invData, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            cleanEmail,
            {
              data: {
                full_name: cleanName,
                department: cleanDept,
                section: cleanSec,
              },
              redirectTo: `${origin}/head?type=invite`,
            }
          );
          if (invErr) {
            throw new Error(invErr.message || 'Failed to send Supabase Auth invitation email.');
          }
          authUser = invData?.user;
        }
      } else {
        // Direct password provisioning in Supabase Auth
        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            department: cleanDept,
            section: cleanSec,
          },
        });

        if (createErr) {
          if (createErr.message?.toLowerCase().includes('already')) {
            // User already registered in Supabase Auth: update their password and metadata
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const existing = listData?.users?.find(
              (u) => u.email?.toLowerCase().trim() === cleanEmail
            );
            if (existing) {
              authUser = existing;
              await supabaseAdmin.auth.admin.updateUserById(existing.id, {
                password: cleanPassword,
                user_metadata: {
                  full_name: cleanName,
                  department: cleanDept,
                  section: cleanSec,
                },
              });
            } else {
              throw new Error(createErr.message);
            }
          } else {
            throw new Error(createErr.message);
          }
        } else {
          authUser = createData.user;
        }
      }

      const userId = authUser.id;

      // 2. Upsert assignment into public.department_heads table.
      // The canonical schema (see supabase/migration_department_heads_repair.sql)
      // keys on user_id and stores email/head_name/department/section/active.
      const assignment = await writeHeadAssignment(supabaseAdmin, {
        userId,
        email: cleanEmail,
        headName: cleanName,
        department: cleanDept,
        section: cleanSec,
        active,
      });

      if (!assignment.ok) {
        console.error('[Supabase DB Error] department_heads upsert failed:', assignment.message);
        // The Supabase Auth user was created (or already existed) and is NOT
        // duplicated on retry: action=assign reuses this userId.
        return {
          statusCode: 400,
          body: {
            success: false,
            retryable: true,
            userId,
            invitationLink,
            code: assignment.code,
            error: `Supabase Auth account ready (UID: ${userId}), but the department assignment failed: ${assignment.message}`,
          },
        };
      }

      // Keep the local development store in sync. Never on hosted deployments
      // (Supabase Auth is the only production authentication path) and never
      // with a predictable fallback password.
      if (!HOSTED_ENV) {
        try {
          HeadStore.create({
            id: userId,
            fullName: cleanName,
            email: cleanEmail,
            password: cleanPassword || globalThis.crypto.randomUUID(),
            department: cleanDept,
            section: cleanSec,
            active,
          });
        } catch {
          // Non-critical local sync failure
        }
      }

      return {
        statusCode: 201,
        body: {
          success: true,
          message: isInvite
            ? `Department head account for ${cleanName} provisioned in Supabase Auth with invitation link.`
            : `Department head account for ${cleanName} (${cleanDept}${cleanSec ? ` - ${cleanSec.toUpperCase()}` : ''}) was successfully provisioned in Supabase Auth.`,
          head: {
            id: userId,
            user_id: userId,
            email: cleanEmail,
            head_name: cleanName,
            department: cleanDept,
            section: cleanSec,
            active,
            created_at: new Date().toISOString(),
          },
          invitationLink,
          temporaryPassword: isInvite ? undefined : cleanPassword,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to provision department head in Supabase Auth.';
      console.error('[Supabase Head Provisioning Error]:', msg);
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  // ---------------------------------------------------------------------------
  // Case B: Supabase Admin Client Missing (SUPABASE_SERVICE_ROLE_KEY Not Set)
  // ---------------------------------------------------------------------------
  if (HOSTED_ENV) {
    return {
      statusCode: 503,
      body: {
        success: false,
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel environment variables. To allow the website to create real Supabase Auth accounts and invitations, please add SUPABASE_SERVICE_ROLE_KEY from your Supabase Dashboard (Project Settings > API > service_role secret) to your Vercel Project Settings.',
        code: 'MISSING_SERVICE_ROLE_KEY',
      },
    };
  }

  // Local development / fallback mode using HeadStore
  try {
    const { head } = HeadStore.create({
      fullName: cleanName,
      email: cleanEmail,
      password: cleanPassword || globalThis.crypto.randomUUID(),
      department: cleanDept,
      section: cleanSec,
      active,
    });

    let invitationLink: string | undefined;
    if (isInvite) {
      const { token } = HeadStore.createResetToken(head.id);
      invitationLink = `${origin}/head?resetToken=${token}`;
    }

    return {
      statusCode: 201,
      body: {
        success: true,
        message: isInvite
          ? `[Dev Fallback] Head account for ${cleanName} provisioned with invitation link.`
          : `[Dev Fallback] Head account for ${cleanName} provisioned.`,
        head: sanitizeHeadRecord(head),
        invitationLink,
        temporaryPassword: isInvite ? undefined : cleanPassword,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create department head account.';
    return { statusCode: 400, body: { success: false, error: msg } };
  }
}

/**
 * Recoverable assignment step. If Auth user creation succeeded but the
 * department_heads write failed, the IT Super Admin retries here with the SAME
 * userId. No Auth user is created, updated or duplicated.
 */
export async function handleAssignHead(
  authHeader: string | null,
  body: {
    userId?: string;
    email?: string;
    fullName?: string;
    department?: string;
    section?: string | null;
    active?: boolean;
  }
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'MISSING_SERVICE_ROLE_KEY',
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not configured, so department assignments cannot be written. Add it in the hosting environment variables.',
      },
    };
  }

  const requestedId = (body.userId || '').trim();
  const requestedEmail = (body.email || '').trim().toLowerCase();

  if (!requestedId && !requestedEmail) {
    return {
      statusCode: 400,
      body: { success: false, code: 'MISSING_TARGET', error: 'Provide the Auth user ID (preferred) or email of the head to assign.' },
    };
  }

  // Resolve the existing Supabase Auth user. Never create one here.
  let authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;

  if (requestedId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(requestedId);
    if (error || !data?.user) {
      return {
        statusCode: 404,
        body: {
          success: false,
          code: 'AUTH_USER_NOT_FOUND',
          error: `No Supabase Auth user exists with ID ${requestedId}. Create the head account first.`,
        },
      };
    }
    authUser = data.user;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      return { statusCode: 400, body: { success: false, code: 'AUTH_LOOKUP_FAILED', error: error.message } };
    }
    authUser = (data?.users || []).find((u) => u.email?.trim().toLowerCase() === requestedEmail) || null;
    if (!authUser) {
      return {
        statusCode: 404,
        body: {
          success: false,
          code: 'AUTH_USER_NOT_FOUND',
          error: `No Supabase Auth user exists with email ${requestedEmail}. Create the head account first.`,
        },
      };
    }
  }

  const cleanName = (body.fullName || String(authUser.user_metadata?.full_name || '')).trim();
  const cleanDept = (body.department || '').trim().toLowerCase() as DepartmentKey;
  const cleanSec = body.section ? (body.section.trim().toLowerCase() as SectionKey) : null;
  const active = body.active !== false;

  if (!VALID_DEPARTMENTS.includes(cleanDept)) {
    return {
      statusCode: 400,
      body: { success: false, code: 'INVALID_DEPARTMENT', error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}.` },
    };
  }

  if (isGenderSeparatedDepartment(cleanDept)) {
    if (cleanSec !== 'male' && cleanSec !== 'female') {
      return {
        statusCode: 400,
        body: { success: false, code: 'SECTION_REQUIRED', error: `Department "${cleanDept}" requires division to be either "male" or "female".` },
      };
    }
  } else if (cleanSec !== null) {
    return {
      statusCode: 400,
      body: { success: false, code: 'INVALID_SECTION', error: `Department "${cleanDept}" does not use gender divisions; section must be None.` },
    };
  }

  if (!authUser.email) {
    return {
      statusCode: 400,
      body: { success: false, code: 'AUTH_USER_EMAIL_MISSING', error: 'The Supabase Auth user has no email address, so it cannot be assigned as a department head.' },
    };
  }

  const assignment = await writeHeadAssignment(supabaseAdmin, {
    userId: authUser.id,
    email: authUser.email.trim().toLowerCase(),
    headName: cleanName || authUser.email,
    department: cleanDept,
    section: cleanSec,
    active,
  });

  if (!assignment.ok) {
    return {
      statusCode: 400,
      body: {
        success: false,
        retryable: true,
        userId: authUser.id,
        code: assignment.code,
        error: assignment.message,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      message: `Department assignment saved for ${authUser.email}. Existing Auth user reused (no duplicate created).`,
      head: {
        id: authUser.id,
        user_id: authUser.id,
        email: authUser.email,
        head_name: cleanName || authUser.email,
        department: cleanDept,
        section: cleanSec,
        active,
      },
    },
  };
}

/**
 * Server-side list of all department heads
 */
export async function handleListHeads(authHeader: string | null) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      // 1. Fetch department_heads rows
      const { data: deptHeads, error: deptErr } = await supabaseAdmin
        .from('department_heads')
        .select('*')
        .order('created_at', { ascending: false });

      if (deptErr) {
        throw new Error(deptErr.message);
      }

      // 2. Fetch auth.users to supplement email & last_sign_in_at
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUsersMap = new Map<string, any>();
      (userData?.users || []).forEach((u) => {
        authUsersMap.set(u.id, u);
      });

      const merged = (deptHeads || []).map((row: any) => {
        const uId = row.user_id || row.id;
        const authUser = authUsersMap.get(uId);
        return {
          id: uId,
          user_id: uId,
          email: row.email || authUser?.email || '',
          head_name: row.head_name || authUser?.user_metadata?.full_name || row.email || '',
          department: row.department,
          section: row.section || null,
          active: row.active !== false,
          created_at: row.created_at || authUser?.created_at,
          updated_at: row.updated_at,
          last_sign_in_at: authUser?.last_sign_in_at || null,
          email_confirmed_at: authUser?.email_confirmed_at || null,
        };
      });

      return { statusCode: 200, body: { success: true, heads: merged } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to read department_heads.';
      console.error('[Supabase List Heads Failed]:', message);
      if (HOSTED_ENV) {
        return {
          statusCode: 503,
          body: { success: false, code: 'HEADS_QUERY_FAILED', error: message },
        };
      }
      // Local development without a reachable database: fall back to HeadStore.
    }
  }

  if (HOSTED_ENV) {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'MISSING_SERVICE_ROLE_KEY',
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so the department head registry cannot be read.',
      },
    };
  }

  const heads = HeadStore.getAll().map(sanitizeHeadRecord);
  return { statusCode: 200, body: { success: true, heads } };
}

/**
 * Server-side update of department head assignment or active status
 */
export async function handleUpdateHead(
  authHeader: string | null,
  headId: string,
  body: {
    fullName?: string;
    department?: string;
    section?: string | null;
    active?: boolean;
  }
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  if (!headId || !UUID_REGEX.test(headId)) {
    return { statusCode: 400, body: { success: false, code: 'INVALID_HEAD_ID', error: 'A valid head user UUID is required.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      const { data: current, error: currentErr } = await supabaseAdmin
        .from('department_heads')
        .select('department, section, head_name')
        .eq('user_id', headId)
        .maybeSingle();

      if (currentErr) {
        return {
          statusCode: 400,
          body: { success: false, code: currentErr.code, error: explainAssignmentError(currentErr).message },
        };
      }

      if (!current) {
        return {
          statusCode: 404,
          body: { success: false, code: 'HEAD_NOT_FOUND', error: 'No department_heads row exists for this user.' },
        };
      }

      const nextDept = ((body.department || current.department) as string).trim().toLowerCase() as DepartmentKey;
      if (!VALID_DEPARTMENTS.includes(nextDept)) {
        return {
          statusCode: 400,
          body: { success: false, code: 'INVALID_DEPARTMENT', error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}.` },
        };
      }

      const requestedSection =
        body.section !== undefined
          ? (body.section ? String(body.section).trim().toLowerCase() as SectionKey : null)
          : ((current.section || null) as SectionKey | null);

      let nextSection: SectionKey | null = null;
      if (isGenderSeparatedDepartment(nextDept)) {
        if (requestedSection !== 'male' && requestedSection !== 'female') {
          return {
            statusCode: 400,
            body: { success: false, code: 'SECTION_REQUIRED', error: `Department "${nextDept}" requires division to be either "male" or "female".` },
          };
        }
        nextSection = requestedSection;
      }

      const updateData: Record<string, any> = {
        department: nextDept,
        section: nextSection,
        updated_at: new Date().toISOString(),
      };
      if (body.active !== undefined) updateData.active = body.active;
      if (typeof body.fullName === 'string' && body.fullName.trim()) updateData.head_name = body.fullName.trim();

      // Canonical rows are keyed by the Auth UUID in user_id.
      const { data: updatedRows, error: updateErr } = await supabaseAdmin
        .from('department_heads')
        .update(updateData)
        .eq('user_id', headId)
        .select('user_id');

      if (updateErr) {
        return {
          statusCode: 400,
          body: { success: false, code: updateErr.code, error: explainAssignmentError(updateErr).message },
        };
      }

      if (!updatedRows || updatedRows.length === 0) {
        return {
          statusCode: 404,
          body: { success: false, code: 'HEAD_NOT_FOUND', error: 'No department_heads row exists for this user.' },
        };
      }

      // Assignment active status controls portal authorization only.
      // Supabase Auth bans/unbans must use a separate explicit suspension action;
      // editing or deactivating an assignment must never change Auth account status.

      if (body.fullName !== undefined || body.department !== undefined) {
        const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(headId, {
          user_metadata: {
            full_name: updateData.head_name ?? current.head_name,
            department: nextDept,
            section: nextSection,
          },
        });
        if (metaErr) {
          console.warn('[Supabase Update Head Metadata Warning]:', metaErr.message);
        }
      }

      // Update local HeadStore if present
      try {
        HeadStore.update(headId, {
          fullName: body.fullName,
          department: nextDept,
          section: nextSection,
          active: body.active,
        });
      } catch {}

      return {
        statusCode: 200,
        body: {
          success: true,
          message: 'Department head assignment updated successfully in Supabase.',
          head: {
            user_id: headId,
            department: nextDept,
            section: nextSection,
            active: body.active !== undefined ? body.active : undefined,
          },
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update department head.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  if (HOSTED_ENV) {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'MISSING_SERVICE_ROLE_KEY',
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so head assignments cannot be updated.',
      },
    };
  }

  // Local development fallback
  try {
    const updated = HeadStore.update(headId, {
      fullName: body.fullName,
      department: body.department as DepartmentKey,
      section: body.section as SectionKey | null,
      active: body.active,
    });

    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Department head assignment updated successfully.',
        head: sanitizeHeadRecord(updated),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update department head.';
    return { statusCode: 400, body: { success: false, error: msg } };
  }
}

/**
 * Server-side password reset or recovery invitation generation
 */
export async function handleResetPassword(
  authHeader: string | null,
  headId: string,
  body: {
    newPassword?: string;
    generateLink?: boolean;
    email?: string;
  },
  _headers?: Record<string, string | string[] | undefined>,
  origin: string = 'https://west-mun.vercel.app'
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  if (!headId || !UUID_REGEX.test(headId)) {
    return { statusCode: 400, body: { success: false, code: 'INVALID_HEAD_ID', error: 'A valid head user UUID is required.' } };
  }

  const { newPassword, generateLink, email } = body || {};

  if (typeof newPassword === 'string' && newPassword.trim().length > 0 && newPassword.trim().length < 8) {
    return {
      statusCode: 400,
      body: { success: false, code: 'WEAK_PASSWORD', error: 'Password must be at least 8 characters in length.' },
    };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      if (newPassword && newPassword.trim().length >= 8) {
        // Direct password change in Supabase Auth
        const { error: passErr } = await supabaseAdmin.auth.admin.updateUserById(headId, {
          password: newPassword.trim(),
        });
        if (passErr) throw new Error(passErr.message);

        return {
          statusCode: 200,
          body: {
            success: true,
            message: 'Password successfully updated in Supabase Auth for department head.',
          },
        };
      }

      // Generate recovery / password reset link
      let targetEmail = email;
      if (!targetEmail) {
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(headId);
        targetEmail = uData?.user?.email;
      }

      if (!targetEmail) {
        throw new Error('Unable to resolve head email address for password reset.');
      }

      const { data: recData, error: recErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: targetEmail,
        options: {
          redirectTo: `${origin}/head?type=recovery`,
        },
      });

      if (recErr) throw new Error(recErr.message);

      // Also trigger Supabase email reset
      await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${origin}/head?type=recovery`,
      }).catch(() => null);

      return {
        statusCode: 200,
        body: {
          success: true,
          actionLink: recData?.properties?.action_link,
          message: 'Password reset link generated and dispatched via Supabase Auth.',
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing Supabase password reset.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  if (HOSTED_ENV) {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'MISSING_SERVICE_ROLE_KEY',
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so passwords cannot be reset.',
      },
    };
  }

  // Local development fallback
  try {
    if (newPassword && newPassword.trim().length > 0) {
      HeadStore.setPassword(headId, newPassword.trim());
      return {
        statusCode: 200,
        body: {
          success: true,
          message: 'Password successfully updated for department head.',
        },
      };
    }

    if (generateLink) {
      const { token } = HeadStore.createResetToken(headId);
      const actionLink = `${origin}/head?resetToken=${token}`;

      return {
        statusCode: 200,
        body: {
          success: true,
          actionLink,
          message: 'Secure password reset invitation link generated successfully (valid for 48 hours).',
        },
      };
    }

    return {
      statusCode: 400,
      body: { success: false, error: 'Please provide either a newPassword or select generateLink.' },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error executing password reset.';
    return { statusCode: 400, body: { success: false, error: msg } };
  }
}

/**
 * Server-side revocation / deletion of department head
 */
export async function handleDeleteHead(
  authHeader: string | null,
  headId: string
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  if (!headId || !UUID_REGEX.test(headId)) {
    return { statusCode: 400, body: { success: false, code: 'INVALID_HEAD_ID', error: 'A valid head user UUID is required.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(headId);
      if (targetUser?.user?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return { statusCode: 400, body: { success: false, error: 'Primary IT Super Admin account cannot be deleted.' } };
      }

      // Transfer and disable any reusable signup link created by this identity before deleting it.
      const links = await supabaseAdmin.from('wm_eb_signup_links').update({ created_by: auth.user.id, active: false }).eq('created_by', headId);
      if (links.error) return { statusCode: 400, body: { success: false, error: `Could not safely transfer signup-link ownership: ${links.error.message}` } };

      // Remove every WEST MUN access assignment tied to this identity, then delete Auth.
      const passDelete = await supabaseAdmin.from('wm_qr_passes').delete().eq('user_id', headId);
      if (passDelete.error) return { statusCode: 400, body: { success: false, error: `Could not remove the account's EB/pass record: ${passDelete.error.message}` } };

      const adminDelete = await supabaseAdmin.from('admins').delete().eq('user_id', headId);
      if (adminDelete.error) return { statusCode: 400, body: { success: false, error: `Could not remove the account's admin assignment: ${adminDelete.error.message}` } };

      const headDelete = await supabaseAdmin.from('department_heads').delete().eq('user_id', headId);
      if (headDelete.error) return { statusCode: 400, body: { success: false, code: headDelete.error.code, error: explainAssignmentError(headDelete.error).message } };

      // Unlink any Co-Heads assigned to this head so they are not attached to a deleted identity.
      const unlinkCoHeads = await supabaseAdmin.from('wm_qr_passes').update({ reporting_head_id: null }).eq('reporting_head_id', headId);
      if (unlinkCoHeads.error) return { statusCode: 400, body: { success: false, error: `Head assignment was removed, but Co-Head links could not be cleared: ${unlinkCoHeads.error.message}` } };

      try { HeadStore.delete(headId); } catch {}

      if (targetUser?.user) {
        const authDelete = await supabaseAdmin.auth.admin.deleteUser(headId);
        if (authDelete.error) {
          console.error('[SuperAdmin] Auth deletion failed for department head', { code: authDelete.error.name });
          await supabaseAdmin.auth.admin.updateUserById(headId, { ban_duration: '876000h', app_metadata: { wm_role: 'deleted', wm_access_revoked: true } }).catch(() => null);
          return { statusCode: 500, body: { success: false, error: 'Role assignments were removed. Supabase could not fully delete the login, so access was revoked and the deletion must be retried.' } };
        }
      }

      return { statusCode: 200, body: { success: true, message: 'Department head account and Supabase login permanently deleted.' } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete head record in Supabase.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  if (HOSTED_ENV) {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'MISSING_SERVICE_ROLE_KEY',
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured, so head assignments cannot be removed.',
      },
    };
  }

  try {
    HeadStore.delete(headId);
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Department head assignment removed successfully. Portal access has been revoked.',
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete head record.';
    return { statusCode: 400, body: { success: false, error: msg } };
  }
}

// ===========================================================================
// ADMIN ACCOUNTS MANAGEMENT (Super Admin Exclusive)
// ===========================================================================

export interface AdminAccountRecord {
  user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin';
  active: boolean;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
}

// In-memory / local fallback store for development and automated mock testing
const localAdminsStore = new Map<string, AdminAccountRecord>([
  [
    '11111111-1111-4111-8111-111111111111',
    {
      user_id: '11111111-1111-4111-8111-111111111111',
      email: SUPER_ADMIN_EMAIL,
      full_name: 'IT Super Admin',
      role: 'super_admin',
      active: true,
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    },
  ],
]);

export async function handleListAdmins(authHeader?: string | null): Promise<{
  statusCode: number;
  body: { success: boolean; admins?: AdminAccountRecord[]; error?: string; code?: string };
}> {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      // 1. Fetch public.admins
      const { data: adminRows, error: adminErr } = await supabaseAdmin
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminErr) {
        return { statusCode: 400, body: { success: false, error: adminErr.message } };
      }

      // 2. Fetch users from Auth to obtain last_sign_in_at & metadata fallback
      const { data: usersData } = await supabaseAdmin.auth.admin
        .listUsers({ page: 1, perPage: 1000 })
        .catch(() => ({ data: null }));
      const userMap = new Map((usersData?.users || []).map((u: any) => [u.id, u]));

      const admins: AdminAccountRecord[] = (adminRows || []).map((row: any) => {
        const authUser = userMap.get(row.user_id);
        const email = String(row.email || authUser?.email || '').trim().toLowerCase();
        const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase() || row.role === 'super_admin';

        return {
          user_id: row.user_id,
          email,
          full_name:
            row.full_name ||
            authUser?.user_metadata?.full_name ||
            (isSuper ? 'IT Super Admin' : 'Admin Organiser'),
          role: isSuper ? 'super_admin' : 'admin',
          active: row.active !== false,
          created_at: row.created_at || authUser?.created_at || new Date().toISOString(),
          updated_at: row.updated_at,
          last_sign_in_at: authUser?.last_sign_in_at || null,
        };
      });

      // Ensure Super Admin is always present in list even if not seeded yet
      if (!admins.some((a) => a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())) {
        admins.unshift({
          user_id: auth.user.id,
          email: SUPER_ADMIN_EMAIL,
          full_name: 'IT Super Admin',
          role: 'super_admin',
          active: true,
          created_at: new Date().toISOString(),
        });
      }

      return { statusCode: 200, body: { success: true, admins } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to list admin accounts.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  // Local fallback
  return {
    statusCode: 200,
    body: {
      success: true,
      admins: Array.from(localAdminsStore.values()),
    },
  };
}

export async function handleCreateAdmin(
  authHeader: string | null,
  body: any
): Promise<{
  statusCode: number;
  body: {
    success: boolean;
    message?: string;
    admin?: AdminAccountRecord;
    error?: string;
    code?: string;
  };
}> {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, code: auth.code, error: auth.error } };
  }

  const cleanName = String(body.fullName || body.name || '').trim();
  const cleanEmail = String(body.email || '').trim().toLowerCase();
  const cleanPassword = String(body.password || '').trim();

  if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Full name must be between 2 and 100 characters.' },
    };
  }

  const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRe.test(cleanEmail) || cleanEmail.length > 120) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Please provide a valid email address.' },
    };
  }

  if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Cannot create or modify the primary IT Super Admin account.' },
    };
  }

  if (!cleanPassword || cleanPassword.length < 8) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Password must be at least 8 characters long.' },
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      // 1. Check if admin already exists in public.admins
      const { data: existingAdminRow } = await supabaseAdmin
        .from('admins')
        .select('user_id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingAdminRow) {
        return {
          statusCode: 400,
          body: {
            success: false,
            code: 'ADMIN_EXISTS',
            error: `An administrator account with email "${cleanEmail}" already exists.`,
          },
        };
      }

      // 2. Check if user already exists in auth.users
      let authUserId: string;
      const { data: usersList } = await supabaseAdmin.auth.admin
        .listUsers({ page: 1, perPage: 1000 })
        .catch(() => ({ data: null }));
      const existingAuth = (usersList?.users || []).find(
        (u: any) => u.email?.toLowerCase().trim() === cleanEmail
      );

      if (existingAuth) {
        authUserId = existingAuth.id;
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            role: 'admin',
          },
        });
        if (updateErr) {
          return { statusCode: 400, body: { success: false, error: updateErr.message } };
        }
      } else {
        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            role: 'admin',
          },
        });

        if (createErr || !createData?.user) {
          return {
            statusCode: 400,
            body: {
              success: false,
              error: createErr?.message || 'Failed to create user in Supabase Auth.',
            },
          };
        }
        authUserId = createData.user.id;
      }

      // 3. Upsert into public.admins with normal Admin role
      const nowIso = new Date().toISOString();
      const insertPayload: any = {
        user_id: authUserId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'admin', // Strict normal Admin
        active: true,
        updated_at: nowIso,
      };

      const { error: insertErr } = await supabaseAdmin
        .from('admins')
        .upsert(insertPayload, { onConflict: 'user_id' });

      if (insertErr) {
        // Fallback for pre-migration schema
        if (insertErr.code === 'PGRST204' || insertErr.message?.includes('column')) {
          const { error: fallbackErr } = await supabaseAdmin
            .from('admins')
            .upsert({ user_id: authUserId, email: cleanEmail }, { onConflict: 'user_id' });
          if (fallbackErr) {
            return { statusCode: 400, body: { success: false, error: fallbackErr.message } };
          }
        } else {
          return { statusCode: 400, body: { success: false, error: insertErr.message } };
        }
      }

      // 4. Verify persistence
      const { data: verifiedRow } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      const createdAdmin: AdminAccountRecord = {
        user_id: authUserId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'admin',
        active: true,
        created_at: verifiedRow?.created_at || nowIso,
      };

      return {
        statusCode: 201,
        body: {
          success: true,
          message: `Administrator account for ${cleanName} (${cleanEmail}) has been created successfully.`,
          admin: createdAdmin,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to provision admin account in Supabase.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  // Local fallback
  const newId = globalThis.crypto.randomUUID();
  const createdAdmin: AdminAccountRecord = {
    user_id: newId,
    email: cleanEmail,
    full_name: cleanName,
    role: 'admin',
    active: true,
    created_at: new Date().toISOString(),
  };
  localAdminsStore.set(newId, createdAdmin);

  return {
    statusCode: 201,
    body: {
      success: true,
      message: `[Dev Fallback] Admin account for ${cleanName} created.`,
      admin: createdAdmin,
    },
  };
}

export async function handleToggleAdmin(
  authHeader: string | null,
  targetId: string,
  body: any
): Promise<{ statusCode: number; body: { success: boolean; active?: boolean; message?: string; error?: string } }> {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  if (!targetId) {
    return { statusCode: 400, body: { success: false, error: 'Admin user ID is required.' } };
  }

  if (targetId === auth.user.id) {
    return { statusCode: 400, body: { success: false, error: 'Super Admin cannot deactivate their own account.' } };
  }

  const active = Boolean(body.active);
  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      const { data: targetAdmin } = await supabaseAdmin
        .from('admins')
        .select('email')
        .eq('user_id', targetId)
        .maybeSingle();

      if (targetAdmin && targetAdmin.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return { statusCode: 400, body: { success: false, error: 'Primary IT Super Admin account cannot be deactivated.' } };
      }

      const { error: updateErr } = await supabaseAdmin
        .from('admins')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('user_id', targetId);

      if (updateErr) {
        return { statusCode: 400, body: { success: false, error: updateErr.message } };
      }

      return {
        statusCode: 200,
        body: {
          success: true,
          active,
          message: `Admin account has been ${active ? 'reactivated' : 'deactivated'}.`,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update admin status.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  // Local fallback
  const localTarget = localAdminsStore.get(targetId);
  if (localTarget) {
    localTarget.active = active;
  }
  return {
    statusCode: 200,
    body: {
      success: true,
      active,
      message: `Admin account has been ${active ? 'reactivated' : 'deactivated'}.`,
    },
  };
}

export async function handleDeleteAdmin(
  authHeader: string | null,
  targetId: string
): Promise<{ statusCode: number; body: { success: boolean; message?: string; error?: string } }> {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  if (!targetId) {
    return { statusCode: 400, body: { success: false, error: 'Admin user ID is required.' } };
  }

  if (targetId === auth.user.id) {
    return { statusCode: 400, body: { success: false, error: 'Super Admin cannot delete their own account.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      const { data: targetAdmin } = await supabaseAdmin
        .from('admins')
        .select('email')
        .eq('user_id', targetId)
        .maybeSingle();

      if (targetAdmin && targetAdmin.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return { statusCode: 400, body: { success: false, error: 'Primary IT Super Admin account cannot be deleted.' } };
      }

      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(targetId);
      if (targetUser?.user?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        return { statusCode: 400, body: { success: false, error: 'Primary IT Super Admin account cannot be deleted.' } };
      }

      // Preserve signup-link auditability while allowing the creator's Auth identity to be deleted.
      const links = await supabaseAdmin.from('wm_eb_signup_links').update({ created_by: auth.user.id, active: false }).eq('created_by', targetId);
      if (links.error) return { statusCode: 400, body: { success: false, error: `Could not safely transfer signup-link ownership: ${links.error.message}` } };

      const passDelete = await supabaseAdmin.from('wm_qr_passes').delete().eq('user_id', targetId);
      if (passDelete.error) return { statusCode: 400, body: { success: false, error: `Could not remove the account's EB/pass record: ${passDelete.error.message}` } };

      const headDelete = await supabaseAdmin.from('department_heads').delete().eq('user_id', targetId);
      if (headDelete.error) return { statusCode: 400, body: { success: false, error: `Could not remove the account's head assignment: ${headDelete.error.message}` } };

      const { error: deleteErr } = await supabaseAdmin.from('admins').delete().eq('user_id', targetId);
      if (deleteErr) return { statusCode: 400, body: { success: false, error: deleteErr.message } };

      if (targetUser?.user) {
        const authDelete = await supabaseAdmin.auth.admin.deleteUser(targetId);
        if (authDelete.error) {
          console.error('[SuperAdmin] Auth deletion failed for administrator', { code: authDelete.error.name });
          await supabaseAdmin.auth.admin.updateUserById(targetId, { ban_duration: '876000h', app_metadata: { wm_role: 'deleted', wm_access_revoked: true } }).catch(() => null);
          return { statusCode: 500, body: { success: false, error: 'Role assignments were removed. Supabase could not fully delete the login, so access was revoked and the deletion must be retried.' } };
        }
      }

      return { statusCode: 200, body: { success: true, message: 'Administrator account and Supabase login permanently deleted.' } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete admin record.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  // Local fallback
  localAdminsStore.delete(targetId);
  return {
    statusCode: 200,
    body: { success: true, message: 'Admin account removed successfully.' },
  };
}

// ============================================================================
// SUPER IT TEST MODE: LOGIN AS HEAD (Exclusive to diavlo3444@gmail.com)
// ============================================================================

export interface TestSessionRecord {
  sessionId: string;
  adminId: string;
  adminEmail: string;
  headId: string;
  headEmail: string;
  headName: string;
  department: DepartmentKey;
  section: SectionKey | null;
  demoRole?: 'co_head' | 'marketing' | 'design';
  createdAt: number;
  expiresAt: number;
  revoked: boolean;
  userAgent?: string;
  ip?: string;
}

export interface TestAuditLogRecord {
  id: string;
  timestamp: string;
  adminEmail: string;
  adminId: string;
  action:
    | 'create_test_session'
    | 'consume_launch_credential'
    | 'access_data'
    | 'update_record'
    | 'department_record_write'
    | 'operations_studio_access'
    | 'terminate_test_session';
  headEmail: string;
  headDepartment: string;
  headSection: string | null;
  sessionId: string;
  details?: string;
}

// In-memory test sessions & single-use launch tickets (short 15m TTL)
const activeTestSessions = new Map<string, TestSessionRecord>();
const testLaunchTickets = new Map<string, { sessionId: string; expiresAt: number }>();
const testAuditLogs: TestAuditLogRecord[] = [];
const revokedTestSessionIds = new Set<string>();

/**
 * Secret key used to sign and verify Super IT test tokens.
 * Derived from server-only secrets so clients can never forge them.
 */
export function getTestTokenSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'westmun-secret-super-it-test-2027-diavlo3444'
  );
}

/**
 * Signs a dedicated Super IT test session into an HMAC-SHA256 token.
 * Stateless and valid across all Vercel serverless containers.
 */
export function signTestSessionToken(session: TestSessionRecord): string {
  const secret = getTestTokenSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = {
    v: 1,
    type: 'super_it_test_session',
    sessionId: session.sessionId,
    adminId: session.adminId,
    adminEmail: session.adminEmail,
    headId: session.headId,
    headEmail: session.headEmail,
    headName: session.headName,
    department: session.department,
    section: session.section,
    demoRole: session.demoRole,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `wmtest_${header}.${body}.${signature}`;
}

/**
 * Verifies a cryptographically signed Super IT test token.
 */
export function verifySignedTestToken(token: string): TestSessionRecord | null {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim();
  if (!clean.startsWith('wmtest_')) return null;
  const raw = clean.slice('wmtest_'.length);
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const secret = getTestTokenSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || payload.type !== 'super_it_test_session') return null;

    // Strict server-side expiration
    if (!payload.expiresAt || payload.expiresAt <= Date.now()) {
      return null;
    }

    // Verify admin email is strictly diavlo3444@gmail.com
    if (String(payload.adminEmail || '').toLowerCase().trim() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return null;
    }

    // Check revocation
    if (payload.sessionId && revokedTestSessionIds.has(payload.sessionId)) {
      return null;
    }

    return {
      sessionId: payload.sessionId,
      adminId: payload.adminId,
      adminEmail: payload.adminEmail,
      headId: payload.headId,
      headEmail: payload.headEmail,
      headName: payload.headName,
      department: payload.department,
      section: payload.section,
      demoRole: payload.demoRole,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
      revoked: false,
    };
  } catch {
    return null;
  }
}

export function recordTestAuditLog(
  action: TestAuditLogRecord['action'],
  adminEmail: string,
  adminId: string,
  headEmail: string,
  headDept: string,
  headSec: string | null,
  sessionId: string,
  details?: string
) {
  const entry: TestAuditLogRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    adminEmail,
    adminId,
    headEmail,
    headDepartment: headDept,
    headSection: headSec,
    sessionId,
    details,
  };
  testAuditLogs.unshift(entry);
  if (testAuditLogs.length > 500) testAuditLogs.pop();
  console.log(`[AUDIT - SUPER IT TEST MODE] ${entry.timestamp} | ${action} | Admin: ${adminEmail} | Target Head: ${headEmail} (${headDept}) | Session: ${sessionId}`);
}

// Prune expired test sessions & tickets
function pruneTestSessions() {
  const now = Date.now();
  for (const [token, sess] of activeTestSessions.entries()) {
    if (sess.expiresAt <= now || sess.revoked) {
      activeTestSessions.delete(token);
    }
  }
  for (const [ticket, item] of testLaunchTickets.entries()) {
    if (item.expiresAt <= now) {
      testLaunchTickets.delete(ticket);
    }
  }
}
setInterval(pruneTestSessions, 5 * 60 * 1000).unref?.();

/**
 * Validates whether a token represents an active, non-expired, non-revoked Super IT Test Session.
 * Supports both cryptographically signed stateless tokens and in-memory sessions.
 */
export function verifyTestSession(sessionToken: string): TestSessionRecord | null {
  if (!sessionToken) return null;
  pruneTestSessions();

  // 1. Check stateless cryptographic token (survives container spin-ups & cold-starts on Vercel)
  const signed = verifySignedTestToken(sessionToken);
  if (signed) return signed;

  // 2. Fallback to in-memory store
  const session = activeTestSessions.get(sessionToken);
  if (!session) return null;
  if (session.revoked || session.expiresAt <= Date.now()) {
    activeTestSessions.delete(sessionToken);
    return null;
  }
  return session;
}

/**
 * 1. Create a dedicated Super IT Test Session for an authorized Super Admin.
 * Returns a cryptographically signed session token and launch ticket that works across all serverless containers.
 */
export async function handleCreateTestSession(
  authHeader: string | null,
  body: any,
  origin: string,
  headers?: any
): Promise<{
  statusCode: number;
  body: {
    success: boolean;
    launchUrl?: string;
    ticket?: string;
    sessionToken?: string;
    expiresInSeconds?: number;
    head?: {
      id: string;
      email: string;
      name: string;
      department: DepartmentKey;
      section: SectionKey | null;
      demoRole?: 'co_head' | 'marketing' | 'design';
    };
    error?: string;
  };
}> {
  // Enforce server-side verification: ONLY diavlo3444@gmail.com
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user || auth.user.email?.toLowerCase().trim() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      statusCode: auth.statusCode === 200 ? 403 : auth.statusCode,
      body: { success: false, error: 'Unauthorized. Test Mode is restricted exclusively to the primary IT Super Admin.' },
    };
  }

  const targetEmail = String(body.email || '').trim().toLowerCase();
  const targetId = String(body.id || body.headId || '').trim();
  const requestedDemoRole = String(body.demoRole || '').trim().toLowerCase();
  const demoRole = (['co_head', 'marketing', 'design'].includes(requestedDemoRole) ? requestedDemoRole : '') as TestSessionRecord['demoRole'] | '';

  if (!demoRole && !targetEmail && !targetId) {
    return { statusCode: 400, body: { success: false, error: 'Target department head identification is required.' } };
  }

  // Temporary EB demo profiles are signed sessions only: no Auth user or persistent account is created.
  let targetHead: {
    id: string;
    email: string;
    head_name: string;
    department: DepartmentKey;
    section: SectionKey | null;
  } | null = null;

  if (demoRole) {
    // Co-Head preview defaults to Security & Protocol, the role's operational review workspace.
    const department = demoRole === 'co_head' ? 'security' : demoRole;
    targetHead = {
      id: `demo_${demoRole}`,
      email: `demo-${demoRole}@westmun.local`,
      head_name: `Demo ${demoRole === 'co_head' ? 'Co-Head' : demoRole === 'marketing' ? 'Marketing' : 'Design'}`,
      department: department as DepartmentKey,
      section: null,
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!demoRole && supabaseAdmin) {
    try {
      let query = supabaseAdmin.from('department_heads').select('*');
      if (targetId && UUID_REGEX.test(targetId)) {
        query = query.or(`id.eq.${targetId},user_id.eq.${targetId}`);
      } else if (targetEmail) {
        query = query.ilike('email', targetEmail);
      } else if (targetId) {
        query = query.eq('id', targetId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        targetHead = {
          id: data.user_id || data.id,
          email: data.email,
          head_name: data.head_name || 'Department Head',
          department: data.department as DepartmentKey,
          section: data.section as SectionKey | null,
        };
      } else if (!data && targetEmail) {
        const { data: byEmail } = await supabaseAdmin.from('department_heads').select('*').ilike('email', targetEmail).maybeSingle();
        if (byEmail) {
          targetHead = {
            id: byEmail.user_id || byEmail.id,
            email: byEmail.email,
            head_name: byEmail.head_name || 'Department Head',
            department: byEmail.department as DepartmentKey,
            section: byEmail.section as SectionKey | null,
          };
        }
      }
    } catch (err) {
      console.warn('[handleCreateTestSession] Supabase lookup error:', err);
    }
  }

  if (!demoRole && !targetHead) {
    // Check local store
    const local = targetId ? HeadStore.getById(targetId) : HeadStore.getByEmail(targetEmail);
    if (local) {
      targetHead = {
        id: local.id,
        email: local.email,
        head_name: local.head_name,
        department: local.department,
        section: local.section,
      };
    }
  }

  if (!targetHead) {
    return { statusCode: 404, body: { success: false, error: 'Department head account not found.' } };
  }

  const rawSessionId = `test_sess_${crypto.randomBytes(16).toString('hex')}`;
  const now = Date.now();
  const TTL_MS = 15 * 60 * 1000; // 15 minutes dedicated testing window
  const TICKET_TTL_MS = 60 * 1000; // 60 seconds single-use launch window

  const sessionRecord: TestSessionRecord = {
    sessionId: rawSessionId,
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    headId: targetHead.id,
    headEmail: targetHead.email,
    headName: targetHead.head_name,
    department: targetHead.department,
    section: targetHead.section,
    demoRole: demoRole || undefined,
    createdAt: now,
    expiresAt: now + TTL_MS,
    revoked: false,
    userAgent: headers?.['user-agent'] || '',
    ip: headers?.['x-forwarded-for'] || '',
  };

  // Generate cryptographically signed token (verified statelessly across any serverless container)
  const sessionToken = signTestSessionToken(sessionRecord);
  const launchTicket = `ticket_${crypto.randomBytes(24).toString('hex')}`;

  activeTestSessions.set(sessionToken, sessionRecord);
  activeTestSessions.set(rawSessionId, sessionRecord);
  testLaunchTickets.set(launchTicket, {
    sessionId: sessionToken,
    expiresAt: now + TICKET_TTL_MS,
  });

  recordTestAuditLog(
    'create_test_session',
    auth.user.email,
    auth.user.id,
    targetHead.email,
    targetHead.department,
    targetHead.section,
    rawSessionId,
    `Cryptographically signed test session generated. TTL: 15m.`
  );

  // Determine canonical destination url: e.g. /head/design?test_token=...&test_ticket=...
  const deptUrl = demoRole
    ? '/eb'
    : targetHead.section
      ? `/head/${targetHead.department}/${targetHead.section}`
      : `/head/${targetHead.department}`;

  const launchUrl = `${origin}${deptUrl}?test_token=${encodeURIComponent(sessionToken)}&test_ticket=${encodeURIComponent(launchTicket)}`;

  return {
    statusCode: 200,
    body: {
      success: true,
      launchUrl,
      ticket: launchTicket,
      sessionToken,
      expiresInSeconds: 900,
      head: {
        id: targetHead.id,
        email: targetHead.email,
        name: targetHead.head_name,
        department: targetHead.department,
        section: targetHead.section,
        demoRole: demoRole || undefined,
      },
    },
  };
}

/**
 * 2. Exchange a single-use launch ticket or signed launch token for the active Test Session token.
 */
export async function handleConsumeLaunchTicket(
  ticket: string
): Promise<{
  statusCode: number;
  body: {
    success: boolean;
    sessionToken?: string;
    expiresAt?: string;
    head?: {
      id: string;
      email: string;
      headName: string;
      department: DepartmentKey;
      section: SectionKey | null;
      demoRole?: 'co_head' | 'marketing' | 'design';
    };
    adminEmail?: string;
    error?: string;
  };
}> {
  if (!ticket) {
    return { statusCode: 400, body: { success: false, error: 'Launch ticket is required.' } };
  }

  // 1. If ticket is already a signed test session token, verify and return it directly
  const signed = verifySignedTestToken(ticket);
  if (signed) {
    recordTestAuditLog(
      'consume_launch_credential',
      signed.adminEmail,
      signed.adminId,
      signed.headEmail,
      signed.department,
      signed.section,
      signed.sessionId,
      'Signed launch credential verified and accepted in new tab'
    );
    return {
      statusCode: 200,
      body: {
        success: true,
        sessionToken: ticket,
        expiresAt: new Date(signed.expiresAt).toISOString(),
        adminEmail: signed.adminEmail,
        head: {
          id: signed.headId,
          email: signed.headEmail,
          headName: signed.headName,
          department: signed.department,
          section: signed.section,
          demoRole: signed.demoRole,
        },
      },
    };
  }

  // 2. Check in-memory launch ticket
  pruneTestSessions();
  const ticketRecord = testLaunchTickets.get(ticket);
  if (ticketRecord) {
    testLaunchTickets.delete(ticket);
    if (ticketRecord.expiresAt <= Date.now()) {
      return {
        statusCode: 401,
        body: { success: false, error: 'This launch ticket has expired. Please launch a new session from the IT Super Admin dashboard.' },
      };
    }
    const session = activeTestSessions.get(ticketRecord.sessionId);
    if (session && !session.revoked && session.expiresAt > Date.now()) {
      recordTestAuditLog(
        'consume_launch_credential',
        session.adminEmail,
        session.adminId,
        session.headEmail,
        session.department,
        session.section,
        session.sessionId,
        'Launch ticket redeemed into active test session token in new tab'
      );
      return {
        statusCode: 200,
        body: {
          success: true,
          sessionToken: ticketRecord.sessionId?.startsWith('wmtest_')
            ? ticketRecord.sessionId
            : signTestSessionToken(session),
          expiresAt: new Date(session.expiresAt).toISOString(),
          adminEmail: session.adminEmail,
          head: {
            id: session.headId,
            email: session.headEmail,
            headName: session.headName,
            department: session.department,
            section: session.section,
            demoRole: session.demoRole,
          },
        },
      };
    }
  }

  return {
    statusCode: 401,
    body: {
      success: false,
      error: 'This launch ticket is invalid or has already been consumed. Launch tickets are strictly single-use.',
    },
  };
}

/**
 * 3. Verify an active Test Session token.
 */
export async function handleVerifyTestSession(
  sessionToken: string
): Promise<{
  statusCode: number;
  body: {
    success: boolean;
    authorized: boolean;
    isSuperAdminTestMode: boolean;
    sessionToken?: string;
    adminEmail?: string;
    head?: {
      id: string;
      email: string;
      headName: string;
      department: DepartmentKey;
      section: SectionKey | null;
      demoRole?: 'co_head' | 'marketing' | 'design';
    };
    expiresAt?: string;
    error?: string;
  };
}> {
  const session = verifyTestSession(sessionToken);
  if (!session) {
    return {
      statusCode: 401,
      body: {
        success: false,
        authorized: false,
        isSuperAdminTestMode: false,
        error: 'Super IT Test Session expired, revoked, or invalid.',
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      authorized: true,
      isSuperAdminTestMode: true,
      sessionToken: sessionToken,
      adminEmail: session.adminEmail,
      expiresAt: new Date(session.expiresAt).toISOString(),
      head: {
        id: session.headId,
        email: session.headEmail,
        headName: session.headName,
        department: session.department,
        section: session.section,
        demoRole: session.demoRole,
      },
    },
  };
}

/**
 * 4. Revoke / Terminate a Super IT Test Session.
 */
export async function handleTerminateTestSession(
  sessionToken: string
): Promise<{ statusCode: number; body: { success: boolean; message?: string } }> {
  if (sessionToken) {
    const verified = verifyTestSession(sessionToken);
    if (verified?.sessionId) {
      revokedTestSessionIds.add(verified.sessionId);
    }
    const session = activeTestSessions.get(sessionToken);
    if (session) {
      session.revoked = true;
      activeTestSessions.delete(sessionToken);
    }
    if (verified) {
      recordTestAuditLog(
        'terminate_test_session',
        verified.adminEmail,
        verified.adminId,
        verified.headEmail,
        verified.department,
        verified.section,
        verified.sessionId,
        'Test session safely terminated and revoked'
      );
    }
  }
  return {
    statusCode: 200,
    body: { success: true, message: 'Super IT Test Session terminated successfully.' },
  };
}

/**
 * 5. Privileged Data Access for Super IT Test Sessions:
 * Grants the verified IT Super Admin full cross-department registration and data testing
 * without weakening PostgreSQL RLS for regular department heads.
 */
export async function handleTestSessionData(
  sessionToken: string,
  params: { department?: string; section?: string | null }
): Promise<{
  statusCode: number;
  body: {
    success: boolean;
    registrations?: any[];
    inquiries?: any[];
    sponsors?: any[];
    settings?: Record<string, string>;
    announcements?: any[];
    allDepartments?: any[];
    error?: string;
  };
}> {
  const session = verifyTestSession(sessionToken);
  if (!session) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: Valid Super IT Test Session required.' },
    };
  }

  recordTestAuditLog(
    'access_data',
    session.adminEmail,
    session.adminId,
    session.headEmail,
    params.department || session.department,
    params.section !== undefined ? params.section : session.section,
    sessionToken,
    `Privileged cross-department data queried during active test session`
  );

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      // 1. Team Registrations (all or filtered)
      let regQuery = supabaseAdmin.from('team_registrations').select('*');
      if (params.department && params.department !== 'all') {
        if (params.department === 'media_press') {
          regQuery = regQuery.in('team', ['media_press', 'media']);
        } else {
          regQuery = regQuery.eq('team', params.department);
        }
      }
      if (params.section) {
        regQuery = regQuery.eq('section', params.section);
      }
      const { data: registrations } = await regQuery.order('created_at', { ascending: false });

      // 2. Settings
      const { data: settingsRows } = await supabaseAdmin.from('settings').select('key,value');
      const settingsMap: Record<string, string> = {};
      settingsRows?.forEach((r: any) => {
        settingsMap[r.key] = r.value;
      });

      // 3. Announcements
      const { data: announcements } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });

      // 4. Inquiries & Sponsors for HR/PR testing
      const { data: inquiries } = await supabaseAdmin
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: sponsors } = await supabaseAdmin
        .from('sponsors')
        .select('*')
        .order('sort_order', { ascending: true });

      return {
        statusCode: 200,
        body: {
          success: true,
          registrations: registrations || [],
          inquiries: inquiries || [],
          sponsors: sponsors || [],
          settings: settingsMap,
          announcements: announcements || [],
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query testing data.';
      return { statusCode: 500, body: { success: false, error: msg } };
    }
  }

  // Local data fallback
  return {
    statusCode: 200,
    body: {
      success: true,
      registrations: [],
      inquiries: [],
      sponsors: [],
      settings: {},
      announcements: [],
    },
  };
}

/**
 * 6. Privileged Update for Super IT Test Sessions
 */
export async function handleTestSessionUpdate(
  sessionToken: string,
  body: { id: string; status: string; notes?: string }
): Promise<{ statusCode: number; body: { success: boolean; error?: string } }> {
  const session = verifyTestSession(sessionToken);
  if (!session) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: Valid Super IT Test Session required.' },
    };
  }

  recordTestAuditLog(
    'update_record',
    session.adminEmail,
    session.adminId,
    session.headEmail,
    session.department,
    session.section,
    sessionToken,
    `Record ${body.id} updated to status ${body.status}`
  );

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('team_registrations')
        .update({
          status: body.status,
          admin_notes: body.notes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id);

      if (error) {
        return { statusCode: 400, body: { success: false, error: error.message } };
      }
      return { statusCode: 200, body: { success: true } };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      return { statusCode: 500, body: { success: false, error: msg } };
    }
  }

  return { statusCode: 200, body: { success: true } };
}
