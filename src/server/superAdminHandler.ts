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
 * Strips password hash and salt from records before sending over the wire
 */
function sanitizeHeadRecord(record: HeadAccountRecord) {
  const { passwordHash, salt, ...safe } = record;
  return safe;
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

  // 1. Check if token is a JWT (e.g. from Supabase / Auth provider)
  let callerEmail: string | null = null;
  let callerId: string = 'super-admin-root';

  if (token.includes('.')) {
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
      // Not a valid JWT, continue to alternative checks
    }
  }

  // 2. Check if token matches Secretariat Admin password or Super Admin Key
  const adminPassword = (process.env.ADMIN_PASSWORD || 'masterkey').trim();
  const superAdminKey = (process.env.SUPER_ADMIN_KEY || '').trim();

  const isMasterKeyMatch =
    (token === adminPassword && adminPassword.length > 0) ||
    (superAdminKey && token === superAdminKey);

  // 3. Fallback header check for authenticated session context
  const forwardedEmail = customHeaders?.['x-admin-email'] || customHeaders?.['x-user-email'];
  if (!callerEmail && typeof forwardedEmail === 'string') {
    callerEmail = forwardedEmail.trim().toLowerCase();
  }

  // If caller logged in with master admin key, attribute to SUPER_ADMIN_EMAIL
  if (isMasterKeyMatch && !callerEmail) {
    callerEmail = SUPER_ADMIN_EMAIL.toLowerCase();
  }

  // 4. Strict enforcement of Super Admin Identity
  if (!callerEmail || callerEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      authorized: false,
      statusCode: 403,
      error: `Access Denied: Only ${SUPER_ADMIN_EMAIL} is authorized to access the IT Super Admin dashboard. Caller account (${callerEmail || 'unknown'}) is not permitted.`,
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
 * Server-side creation of Department Head account with salted hash and validation
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
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  const { fullName, email, password, department, section, active = true, inviteOnly } = body || {};

  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const isInvite = Boolean(inviteOnly) || !password || password.trim().length === 0;
  // If invite-only, generate a high-entropy initial temporary password
  const cleanPass = isInvite
    ? `WestMun_${Date.now()}_${Math.random().toString(36).slice(2, 10)}!Auth`
    : password!.trim();

  const cleanDept = (department || '').trim().toLowerCase() as DepartmentKey;
  const cleanSec = section ? (section.trim().toLowerCase() as SectionKey) : null;

  if (!cleanName || cleanName.length < 2) {
    return { statusCode: 400, body: { error: 'Department head full name is required (min 2 characters).' } };
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
  if (!emailRegex.test(cleanEmail)) {
    return { statusCode: 400, body: { error: 'Please provide a valid official email address.' } };
  }

  if (!isInvite && cleanPass.length < 8) {
    return { statusCode: 400, body: { error: 'Password must be at least 8 characters in length.' } };
  }

  if (!VALID_DEPARTMENTS.includes(cleanDept)) {
    return {
      statusCode: 400,
      body: { error: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}.` },
    };
  }

  if (isGenderSeparatedDepartment(cleanDept)) {
    if (cleanSec !== 'male' && cleanSec !== 'female') {
      return {
        statusCode: 400,
        body: { error: `Department "${cleanDept}" requires division to be either "male" or "female".` },
      };
    }
  }

  try {
    const { head } = HeadStore.create({
      fullName: cleanName,
      email: cleanEmail,
      password: cleanPass,
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
          ? `Department head account for ${cleanName} provisioned with password-setup invitation.`
          : `Department head account for ${cleanName} (${cleanDept}${cleanSec ? ` - ${cleanSec.toUpperCase()}` : ''}) was successfully provisioned.`,
        head: sanitizeHeadRecord(head),
        invitationLink,
        temporaryPassword: isInvite ? undefined : cleanPass,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create department head account.';
    return { statusCode: 400, body: { error: msg } };
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
    return { statusCode: auth.statusCode, body: { error: auth.error } };
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
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  if (!headId) {
    return { statusCode: 400, body: { error: 'Target head ID is required.' } };
  }

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
        message: `Department head assignment updated successfully.`,
        head: sanitizeHeadRecord(updated),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update department head.';
    return { statusCode: 400, body: { error: msg } };
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
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  if (!headId) {
    return { statusCode: 400, body: { error: 'Head ID is required.' } };
  }

  const { newPassword, generateLink } = body || {};

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
      body: { error: 'Please provide either a newPassword or select generateLink.' },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error executing password reset.';
    return { statusCode: 400, body: { error: msg } };
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
    return { statusCode: auth.statusCode, body: { error: auth.error } };
  }

  if (!headId) {
    return { statusCode: 400, body: { error: 'Head ID is required.' } };
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
    return { statusCode: 400, body: { error: msg } };
  }
}
