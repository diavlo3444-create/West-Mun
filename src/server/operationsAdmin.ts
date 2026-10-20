import crypto from 'node:crypto';
import {
  getSupabaseAdmin,
  recordTestAuditLog,
  verifyAdminCaller,
  verifyTestSession,
  type TestSessionRecord,
} from './superAdminHandler.ts';
import type { DepartmentKey, SectionKey } from '../head/departments.ts';

/**
 * Operations Studio Server-Side Handler for Super IT Test Sessions & Super Admins.
 *
 * Provides privileged, server-verified access to Operations Studio resources
 * (wm_people, wm_projects, wm_project_stages, wm_project_members, wm_project_tasks,
 * wm_shifts, wm_shift_assignments, and wm_registration_windows).
 *
 * Security:
 * - Requires a valid, non-expired Super IT Test Session (verified via verifyTestSession)
 *   OR an authenticated IT Super Admin session (verified via verifyAdminCaller).
 * - All actions during test sessions are logged to the test audit log.
 * - Regular department heads use direct Supabase RLS JWTs from the browser and do not reach this endpoint.
 */

// In-memory fallback stores for local development, tests, or before database tables are created
interface MemoryPerson {
  id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  department: DepartmentKey;
  section?: SectionKey | null;
  role_title: string;
  status: 'active' | 'pending' | 'inactive';
  private_notes: string;
  source_type: 'manual' | 'delegate' | 'team_registration';
  source_record_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryProject {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  title: string;
  brief: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  due_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryStage {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
}

interface MemoryMember {
  project_id: string;
  person_id: string;
  project_role: string;
  created_at: string;
}

interface MemoryTask {
  id: string;
  project_id: string;
  stage_id?: string | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_person_id?: string | null;
  due_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryShift {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  title: string;
  location: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

interface MemoryShiftAssignment {
  id: string;
  shift_id: string;
  person_id: string;
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface MemoryRegWindow {
  team: string;
  is_open: boolean;
  updated_at: string;
}

const memoryStore = {
  people: new Map<string, MemoryPerson>(),
  projects: new Map<string, MemoryProject>(),
  stages: new Map<string, MemoryStage>(),
  members: new Map<string, MemoryMember>(), // key: `${project_id}:${person_id}`
  tasks: new Map<string, MemoryTask>(),
  shifts: new Map<string, MemoryShift>(),
  shiftAssignments: new Map<string, MemoryShiftAssignment>(),
  regWindows: new Map<string, MemoryRegWindow>([
    ['volunteers', { team: 'volunteers', is_open: true, updated_at: new Date().toISOString() }],
    ['security', { team: 'security', is_open: true, updated_at: new Date().toISOString() }],
    ['media_press', { team: 'media_press', is_open: true, updated_at: new Date().toISOString() }],
    ['design', { team: 'design', is_open: true, updated_at: new Date().toISOString() }],
    ['pr_sponsorship', { team: 'pr_sponsorship', is_open: true, updated_at: new Date().toISOString() }],
    ['hr', { team: 'hr', is_open: true, updated_at: new Date().toISOString() }],
  ]),
};

function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

export async function handleSuperAdminOperations(
  authHeader: string | null,
  body: any,
  searchParams?: URLSearchParams,
): Promise<{
  statusCode: number;
  body: {
    success: boolean;
    data?: any;
    error?: string;
    code?: string;
  };
}> {
  // Extract token: from Bearer header, or body.testToken
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : body?.testToken || searchParams?.get('token') || '';

  if (!token) {
    return {
      statusCode: 401,
      body: {
        success: false,
        error: 'Authentication required. Missing authorization token.',
        code: 'MISSING_TOKEN',
      },
    };
  }

  // 1. Check if token is a valid Super IT Test Session
  let testSession: TestSessionRecord | null = verifyTestSession(token);
  let callerEmail = '';
  let callerId = '';
  let isSuperAdmin = false;

  if (testSession) {
    callerEmail = testSession.adminEmail;
    callerId = testSession.adminId;
    isSuperAdmin = true;
  } else {
    // 2. Fallback: check if caller is an authorized Super Admin using a Supabase access token
    const adminCheck = await verifyAdminCaller(authHeader);
    if (adminCheck.authorized && adminCheck.isSuperAdmin && adminCheck.user) {
      callerEmail = adminCheck.user.email || '';
      callerId = adminCheck.user.id || '';
      isSuperAdmin = true;
    } else {
      return {
        statusCode: 401,
        body: {
          success: false,
          error:
            'Super IT test session token was invalid or expired. Please relaunch testing mode from the IT Super Admin dashboard.',
          code: 'SESSION_INVALID',
        },
      };
    }
  }

  // Determine requested action / operation
  let op = String(searchParams?.get('op') || body?.op || '').trim();
  const rawAction = String(body?.action || searchParams?.get('action') || '').trim();
  if (!op && rawAction.startsWith('wm_ops_')) {
    op = rawAction.replace('wm_ops_', '');
  }

  if (!op) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Operation name is required.', code: 'MISSING_OPERATION' },
    };
  }

  // Record audit log for privileged operations testing
  if (testSession) {
    recordTestAuditLog(
      'operations_studio_access',
      testSession.adminEmail,
      testSession.adminId,
      testSession.headEmail,
      body?.department || testSession.department,
      body?.section !== undefined ? body.section : testSession.section,
      testSession.sessionId,
      `Operations Studio operation: ${op}`
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (op) {
      // -----------------------------------------------------------------------
      // 1. PEOPLE / CUSTOM ROLES
      // -----------------------------------------------------------------------
      case 'list_people': {
        const dept = body?.department;
        const sec = body?.section;

        if (supabaseAdmin) {
          try {
            let query = supabaseAdmin.from('wm_people').select('*');
            if (dept) query = query.eq('department', dept);
            if (sec) query = query.eq('section', sec);
            const { data, error } = await query
              .order('role_title', { ascending: true })
              .order('display_name', { ascending: true });

            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
            if (error && !isMissingTableError(error)) {
              console.warn('[OperationsAdmin] wm_people query error:', error);
            }
          } catch (e) {
            console.warn('[OperationsAdmin] wm_people fetch failed, using fallback:', e);
          }
        }

        // In-memory fallback
        let list = Array.from(memoryStore.people.values());
        if (dept) list = list.filter((p) => p.department === dept);
        if (sec) list = list.filter((p) => p.section === sec);
        list.sort((a, b) => a.role_title.localeCompare(b.role_title) || a.display_name.localeCompare(b.display_name));
        return { statusCode: 200, body: { success: true, data: list } };
      }

      case 'create_person': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          display_name: String(body?.display_name || '').trim(),
          email: body?.email?.trim() || null,
          phone: body?.phone?.trim() || null,
          department: body?.department,
          section: body?.section || null,
          role_title: String(body?.role_title || '').trim(),
          status: body?.status || 'active',
          private_notes: String(body?.private_notes || '').trim(),
          source_type: body?.source_type || 'manual',
          source_record_id: body?.source_record_id || null,
          created_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin.from('wm_people').insert(payload).select().single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        memoryStore.people.set(payload.id, payload as MemoryPerson);
        return { statusCode: 200, body: { success: true, data: payload } };
      }

      case 'update_person': {
        const id = body?.id;
        const updates = body?.updates || {};
        const updated_at = new Date().toISOString();

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_people')
              .update({ ...updates, updated_at })
              .eq('id', id)
              .select()
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const existing = memoryStore.people.get(id);
        if (existing) {
          const merged = { ...existing, ...updates, updated_at };
          memoryStore.people.set(id, merged);
          return { statusCode: 200, body: { success: true, data: merged } };
        }
        return { statusCode: 200, body: { success: true, data: { id, ...updates } } };
      }

      case 'delete_person': {
        const id = body?.id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_people').delete().eq('id', id);
          } catch {}
        }
        memoryStore.people.delete(id);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 2. PROJECTS & PRODUCTIONS
      // -----------------------------------------------------------------------
      case 'list_projects': {
        const dept = body?.department;
        const sec = body?.section;

        if (supabaseAdmin) {
          try {
            let query = supabaseAdmin.from('wm_projects').select('*');
            if (dept) query = query.eq('department', dept);
            if (sec) query = query.eq('section', sec);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        let list = Array.from(memoryStore.projects.values());
        if (dept) list = list.filter((p) => p.department === dept);
        if (sec) list = list.filter((p) => p.section === sec);
        list.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { statusCode: 200, body: { success: true, data: list } };
      }

      case 'create_project': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          department: body?.department,
          section: body?.section || null,
          title: String(body?.title || '').trim(),
          brief: String(body?.brief || '').trim(),
          status: body?.status || 'planning',
          due_at: body?.due_at || null,
          created_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin.from('wm_projects').insert(payload).select().single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        memoryStore.projects.set(payload.id, payload as MemoryProject);
        return { statusCode: 200, body: { success: true, data: payload } };
      }

      case 'update_project': {
        const id = body?.id;
        const updates = body?.updates || {};
        const updated_at = new Date().toISOString();

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_projects')
              .update({ ...updates, updated_at })
              .eq('id', id)
              .select()
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const existing = memoryStore.projects.get(id);
        if (existing) {
          const merged = { ...existing, ...updates, updated_at };
          memoryStore.projects.set(id, merged);
          return { statusCode: 200, body: { success: true, data: merged } };
        }
        return { statusCode: 200, body: { success: true, data: { id, ...updates } } };
      }

      case 'delete_project': {
        const id = body?.id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_projects').delete().eq('id', id);
          } catch {}
        }
        memoryStore.projects.delete(id);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 3. PROJECT STAGES
      // -----------------------------------------------------------------------
      case 'list_stages': {
        const projectId = body?.projectId || body?.project_id;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_stages')
              .select('*')
              .eq('project_id', projectId)
              .order('sort_order', { ascending: true });
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const list = Array.from(memoryStore.stages.values())
          .filter((s) => s.project_id === projectId)
          .sort((a, b) => a.sort_order - b.sort_order);
        return { statusCode: 200, body: { success: true, data: list } };
      }

      case 'create_stage': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          project_id: body?.project_id,
          title: String(body?.title || '').trim(),
          sort_order: Number(body?.sort_order ?? 0),
          status: body?.status || 'todo',
          created_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin.from('wm_project_stages').insert(payload).select().single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        memoryStore.stages.set(payload.id, payload as MemoryStage);
        return { statusCode: 200, body: { success: true, data: payload } };
      }

      case 'update_stage': {
        const id = body?.id;
        const updates = body?.updates || {};
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_stages')
              .update(updates)
              .eq('id', id)
              .select()
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const existing = memoryStore.stages.get(id);
        if (existing) {
          const merged = { ...existing, ...updates };
          memoryStore.stages.set(id, merged);
          return { statusCode: 200, body: { success: true, data: merged } };
        }
        return { statusCode: 200, body: { success: true, data: { id, ...updates } } };
      }

      case 'delete_stage': {
        const id = body?.id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_project_stages').delete().eq('id', id);
          } catch {}
        }
        memoryStore.stages.delete(id);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 4. PROJECT MEMBERS
      // -----------------------------------------------------------------------
      case 'list_members': {
        const projectId = body?.projectId || body?.project_id;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_members')
              .select('*, person:wm_people(*)')
              .eq('project_id', projectId)
              .order('created_at', { ascending: true });
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const members = Array.from(memoryStore.members.values())
          .filter((m) => m.project_id === projectId)
          .map((m) => ({
            ...m,
            person: memoryStore.people.get(m.person_id) || null,
          }));
        return { statusCode: 200, body: { success: true, data: members } };
      }

      case 'add_member': {
        const payload = {
          project_id: body?.project_id,
          person_id: body?.person_id,
          project_role: String(body?.project_role || '').trim(),
          added_by: callerId,
          created_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_members')
              .insert(payload)
              .select('*, person:wm_people(*)')
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const key = `${payload.project_id}:${payload.person_id}`;
        memoryStore.members.set(key, payload as MemoryMember);
        return {
          statusCode: 200,
          body: {
            success: true,
            data: {
              ...payload,
              person: memoryStore.people.get(payload.person_id) || null,
            },
          },
        };
      }

      case 'remove_member': {
        const projectId = body?.projectId || body?.project_id;
        const personId = body?.personId || body?.person_id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin
              .from('wm_project_members')
              .delete()
              .eq('project_id', projectId)
              .eq('person_id', personId);
          } catch {}
        }
        memoryStore.members.delete(`${projectId}:${personId}`);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 5. PROJECT TASKS
      // -----------------------------------------------------------------------
      case 'list_tasks': {
        const projectId = body?.projectId || body?.project_id;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_tasks')
              .select('*, assigned_person:wm_people(*)')
              .eq('project_id', projectId)
              .order('created_at', { ascending: true });
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const tasks = Array.from(memoryStore.tasks.values())
          .filter((t) => t.project_id === projectId)
          .map((t) => ({
            ...t,
            assigned_person: t.assigned_person_id ? memoryStore.people.get(t.assigned_person_id) || null : null,
          }));
        return { statusCode: 200, body: { success: true, data: tasks } };
      }

      case 'create_task': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          project_id: body?.project_id,
          stage_id: body?.stage_id || null,
          title: String(body?.title || '').trim(),
          description: String(body?.description || '').trim(),
          status: body?.status || 'todo',
          priority: body?.priority || 'medium',
          assigned_person_id: body?.assigned_person_id || null,
          due_at: body?.due_at || null,
          created_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_tasks')
              .insert(payload)
              .select('*, assigned_person:wm_people(*)')
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        memoryStore.tasks.set(payload.id, payload as MemoryTask);
        return {
          statusCode: 200,
          body: {
            success: true,
            data: {
              ...payload,
              assigned_person: payload.assigned_person_id
                ? memoryStore.people.get(payload.assigned_person_id) || null
                : null,
            },
          },
        };
      }

      case 'update_task': {
        const id = body?.id;
        const updates = body?.updates || {};
        const updated_at = new Date().toISOString();

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_project_tasks')
              .update({ ...updates, updated_at })
              .eq('id', id)
              .select('*, assigned_person:wm_people(*)')
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const existing = memoryStore.tasks.get(id);
        if (existing) {
          const merged = { ...existing, ...updates, updated_at };
          memoryStore.tasks.set(id, merged);
          return {
            statusCode: 200,
            body: {
              success: true,
              data: {
                ...merged,
                assigned_person: merged.assigned_person_id
                  ? memoryStore.people.get(merged.assigned_person_id) || null
                  : null,
              },
            },
          };
        }
        return { statusCode: 200, body: { success: true, data: { id, ...updates } } };
      }

      case 'delete_task': {
        const id = body?.id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_project_tasks').delete().eq('id', id);
          } catch {}
        }
        memoryStore.tasks.delete(id);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 6. SHIFTS & ROSTER
      // -----------------------------------------------------------------------
      case 'list_shifts': {
        const dept = body?.department;
        const sec = body?.section;

        if (supabaseAdmin) {
          try {
            let query = supabaseAdmin.from('wm_shifts').select('*, assignments:wm_shift_assignments(id)');
            if (dept) query = query.eq('department', dept);
            if (sec) query = query.eq('section', sec);
            const { data, error } = await query.order('starts_at', { ascending: true });
            if (!error && data) {
              const mapped = (data as any[]).map((sh) => ({
                ...sh,
                assigned_count: Array.isArray(sh.assignments) ? sh.assignments.length : 0,
              }));
              return { statusCode: 200, body: { success: true, data: mapped } };
            }
          } catch {}
        }

        let shifts = Array.from(memoryStore.shifts.values());
        if (dept) shifts = shifts.filter((s) => s.department === dept);
        if (sec) shifts = shifts.filter((s) => s.section === sec);
        shifts.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

        const mapped = shifts.map((sh) => {
          const count = Array.from(memoryStore.shiftAssignments.values()).filter(
            (a) => a.shift_id === sh.id && a.status !== 'cancelled'
          ).length;
          return { ...sh, assigned_count: count };
        });
        return { statusCode: 200, body: { success: true, data: mapped } };
      }

