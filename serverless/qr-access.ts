import { getSupabaseAdmin } from '../src/server/superAdminHandler.ts';

async function parseJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function ensureResponseHelpers(res: any) {
  if (!res.status) {
    res.status = function (code: number) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (data: any) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      res.end(JSON.stringify(data));
      return res;
    };
  }
}

export default async function handler(req: any, res: any) {
  ensureResponseHelpers(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      error: 'Supabase service credentials not configured on server.',
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing Bearer token.',
      });
    }

    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired user session.',
      });
    }

    // Role verification: Must be Admin OR Security Head / Security Co-Head
    const { data: adminRow } = await supabaseAdmin
      .from('admins')
      .select('user_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: headRow } = await supabaseAdmin
      .from('department_heads')
      .select('user_id, department, section, role_type, active, head_name, email')
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    const isAdmin = Boolean(adminRow);
    const isSecurityOfficer = Boolean(headRow && headRow.department === 'security');

    if (!isAdmin && !isSecurityOfficer) {
      const callerDept = headRow?.department ? ` (Caller department: ${headRow.department})` : '';
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_DEPARTMENT',
        error: `Unauthorized. QR Scanner and attendee check-in clearance is strictly restricted to Security Directorate personnel (Security Heads and Security Co-Heads) and Secretariat Administrators${callerDept}.`,
      });
    }

    const officerEmail = user.email || headRow?.email || 'admin@westmun.org';
    const officerName = headRow?.head_name || user.user_metadata?.full_name || 'Security Officer';
    const body = await parseJsonBody(req);
    const action = body.action || 'scan';
    const station = body.station || 'Main Security Entrance';

    if (action === 'history') {
      const { data: recent, error: historyErr } = await supabaseAdmin
        .from('wm_qr_checkins')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(50);

      if (historyErr) {
        return res.status(500).json({ success: false, error: historyErr.message });
      }

      return res.status(200).json({ success: true, checkins: recent || [] });
    }

    const rawCode = String(body.ticket_id || body.qr_payload || '').trim();
    if (!rawCode) {
      return res.status(400).json({
        success: false,
        error: 'No ticket code, QR payload, or attendee identifier provided.',
      });
    }

    let queryId = rawCode;
    try {
      if (rawCode.startsWith('{') && rawCode.endsWith('}')) {
        const parsed = JSON.parse(rawCode);
        queryId = parsed.ticketId || parsed.id || parsed.email || queryId;
      }
    } catch {}

    // Search in delegates
    const { data: delegate } = await supabaseAdmin
      .from('delegates')
      .select('*')
      .or(`id.eq.${queryId},email.ilike.${queryId},full_name.ilike.${queryId}`)
      .limit(1)
      .maybeSingle();

    // Search in team_registrations
    let teamMember = null;
    if (!delegate) {
      const { data: tm } = await supabaseAdmin
        .from('team_registrations')
        .select('*')
        .or(`id.eq.${queryId},email.ilike.${queryId},full_name.ilike.${queryId}`)
        .limit(1)
        .maybeSingle();
      teamMember = tm;
    }

    if (!delegate && !teamMember) {
      return res.status(404).json({
        success: false,
        code: 'ATTENDEE_NOT_FOUND',
        error: `No accreditation or registration record found matching "${rawCode}".`,
      });
    }

    const attendee = delegate || teamMember;
    const isDelegate = Boolean(delegate);
    const attendeeType = isDelegate ? 'delegate' : 'team';
    const status = String(attendee.status || '').toLowerCase();
    const isApproved = status === 'accepted' || status === 'approved';

    let admissionStatus: 'admitted' | 'flagged' | 'rejected' | 'duplicate' = 'admitted';
    let admissionMessage = 'Accreditation verified. Admitted to conference premises.';

    if (!isApproved) {
      admissionStatus = 'rejected';
      admissionMessage = `Access Denied: Registration status is ${status ? status.toUpperCase() : 'PENDING'}. Not approved by Secretariat.`;
    }

    // Check duplicate check-ins
    const { data: existingCheckins } = await supabaseAdmin
      .from('wm_qr_checkins')
      .select('*')
      .eq('attendee_id', attendee.id)
      .order('scanned_at', { ascending: false });

    const checkinCount = existingCheckins?.length || 0;
    if (checkinCount > 0 && admissionStatus === 'admitted') {
      admissionStatus = 'duplicate';
      const lastCheckin = existingCheckins![0];
      const timeStr = new Date(lastCheckin.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      admissionMessage = `Notice: Previously admitted today at ${timeStr} (${lastCheckin.station}). Secondary check-in logged.`;
    }

    // Record check-in log
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('wm_qr_checkins')
      .insert({
        ticket_id: rawCode.slice(0, 100),
        attendee_type: attendeeType,
        attendee_id: attendee.id,
        attendee_name: attendee.full_name || 'Unnamed Attendee',
        attendee_email: attendee.email || '',
        committee_or_team: isDelegate ? attendee.committee || 'Delegate Assembly' : `Team ${attendee.team || ''}`,
        institution: attendee.institution || 'Independent Delegation',
        station,
        scanned_by_email: officerEmail,
        scanned_by_name: officerName,
        status: admissionStatus,
        notes: admissionMessage,
      })
      .select()
      .single();

    if (insertErr) {
      console.warn('[QR Serverless] Checkin log insert notice:', insertErr.message);
    }

    return res.status(200).json({
      success: true,
      admitted: admissionStatus === 'admitted' || admissionStatus === 'duplicate',
      admissionStatus,
      message: admissionMessage,
      checkinCount: checkinCount + 1,
      attendee: {
        id: attendee.id,
        name: attendee.full_name,
        email: attendee.email,
        type: attendeeType,
        institution: attendee.institution,
        roleOrCommittee: isDelegate ? attendee.committee || 'General Delegate' : `Staff (${attendee.team})`,
        section: attendee.section || null,
        status: attendee.status,
        paymentStatus: attendee.payment_status || null,
      },
      scanRecord: inserted || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ success: false, error: msg });
  }
}
