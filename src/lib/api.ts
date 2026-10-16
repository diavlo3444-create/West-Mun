/**
 * WEST MUN — Secure Local API Client
 * Connects to the local Express server without any external database dependencies.
 * All submissions are validated, sanitized, and rate-limited on the server.
 */

export interface RegistrationRecord {
  id: string;
  full_name: string;
  email: string;
  institution: string;
  tier: 'early_bird' | 'regular';
  delegation_type: 'single_delegate' | 'school_delegation';
  created_at: string;
}

export interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Submit delegate registration
 */
export async function submitRegistration(payload: {
  fullName: string;
  email: string;
  institution: string;
  tier: 'early_bird' | 'regular';
  delegationType: 'single_delegate' | 'school_delegation';
}): Promise<ApiResponse<RegistrationRecord>> {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: json.error || `Server responded with status ${response.status}`,
      };
    }
    return json;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Unable to submit registration: ${message}`,
    };
  }
}

/**
 * Submit diplomatic inquiry / contact message
 */
export async function submitInquiry(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<ApiResponse<InquiryRecord>> {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: json.error || `Server responded with status ${response.status}`,
      };
    }
    return json;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Unable to transmit message: ${message}`,
    };
  }
}

/**
 * Authenticate organizer session with the server
 */
export async function adminLogin(password: string): Promise<ApiResponse<{ token: string; expiresAt: string }> & { token?: string; expiresAt?: string }> {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const json = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: json.error || 'Authentication failed',
      };
    }

    const token = json.data?.token || json.token;
    const expiresAt = json.data?.expiresAt || json.expiresAt;

    return {
      success: true,
      token,
      expiresAt,
      data: token ? { token, expiresAt } : undefined,
      message: json.message,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Authentication failed: ${message}`,
    };
  }
}

/**
 * Fetch records (inquiries and registrations) for authenticated Secretariat sessions
 */
export async function fetchAdminData(token: string): Promise<ApiResponse<{
  registrations: RegistrationRecord[];
  inquiries: InquiryRecord[];
}>> {
  try {
    const response = await fetch('/api/admin/data', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: json.error || 'Failed to retrieve administrative data',
      };
    }
    return json;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      error: `Failed to retrieve data: ${message}`,
    };
  }
}

/**
 * Invalidate authenticated Secretariat session on the server
 */
export async function adminLogout(token: string): Promise<void> {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Ignore network failure on logout
  }
}
