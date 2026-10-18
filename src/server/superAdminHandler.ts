import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Authorized IT Super Admin Email (strictly enforced)
export const SUPER_ADMIN_EMAIL = 'diavlo3444@gmail.com';

export const VALID_DEPARTMENTS = [
  'design',
  'marketing',
  'media_press',
  'security',
  'volunteers',
  'pr',
  'hr',
  'logistics',
  'it',
  'ceremonies',
  'dcc',
] as const;

export type DepartmentKey = (typeof VALID_DEPARTMENTS)[number];
export type SectionKey = 'male' | 'female';

export function isGenderSeparatedDepartment(dept: string): boolean {
  return dept === 'media_press' || dept === 'security' || dept === 'volunteers';
}

function getSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  return url.trim();
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  return key.trim();
}

function getSupabaseServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';
  return key.trim();
}

/**
 * Returns a privileged Supabase client using the server-side service role key.
 * NEVER exposed to the browser.
 */
export function getServerSupabaseAdmin(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns a standard Supabase client using the anon key to verify caller JWTs.
 */
export function getServerSupabaseAnon(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface VerificationResult {
  authorized: boolean;
  statusCode: number;
  error?: string;
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Strict Server-Side Identity & Authorization Verification:
 * 1. Validates the caller's JWT bearer token with Supabase Auth.
 * 2. Checks that the authenticated email strictly equals diavlo3444@gmail.com.
 * 3. Verifies that the caller's UID exists in public.admins.
 */
export async function verifySuperAdminCaller(
  authHeader?: string | null
): Promise<VerificationResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Authentication required. Missing or malformed Bearer token.',
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Empty authentication token provided.',
    };
  }

  const anonClient = getServerSupabaseAnon();
  const adminClient = getServerSupabaseAdmin();

  const verifierClient = anonClient || adminClient;
  if (!verifierClient) {
    return {
      authorized: false,
      statusCode: 500,
      error: 'Supabase server configuration is missing. Check server environment variables.',
    };
  }

  // 1. Verify token with Supabase Auth
  const { data: authData, error: authError } = await verifierClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return {
      authorized: false,
      statusCode: 401,
      error: authError?.message || 'Invalid or expired session token.',
    };
  }

  const user = authData.user;
  const userEmail = (user.email || '').trim().toLowerCase();

  // 2. Strict email match for top-level IT Super Admin
  if (userEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      authorized: false,
      statusCode: 403,
      error: `Access Denied: Only ${SUPER_ADMIN_EMAIL} is authorized to access the IT Super Admin dashboard. Your account (${userEmail || 'unknown'}) is not permitted.`,
    };
  }

  // 3. Verify user is registered in public.admins
  // Use adminClient if available, otherwise check with caller's token in client
  const dbClient = adminClient || verifierClient;
  const { data: adminRecord, error: adminErr } = await dbClient
    .from('admins')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminErr || !adminRecord) {
    return {
      authorized: false,
      statusCode: 403,
      error: `Access Denied: Account ${userEmail} must be registered as an active administrator in public.admins.`,
    };
  }

  return {
    authorized: true,
    statusCode: 200,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

/**
 * Server-side creation of Department Head account with automatic rollback
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
  }
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  const { fullName, email, password, department, section, active = true } = body || {};

  // Input validation
  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = password || '';
  const cleanDept = (department || '').trim().toLowerCase();
  const cleanSec = section ? section.trim().toLowerCase() : null;

  if (!cleanName || cleanName.length < 2) {
    return { statusCode: 400, body: { error: 'Department head full name is required (min 2 characters).' } };
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { statusCode: 400, body: { error: 'Please provide a valid email address.' } };
  }

  if (cleanPass.length < 8) {
    return { statusCode: 400, body: { error: 'Password must be at least 8 characters in length.' } };
  }

  if (!VALID_DEPARTMENTS.includes(cleanDept as DepartmentKey)) {
    return {
      statusCode: 400,
      body: { error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}.` },
    };
  }

  // Enforce section rules
  if (isGenderSeparatedDepartment(cleanDept)) {
    if (cleanSec !== 'male' && cleanSec !== 'female') {
      return {
        statusCode: 400,
        body: { error: `Department ${cleanDept} requires section to be either "male" or "female".` },
      };
    }
  } else if (cleanSec) {
    return {
      statusCode: 400,
      body: { error: `Department ${cleanDept} does not use gender sections. Section must be null.` },
    };
  }

  const adminClient = getServerSupabaseAdmin();
  if (!adminClient) {
    return {
      statusCode: 500,
      body: {
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not configured in server environment variables. Cannot create Supabase Auth users from dashboard.',
      },
    };
  }

  // 1. Create Supabase Auth user
  let createdUserId: string | null = null;
  try {
    const { data: newUser, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPass,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        department: cleanDept,
        section: cleanSec,
      },
    });

    if (createAuthErr || !newUser?.user) {
      return {
        statusCode: 400,
        body: {
          error:
            createAuthErr?.message ||
            'Failed to create user in Supabase Auth. An account with this email may already exist.',
        },
      };
    }

    createdUserId = newUser.user.id;

    // 2. Insert or update in public.department_heads
    const { data: headRecord, error: insertDbErr } = await adminClient
      .from('department_heads')
      .upsert(
        {
          id: createdUserId,
          user_id: createdUserId,
          email: cleanEmail,
          head_name: cleanName,
          department: cleanDept,
          section: cleanSec,
          active: Boolean(active),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (insertDbErr) {
      // 3. Rollback: delete created auth user to prevent orphaned account
      console.error('[Rollback] Cleaning up auth user after failed department assignment:', insertDbErr);
      await adminClient.auth.admin.deleteUser(createdUserId);
      return {
        statusCode: 500,
        body: {
          error: `Database assignment failed: ${insertDbErr.message}. The created auth user was safely rolled back.`,
        },
      };
    }

    return {
      statusCode: 201,
      body: {
        success: true,
        message: `Department head account for ${cleanName} (${cleanDept}${cleanSec ? ` - ${cleanSec}` : ''}) was successfully created.`,
        head: headRecord,
      },
    };
  } catch (err: unknown) {
    if (createdUserId) {
      try {
        await adminClient.auth.admin.deleteUser(createdUserId);
      } catch {}
    }
    const msg = err instanceof Error ? err.message : 'Internal error creating department head account.';
    return { statusCode: 500, body: { error: msg } };
  }
}

/**
 * Server-side list of all department heads
 */
export async function handleListHeads(authHeader: string | null) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  const dbClient = getServerSupabaseAdmin() || getServerSupabaseAnon();
  if (!dbClient) {
    return { statusCode: 500, body: { error: 'Database connection unconfigured.' } };
  }

  const { data, error } = await dbClient
    .from('department_heads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { statusCode: 500, body: { error: error.message } };
  }

  return { statusCode: 200, body: { success: true, heads: data || [] } };
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
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  const dbClient = getServerSupabaseAdmin() || getServerSupabaseAnon();
  if (!dbClient) {
    return { statusCode: 500, body: { error: 'Database connection unconfigured.' } };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.active === 'boolean') {
    updates.active = body.active;
  }

  if (body.fullName) {
    updates.head_name = body.fullName.trim();
  }

  if (body.department) {
    const cleanDept = body.department.trim().toLowerCase();
    if (!VALID_DEPARTMENTS.includes(cleanDept as DepartmentKey)) {
      return { statusCode: 400, body: { error: 'Invalid department key.' } };
    }
    updates.department = cleanDept;

    if (isGenderSeparatedDepartment(cleanDept)) {
      const cleanSec = body.section ? body.section.trim().toLowerCase() : null;
      if (cleanSec !== 'male' && cleanSec !== 'female') {
        return {
          statusCode: 400,
          body: { error: `Department ${cleanDept} requires section to be either "male" or "female".` },
        };
      }
      updates.section = cleanSec;
    } else {
      updates.section = null;
    }
  }

  // Update in department_heads
  const { data, error } = await dbClient
    .from('department_heads')
    .update(updates)
    .or(`id.eq.${headId},user_id.eq.${headId}`)
    .select('*')
    .single();

  if (error) {
    return { statusCode: 500, body: { error: error.message } };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Department head assignment updated successfully.',
      head: data,
    },
  };
}