      case 'create_shift': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          department: body?.department,
          section: body?.section || null,
          title: String(body?.title || '').trim(),
          location: String(body?.location || '').trim(),
          starts_at: body?.starts_at,
          ends_at: body?.ends_at,
          capacity: Number(body?.capacity ?? 4),
          status: body?.status || 'open',
          created_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin.from('wm_shifts').insert(payload).select().single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data: { ...data, assigned_count: 0 } } };
            }
          } catch {}
        }

        memoryStore.shifts.set(payload.id, payload as MemoryShift);
        return { statusCode: 200, body: { success: true, data: { ...payload, assigned_count: 0 } } };
      }

      case 'update_shift': {
        const id = body?.id;
        const updates = body?.updates || {};
        const updated_at = new Date().toISOString();

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_shifts')
              .update({ ...updates, updated_at })
              .eq('id', id)
              .select()
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const existing = memoryStore.shifts.get(id);
        if (existing) {
          const merged = { ...existing, ...updates, updated_at };
          memoryStore.shifts.set(id, merged);
          return { statusCode: 200, body: { success: true, data: merged } };
        }
        return { statusCode: 200, body: { success: true, data: { id, ...updates } } };
      }

      case 'delete_shift': {
        const id = body?.id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_shifts').delete().eq('id', id);
          } catch {}
        }
        memoryStore.shifts.delete(id);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 7. SHIFT ASSIGNMENTS
      // -----------------------------------------------------------------------
      case 'list_shift_assignments': {
        const shiftId = body?.shiftId || body?.shift_id;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_shift_assignments')
              .select('*, person:wm_people(*)')
              .eq('shift_id', shiftId);
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const list = Array.from(memoryStore.shiftAssignments.values())
          .filter((a) => a.shift_id === shiftId)
          .map((a) => ({
            ...a,
            person: memoryStore.people.get(a.person_id) || null,
          }));
        return { statusCode: 200, body: { success: true, data: list } };
      }

      case 'assign_shift': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          shift_id: body?.shift_id,
          person_id: body?.person_id,
          status: body?.status || 'assigned',
          assigned_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_shift_assignments')
              .insert(payload)
              .select('*, person:wm_people(*)')
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        memoryStore.shiftAssignments.set(payload.id, payload as MemoryShiftAssignment);
        return {
          statusCode: 200,
          body: {
            success: true,
            data: {
              ...payload,
              person: memoryStore.people.get(payload.person_id) || null,
            },
          },
        };
      }

      case 'update_assignment_status': {
        const id = body?.assignmentId || body?.id;
        const status = body?.status;
        const updated_at = new Date().toISOString();

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_shift_assignments')
              .update({ status, updated_at })
              .eq('id', id)
              .select('*, person:wm_people(*)')
              .single();
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const existing = memoryStore.shiftAssignments.get(id);
        if (existing) {
          const merged = { ...existing, status, updated_at };
          memoryStore.shiftAssignments.set(id, merged);
          return {
            statusCode: 200,
            body: {
              success: true,
              data: {
                ...merged,
                person: memoryStore.people.get(merged.person_id) || null,
              },
            },
          };
        }
        return { statusCode: 200, body: { success: true, data: { id, status } } };
      }

      case 'remove_assignment': {
        const id = body?.assignmentId || body?.id;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_shift_assignments').delete().eq('id', id);
          } catch {}
        }
        memoryStore.shiftAssignments.delete(id);
        return { statusCode: 200, body: { success: true, data: null } };
      }

      // -----------------------------------------------------------------------
      // 8. REGISTRATION WINDOWS
      // -----------------------------------------------------------------------
      case 'list_registration_windows': {
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_registration_windows')
              .select('*')
              .order('team', { ascending: true });
            if (!error && data && data.length > 0) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const list = Array.from(memoryStore.regWindows.values());
        return { statusCode: 200, body: { success: true, data: list } };
      }

      case 'set_registration_window': {
        const team = String(body?.team || '').trim();
        const isOpen = Boolean(body?.isOpen ?? body?.is_open);
        const updated_at = new Date().toISOString();

        const payload = {
          team,
          is_open: isOpen,
          updated_by: callerId,
          updated_at,
        };

        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_registration_windows').upsert(payload, { onConflict: 'team' });
            // Also sync to settings table (team_${team}_open)
            await supabaseAdmin.from('settings').upsert({
              key: `team_${team}_open`,
              value: isOpen ? 'true' : 'false',
            });
          } catch {}
        }

        memoryStore.regWindows.set(team, payload as MemoryRegWindow);
        return { statusCode: 200, body: { success: true, data: payload } };
      }

      default:
        return {
          statusCode: 400,
          body: {
            success: false,
            error: `Unknown operations studio action: ${op}`,
            code: 'UNKNOWN_OPERATION',
          },
        };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operations Studio internal error';
    console.error(`[OperationsAdmin] Error executing ${op}:`, err);
    return {
      statusCode: 500,
      body: { success: false, error: message, code: 'INTERNAL_ERROR' },
    };
  }
}
