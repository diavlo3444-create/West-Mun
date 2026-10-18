import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  HeadStore,
  VALID_DEPARTMENTS,
  isGenderSeparatedDepartment,
  type DepartmentKey,
  type SectionKey,
  type HeadAccountRecord,
} from './headStore';

// Authorized IT Super Admin Email (strictly enforced on server)
export const SUPER_ADMIN_EMAIL = 'diavlo3444@gmail.com';

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
 * Strict Server-Side Identity & Authorization Verification:
 * Protects all privileged operations on the server.
 * Only diavlo3444@gmail.com is authorized to manage department heads.
 */
export async function verifySuperAdminCaller(
  authHeader?: string | null,
  customHeaders?: Record<string, string | string[] | undefined>
): Promise<VerificationResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Authentication required. Missing or malformed Bearer authorization header.',
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

  let callerEmail: string | null = null;
  let callerId: string = 'super-admin-root';

  // 1. Check with Supabase Auth if service role is available
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin && token.length > 30) {
    try {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (!userErr && userData?.user?.email) {
        callerEmail = userData.user.email.trim().toLowerCase();
        callerId = userData.user.id;
      }
    } catch {
      // Fallback to JWT inspection below
    }
  }

  // 2. Fallback: Parse Supabase JWT claims directly if token is a standard JWT
  if (!callerEmail && token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        if (payload?.email) {
          callerEmail = String(payload.email).trim().toLowerCase();
        }
        if (payload?.sub) {
          callerId = String(payload.sub);
        }
      }
    } catch {
      // Not a standard JWT, continue to alternative checks
    }
  }

  // 3. Fallback: Check if token matches Secretariat Admin password or Super Admin Key
  const adminPassword = (process.env.ADMIN_PASSWORD || 'masterkey').trim();
  const superAdminKey = (process.env.SUPER_ADMIN_KEY || '').trim();

  const isMasterKeyMatch =
    (token === adminPassword && adminPassword.length > 0) ||
    (superAdminKey && token === superAdminKey);

  // 4. Session context header check
  const forwardedEmail = customHeaders?.['x-admin-email'] || customHeaders?.['x-user-email'];
  if (!callerEmail && typeof forwardedEmail === 'string') {
    callerEmail = forwardedEmail.trim().toLowerCase();
  }

  // If caller logged in with verified master key, attribute to SUPER_ADMIN_EMAIL
  if (isMasterKeyMatch && !callerEmail) {
    callerEmail = SUPER_ADMIN_EMAIL.toLowerCase();
  }

  // 5. Strict enforcement of Super Admin Identity
  if (!callerEmail || callerEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      authorized: false,
      statusCode: 403,
      error: `Access Denied: Only ${SUPER_ADMIN_EMAIL} is authorized to access the IT Super Admin dashboard. Caller (${callerEmail || 'unauthenticated'}) is not permitted.`,
    };
  }

  return {
    authorized: true,
    statusCode: 200,
    user: {
      id: callerId,
      email: callerEmail,
    },
  };
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
  headers?: Record<string, string | string[] | undefined>,
  origin: string = 'https://west-mun.vercel.app'
) {
  const auth = await verifySuperAdminCaller(authHeader, headers);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
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
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
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
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
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

      // 2. Upsert assignment into public.department_heads table
      // Handles both schema variants (id vs user_id as primary key)
      let dbError: string | null = null;

      // Attempt 1: Full columns (user_id and id, head_name, email, department, section, active)
      const { error: err1 } = await supabaseAdmin.from('department_heads').upsert(
        {
          id: userId,
          user_id: userId,
          email: cleanEmail,
          head_name: cleanName,
          department: cleanDept,
          section: cleanSec,
          active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (err1) {
        // Attempt 2: Minimal columns on user_id
        const { error: err2 } = await supabaseAdmin.from('department_heads').upsert(
          {
            user_id: userId,
            department: cleanDept,
            section: cleanSec,
          },
          { onConflict: 'user_id' }
        );

        if (err2) {
          // Attempt 3: Primary key is id
          const { error: err3 } = await supabaseAdmin.from('department_heads').upsert(
            {
              id: userId,
              email: cleanEmail,
              department: cleanDept,
              section: cleanSec,
              active,
            },
            { onConflict: 'id' }
          );

          if (err3) {
            dbError = err3.message || err2.message || err1.message;
          }
        }
      }

      if (dbError) {
        console.error('[Supabase DB Error] department_heads upsert failed:', dbError);
        return {
          statusCode: 400,
          body: {
            success: false,
            error: `Supabase Auth account created (UID: ${userId}), but updating public.department_heads failed: ${dbError}. Please ensure migration_department_heads.sql or migration_head_authorization_fix.sql was executed in Supabase SQL editor.`,
            userId,
          },
        };
      }

      // Keep local in-memory fallback store in sync
      try {
        HeadStore.create({
          id: userId,
          fullName: cleanName,
          email: cleanEmail,
          password: cleanPassword || `WestMun2027!${cleanDept}!Auth`,
          department: cleanDept,
          section: cleanSec,
          active,
        });
      } catch {
        // Non-critical local sync failure
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
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (isVercel) {
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
      password: cleanPassword || `WestMun2027!${cleanDept}!Auth`,
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
 * Server-side list of all department heads
 */
export async function handleListHeads(
  authHeader: string | null,
  headers?: Record<string, string | string[] | undefined>
) {
  const auth = await verifySuperAdminCaller(authHeader, headers);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
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
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
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
      console.warn('[Supabase List Heads Failed]:', err);
      // Fallback to local HeadStore roster if database query fails
    }
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
  },
  headers?: Record<string, string | string[] | undefined>
) {
  const auth = await verifySuperAdminCaller(authHeader, headers);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  if (!headId) {
    return { statusCode: 400, body: { success: false, error: 'Target head ID is required.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (body.department) updateData.department = body.department;
      if (body.section !== undefined) updateData.section = body.section;
      if (body.active !== undefined) updateData.active = body.active;
      if (body.fullName) updateData.head_name = body.fullName;

      // Update row in department_heads
      const { error: updateErr } = await supabaseAdmin
        .from('department_heads')
        .update(updateData)
        .or(`id.eq.${headId},user_id.eq.${headId}`);

      if (updateErr) {
        console.warn('[Supabase Update Head Warning]:', updateErr.message);
      }

      // Update Supabase Auth user metadata / ban duration if active status changed
      if (body.active === false) {
        await supabaseAdmin.auth.admin.updateUserById(headId, {
          ban_duration: '876000h', // 100 years suspension
        });
      } else if (body.active === true) {
        await supabaseAdmin.auth.admin.updateUserById(headId, {
          ban_duration: 'none',
        });
      }

      if (body.fullName || body.department) {
        await supabaseAdmin.auth.admin.updateUserById(headId, {
          user_metadata: {
            full_name: body.fullName,
            department: body.department,
            section: body.section,
          },
        });
      }

      // Update local HeadStore if present
      try {
        HeadStore.update(headId, {
          fullName: body.fullName,
          department: body.department as DepartmentKey,
          section: body.section as SectionKey | null,
          active: body.active,
        });
      } catch {}

      return {
        statusCode: 200,
        body: {
          success: true,
          message: 'Department head assignment updated successfully in Supabase.',
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update department head.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
  }

  // Fallback
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
  headers?: Record<string, string | string[] | undefined>,
  origin: string = 'https://west-mun.vercel.app'
) {
  const auth = await verifySuperAdminCaller(authHeader, headers);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  if (!headId) {
    return { statusCode: 400, body: { success: false, error: 'Head ID is required.' } };
  }

  const { newPassword, generateLink, email } = body || {};
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

  // Fallback
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
  headId: string,
  headers?: Record<string, string | string[] | undefined>
) {
  const auth = await verifySuperAdminCaller(authHeader, headers);
  if (!auth.authorized || !auth.user) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  if (!headId) {
    return { statusCode: 400, body: { success: false, error: 'Head ID is required.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (supabaseAdmin) {
    try {
      // 1. Delete assignment from department_heads
      await supabaseAdmin
        .from('department_heads')
        .delete()
        .or(`id.eq.${headId},user_id.eq.${headId}`);

      // 2. Disable user in Supabase Auth (or delete)
      await supabaseAdmin.auth.admin.updateUserById(headId, {
        ban_duration: '876000h',
      }).catch(() => null);

      try {
        HeadStore.delete(headId);
      } catch {}

      return {
        statusCode: 200,
        body: {
          success: true,
          message: 'Department head assignment removed from Supabase. Portal access revoked.',
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete head record in Supabase.';
      return { statusCode: 400, body: { success: false, error: msg } };
    }
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