/**
 * Server-side password reset or recovery link generation
 */
export async function handleResetPassword(
  authHeader: string | null,
  headId: string,
  body: {
    newPassword?: string;
    generateLink?: boolean;
    email?: string;
  }
) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  const adminClient = getServerSupabaseAdmin();
  if (!adminClient) {
    return {
      statusCode: 500,
      body: { error: 'SUPABASE_SERVICE_ROLE_KEY required for administrative password resets.' },
    };
  }

  const { newPassword, generateLink, email } = body;

  try {
    if (newPassword) {
      if (newPassword.length < 8) {
        return { statusCode: 400, body: { error: 'Password must be at least 8 characters.' } };
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(headId, {
        password: newPassword,
      });

      if (updateErr) {
        return { statusCode: 400, body: { error: updateErr.message } };
      }

      return {
        statusCode: 200,
        body: {
          success: true,
          message: 'Password successfully updated for department head.',
        },
      };
    }

    if (generateLink && email) {
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim().toLowerCase(),
      });

      if (linkErr || !linkData) {
        return { statusCode: 400, body: { error: linkErr?.message || 'Failed to generate reset link.' } };
      }

      return {
        statusCode: 200,
        body: {
          success: true,
          actionLink: linkData.properties?.action_link,
          message: 'Password reset link generated successfully.',
        },
      };
    }

    return { statusCode: 400, body: { error: 'Provide newPassword or generateLink.' } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error during password reset.';
    return { statusCode: 500, body: { error: msg } };
  }
}

/**
 * Server-side removal of department head portal access
 */
export async function handleDeleteHead(authHeader: string | null, headId: string) {
  const auth = await verifySuperAdminCaller(authHeader);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  const adminClient = getServerSupabaseAdmin();
  const dbClient = adminClient || getServerSupabaseAnon();
  if (!dbClient) {
    return { statusCode: 500, body: { error: 'Database connection unconfigured.' } };
  }

  // Delete from department_heads
  const { error: dbErr } = await dbClient
    .from('department_heads')
    .delete()
    .or(`id.eq.${headId},user_id.eq.${headId}`);

  if (dbErr) {
    return { statusCode: 500, body: { error: dbErr.message } };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Department head assignment removed successfully. Portal access revoked.',
    },
  };
}
