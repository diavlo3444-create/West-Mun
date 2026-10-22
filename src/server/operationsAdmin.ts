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
  status: 'draft' | 'open' | 'published' | 'completed' | 'closed';
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface MemoryShiftAssignment {
  id: string;
  shift_id: string;
  person_id?: string | null;
  member_id?: string | null;
  role_type?: 'co_head' | 'team_member' | 'supervisor' | 'staff';
  responsibility?: string;
  station?: string;
  notes?: string;
  is_supervisor?: boolean;
  assignee_name?: string;
  assignee_email?: string;
  status: 'assigned' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
  assigned_by?: string;
  created_at: string;
  updated_at: string;
}

interface MemoryRegWindow {
  team: string;
  is_open: boolean;
  updated_at: string;
}

interface MemoryTeamGroup {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  name: string;
  description: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface MemoryTeamGroupMember {
  id: string;
  group_id: string;
  member_id?: string | null;
  person_id?: string | null;
  member_name: string;
  member_email: string;
  role_title?: string;
  created_at: string;
}

const memoryStore = {
  people: new Map<string, MemoryPerson>(),
  projects: new Map<string, MemoryProject>(),
  stages: new Map<string, MemoryStage>(),
  members: new Map<string, MemoryMember>(), // key: `${project_id}:${person_id}`
  tasks: new Map<string, MemoryTask>(),
  shifts: new Map<string, MemoryShift>(),
  shiftAssignments: new Map<string, MemoryShiftAssignment>(),
  teamGroups: new Map<string, MemoryTeamGroup>(),
  teamGroupMembers: new Map<string, MemoryTeamGroupMember>(),
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
          description: String(body?.description || '').trim(),
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
      // 7. SHIFT ASSIGNMENTS & ROSTER CANDIDATES
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
            person: a.person_id ? memoryStore.people.get(a.person_id) || null : null,
          }));
        return { statusCode: 200, body: { success: true, data: list } };
      }

      case 'assign_shift': {
        const payload = {
          id: body?.id || crypto.randomUUID(),
          shift_id: body?.shift_id,
          person_id: body?.person_id || null,
          member_id: body?.member_id || null,
          role_type: body?.role_type || 'team_member',
          responsibility: String(body?.responsibility || '').trim(),
          station: String(body?.station || '').trim(),
          notes: String(body?.notes || '').trim(),
          is_supervisor: Boolean(body?.is_supervisor),
          assignee_name: String(body?.assignee_name || '').trim(),
          assignee_email: String(body?.assignee_email || '').trim(),
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
              person: payload.person_id ? memoryStore.people.get(payload.person_id) || null : null,
            },
          },
        };
      }

      case 'batch_assign_shifts': {
        const shiftId = body?.shift_id;
        const incoming = Array.isArray(body?.assignments) ? body.assignments : [];
        const savedAssignments: any[] = [];

        for (const item of incoming) {
          const payload = {
            id: item.id || crypto.randomUUID(),
            shift_id: shiftId,
            person_id: item.person_id || null,
            member_id: item.member_id || null,
            role_type: item.role_type || 'team_member',
            responsibility: String(item.responsibility || '').trim(),
            station: String(item.station || '').trim(),
            notes: String(item.notes || '').trim(),
            is_supervisor: Boolean(item.is_supervisor),
            assignee_name: String(item.assignee_name || '').trim(),
            assignee_email: String(item.assignee_email || '').trim(),
            status: item.status || 'assigned',
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
                savedAssignments.push(data);
                continue;
              }
            } catch {}
          }

          memoryStore.shiftAssignments.set(payload.id, payload as MemoryShiftAssignment);
          savedAssignments.push({
            ...payload,
            person: payload.person_id ? memoryStore.people.get(payload.person_id) || null : null,
          });
        }

        return { statusCode: 200, body: { success: true, data: savedAssignments } };
      }

      case 'duplicate_shift': {
        const origId = body?.shift_id;
        const newStartsAt = body?.starts_at;
        const newEndsAt = body?.ends_at;
        const newTitle = body?.title;
        const copyAssignments = Boolean(body?.copy_assignments);

        let origShift: any = null;
        if (supabaseAdmin) {
          try {
            const { data } = await supabaseAdmin.from('wm_shifts').select('*').eq('id', origId).single();
            if (data) origShift = data;
          } catch {}
        }
        if (!origShift) {
          origShift = memoryStore.shifts.get(origId);
        }

        if (!origShift) {
          return { statusCode: 404, body: { success: false, error: 'Original shift not found.' } };
        }

        const newShiftId = crypto.randomUUID();
        const newShiftPayload = {
          id: newShiftId,
          department: origShift.department,
          section: origShift.section || null,
          title: newTitle || origShift.title,
          description: origShift.description || '',
          location: origShift.location,
          starts_at: newStartsAt || origShift.starts_at,
          ends_at: newEndsAt || origShift.ends_at,
          capacity: origShift.capacity,
          status: 'open',
          created_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let createdShift: any = newShiftPayload;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin.from('wm_shifts').insert(newShiftPayload).select().single();
            if (!error && data) createdShift = data;
          } catch {}
        }
        memoryStore.shifts.set(newShiftId, createdShift as MemoryShift);

        if (copyAssignments) {
          let origAssignments: any[] = [];
          if (supabaseAdmin) {
            try {
              const { data } = await supabaseAdmin
                .from('wm_shift_assignments')
                .select('*')
                .eq('shift_id', origId)
                .neq('status', 'cancelled');
              if (data) origAssignments = data;
            } catch {}
          }
          if (origAssignments.length === 0) {
            origAssignments = Array.from(memoryStore.shiftAssignments.values()).filter(
              (a) => a.shift_id === origId && a.status !== 'cancelled'
            );
          }

          for (const a of origAssignments) {
            const copyPayload = {
              id: crypto.randomUUID(),
              shift_id: newShiftId,
              person_id: a.person_id || null,
              member_id: a.member_id || null,
              role_type: a.role_type || 'team_member',
              responsibility: a.responsibility || '',
              station: a.station || '',
              notes: a.notes || '',
              is_supervisor: Boolean(a.is_supervisor),
              assignee_name: a.assignee_name || '',
              assignee_email: a.assignee_email || '',
              status: 'assigned',
              assigned_by: callerId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (supabaseAdmin) {
              try {
                await supabaseAdmin.from('wm_shift_assignments').insert(copyPayload);
              } catch {}
            }
            memoryStore.shiftAssignments.set(copyPayload.id, copyPayload as MemoryShiftAssignment);
          }
        }

        return { statusCode: 200, body: { success: true, data: createdShift } };
      }

      case 'list_co_heads': {
        const dept = body?.department;
        const sec = body?.section;
        if (supabaseAdmin) {
          try {
            let q = supabaseAdmin.from('department_heads').select('id, head_name, email, department, section, active').eq('active', true);
            if (dept) q = q.eq('department', dept);
            if (sec) q = q.eq('section', sec);
            const { data, error } = await q.order('head_name', { ascending: true });
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }
        return {
          statusCode: 200,
          body: {
            success: true,
            data: [
              {
                id: 'test-co-head-1',
                head_name: 'Co-Head Lead',
                email: 'cohead@westmun.org',
                department: dept || 'security',
                section: sec || null,
                active: true,
              },
            ],
          },
        };
      }

      case 'list_team_members': {
        const dept = body?.department;
        const sec = body?.section;
        const teamValues = dept === 'media_press' ? ['media_press', 'media'] : [dept];

        let members: any[] = [];
        if (supabaseAdmin) {
          try {
            let q = supabaseAdmin
              .from('team_registrations')
              .select('id, full_name, email, phone, team, section, institution, status')
              .in('team', teamValues)
              .eq('status', 'accepted');
            if (sec) q = q.eq('section', sec);
            const { data, error } = await q.order('full_name', { ascending: true });
            if (!error && data) members = data;
          } catch {}
        }
        return { statusCode: 200, body: { success: true, data: members } };
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
                person: merged.person_id ? memoryStore.people.get(merged.person_id) || null : null,
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
      // 7.5. CUSTOM TEAM GROUPS & MEMBERSHIPS
      // -----------------------------------------------------------------------
      case 'list_groups': {
        const dept = body?.department;
        const sec = body?.section;

        if (supabaseAdmin) {
          try {
            let query = supabaseAdmin
              .from('wm_team_groups')
              .select('*, members:wm_team_group_members(*)');
            if (dept) query = query.eq('department', dept);
            if (sec) query = query.eq('section', sec);
            const { data, error } = await query.order('name', { ascending: true });
            if (!error && data) {
              const mapped = (data as any[]).map((g) => ({
                ...g,
                member_count: Array.isArray(g.members) ? g.members.length : 0,
              }));
              return { statusCode: 200, body: { success: true, data: mapped } };
            }
          } catch {}
        }

        let groups = Array.from(memoryStore.teamGroups.values());
        if (dept) groups = groups.filter((g) => g.department === dept);
        if (sec) groups = groups.filter((g) => g.section === sec);
        groups.sort((a, b) => a.name.localeCompare(b.name));

        const mapped = groups.map((g) => {
          const members = Array.from(memoryStore.teamGroupMembers.values()).filter(
            (m) => m.group_id === g.id
          );
          return {
            ...g,
            member_count: members.length,
            members,
          };
        });

        return { statusCode: 200, body: { success: true, data: mapped } };
      }

      case 'create_group': {
        const groupId = body?.id || crypto.randomUUID();
        const payload = {
          id: groupId,
          department: body?.department,
          section: body?.section || null,
          name: String(body?.name || '').trim(),
          description: String(body?.description || '').trim(),
          created_by: callerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const incomingMembers = Array.isArray(body?.members) ? body.members : [];
        const savedMembers: any[] = [];

        if (supabaseAdmin) {
          try {
            const { data: grpData, error: grpErr } = await supabaseAdmin
              .from('wm_team_groups')
              .insert(payload)
              .select()
              .single();

            if (!grpErr && grpData) {
              if (incomingMembers.length > 0) {
                const memberPayloads = incomingMembers.map((m: any) => ({
                  id: m.id || crypto.randomUUID(),
                  group_id: groupId,
                  member_id: m.member_id || null,
                  person_id: m.person_id || null,
                  member_name: String(m.member_name || m.name || '').trim(),
                  member_email: String(m.member_email || m.email || '').trim(),
                  role_title: String(m.role_title || m.roleTitle || '').trim(),
                  created_at: new Date().toISOString(),
                }));
                const { data: mData } = await supabaseAdmin
                  .from('wm_team_group_members')
                  .insert(memberPayloads)
                  .select();
                if (mData) savedMembers.push(...mData);
              }

              return {
                statusCode: 200,
                body: {
                  success: true,
                  data: {
                    ...grpData,
                    member_count: savedMembers.length,
                    members: savedMembers,
                  },
                },
              };
            }
          } catch {}
        }

        memoryStore.teamGroups.set(groupId, payload as MemoryTeamGroup);
        for (const m of incomingMembers) {
          const memRecord: MemoryTeamGroupMember = {
            id: m.id || crypto.randomUUID(),
            group_id: groupId,
            member_id: m.member_id || null,
            person_id: m.person_id || null,
            member_name: String(m.member_name || m.name || '').trim(),
            member_email: String(m.member_email || m.email || '').trim(),
            role_title: String(m.role_title || m.roleTitle || '').trim(),
            created_at: new Date().toISOString(),
          };
          memoryStore.teamGroupMembers.set(memRecord.id, memRecord);
          savedMembers.push(memRecord);
        }

        return {
          statusCode: 200,
          body: {
            success: true,
            data: {
              ...payload,
              member_count: savedMembers.length,
              members: savedMembers,
            },
          },
        };
      }

      case 'update_group': {
        const id = body?.id || body?.groupId;
        const updates = body?.updates || {};
        const updated_at = new Date().toISOString();

        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_team_groups')
              .update({ ...updates, updated_at })
              .eq('id', id)
              .select('*, members:wm_team_group_members(*)')
              .single();
            if (!error && data) {
              return {
                statusCode: 200,
                body: {
                  success: true,
                  data: {
                    ...data,
                    member_count: Array.isArray(data.members) ? data.members.length : 0,
                  },
                },
              };
            }
          } catch {}
        }

        const existing = memoryStore.teamGroups.get(id);
        if (existing) {
          const merged = { ...existing, ...updates, updated_at };
          memoryStore.teamGroups.set(id, merged);
          const members = Array.from(memoryStore.teamGroupMembers.values()).filter(
            (m) => m.group_id === id
          );
          return {
            statusCode: 200,
            body: {
              success: true,
              data: {
                ...merged,
                member_count: members.length,
                members,
              },
            },
          };
        }
        return { statusCode: 200, body: { success: true, data: { id, ...updates } } };
      }

      case 'delete_group': {
        const id = body?.id || body?.groupId;
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('wm_team_groups').delete().eq('id', id);
          } catch {}
        }
        memoryStore.teamGroups.delete(id);
        for (const [key, mem] of memoryStore.teamGroupMembers.entries()) {
          if (mem.group_id === id) {
            memoryStore.teamGroupMembers.delete(key);
          }
        }
        return { statusCode: 200, body: { success: true, data: null } };
      }

      case 'list_group_members': {
        const groupId = body?.groupId || body?.group_id;
        if (supabaseAdmin) {
          try {
            const { data, error } = await supabaseAdmin
              .from('wm_team_group_members')
              .select('*')
              .eq('group_id', groupId)
              .order('member_name', { ascending: true });
            if (!error && data) {
              return { statusCode: 200, body: { success: true, data } };
            }
          } catch {}
        }

        const members = Array.from(memoryStore.teamGroupMembers.values())
          .filter((m) => m.group_id === groupId)
          .sort((a, b) => a.member_name.localeCompare(b.member_name));
        return { statusCode: 200, body: { success: true, data: members } };
      }

      case 'sync_group_members': {
        const groupId = body?.groupId || body?.group_id;
        const incoming = Array.isArray(body?.members) ? body.members : [];

        if (supabaseAdmin) {
          try {
            // Delete existing members for this group
            await supabaseAdmin.from('wm_team_group_members').delete().eq('group_id', groupId);

            if (incoming.length > 0) {
              const payloads = incoming.map((m: any) => ({
                id: m.id || crypto.randomUUID(),
                group_id: groupId,
                member_id: m.member_id || null,
                person_id: m.person_id || null,
                member_name: String(m.member_name || m.name || '').trim(),
                member_email: String(m.member_email || m.email || '').trim(),
                role_title: String(m.role_title || m.roleTitle || '').trim(),
                created_at: new Date().toISOString(),
              }));
              const { data, error } = await supabaseAdmin
                .from('wm_team_group_members')
                .insert(payloads)
                .select();
              if (!error && data) {
                return { statusCode: 200, body: { success: true, data } };
              }
            } else {
              return { statusCode: 200, body: { success: true, data: [] } };
            }
          } catch {}
        }

        // Memory store fallback
        for (const [key, mem] of memoryStore.teamGroupMembers.entries()) {
          if (mem.group_id === groupId) {
            memoryStore.teamGroupMembers.delete(key);
          }
        }

        const saved: MemoryTeamGroupMember[] = [];
        for (const m of incoming) {
          const rec: MemoryTeamGroupMember = {
            id: m.id || crypto.randomUUID(),
            group_id: groupId,
            member_id: m.member_id || null,
            person_id: m.person_id || null,
            member_name: String(m.member_name || m.name || '').trim(),
            member_email: String(m.member_email || m.email || '').trim(),
            role_title: String(m.role_title || m.roleTitle || '').trim(),
            created_at: new Date().toISOString(),
          };
          memoryStore.teamGroupMembers.set(rec.id, rec);
          saved.push(rec);
        }

        return { statusCode: 200, body: { success: true, data: saved } };
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
