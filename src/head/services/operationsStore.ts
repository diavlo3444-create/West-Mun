import { supabase } from '../../lib/supabase';
import type { DepartmentKey, SectionKey } from '../departments';

export interface WmPerson {
  id: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  auth_user_id?: string | null;
  source_type: 'manual' | 'delegate' | 'team_registration';
  source_record_id?: string | null;
  department: DepartmentKey;
  section?: SectionKey | null;
  role_title: string;
  status: 'active' | 'pending' | 'inactive';
  private_notes: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WmProject {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  title: string;
  brief: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  due_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WmProjectStage {
  id: string;
  project_id: string;
  title: string;
  sort_order: number;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
}

export interface WmProjectMember {
  project_id: string;
  person_id: string;
  project_role: string;
  added_by?: string | null;
  created_at: string;
  person?: WmPerson;
}

export interface WmProjectTask {
  id: string;
  project_id: string;
  stage_id?: string | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_person_id?: string | null;
  due_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assigned_person?: WmPerson;
}

export type ShiftStatus = 'draft' | 'open' | 'published' | 'completed' | 'closed';
export type ShiftAssignmentStatus = 'assigned' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
export type ShiftRoleType = 'co_head' | 'team_member' | 'supervisor' | 'staff';

export interface WmShift {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  title: string;
  location: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: ShiftStatus;
  description?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assigned_count?: number;
}

export interface WmShiftAssignment {
  id: string;
  shift_id: string;
  person_id?: string | null;
  member_id?: string | null;
  role_type?: ShiftRoleType;
  responsibility?: string;
  station?: string;
  notes?: string;
  is_supervisor?: boolean;
  assignee_name?: string;
  assignee_email?: string;
  status: ShiftAssignmentStatus;
  assigned_by?: string | null;
  created_at: string;
  updated_at: string;
  person?: WmPerson | null;
  shift?: WmShift;
}

export interface ShiftCandidate {
  id: string;
  type: 'co_head' | 'team_member';
  name: string;
  email: string;
  phone?: string | null;
  roleTitle: string;
  institution?: string | null;
  section?: SectionKey | null;
  status: string;
  sourceId: string;
  personId?: string | null;
  memberId?: string | null;
}

export interface WmTeamGroup {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  name: string;
  description: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  members?: WmTeamGroupMember[];
}

export interface WmTeamGroupMember {
  id: string;
  group_id: string;
  member_id?: string | null;
  person_id?: string | null;
  member_name: string;
  member_email: string;
  role_title?: string;
  created_at: string;
}

export interface WmRegistrationWindow {
  team: string;
  is_open: boolean;
  updated_by?: string | null;
  updated_at: string;
}

export interface OperationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// 1. WM_PEOPLE (CUSTOM OPERATIONAL ROLES & STAFF)
// ---------------------------------------------------------------------------

export async function listDepartmentPeople(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<WmPerson[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmPerson[]>('list_people', { department, section }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    let query = supabase
      .from('wm_people')
      .select('*')
      .eq('department', department)
      .order('role_title', { ascending: true })
      .order('display_name', { ascending: true });

    if (section) {
      query = query.eq('section', section);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { ok: true, data: (data as WmPerson[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load people.';
    return { ok: false, error: msg };
  }
}

export async function createDepartmentPerson(
  input: {
    display_name: string;
    email?: string;
    phone?: string;
    department: DepartmentKey;
    section?: SectionKey | null;
    role_title: string;
    status?: 'active' | 'pending' | 'inactive';
    private_notes?: string;
    source_type?: 'manual' | 'delegate' | 'team_registration';
    source_record_id?: string | null;
  },
  testToken?: string | null,
): Promise<OperationResult<WmPerson>> {
  if (testToken) {
    return callSuperAdminOperations<WmPerson>('create_person', input, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      display_name: input.display_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      department: input.department,
      section: input.section || null,
      role_title: input.role_title.trim(),
      status: input.status || 'active',
      private_notes: input.private_notes?.trim() || '',
      source_type: input.source_type || 'manual',
      source_record_id: input.source_record_id || null,
    };

    const { data, error } = await supabase.from('wm_people').insert(payload).select().single();
    if (error) throw error;
    return { ok: true, data: data as WmPerson };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create person.';
    return { ok: false, error: msg };
  }
}

export async function updateDepartmentPerson(
  id: string,
  updates: Partial<Omit<WmPerson, 'id' | 'created_at' | 'updated_at' | 'created_by'>>,
  testToken?: string | null,
): Promise<OperationResult<WmPerson>> {
  if (testToken) {
    return callSuperAdminOperations<WmPerson>('update_person', { id, updates }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('wm_people')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmPerson };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update person.';
    return { ok: false, error: msg };
  }
}

export async function deleteDepartmentPerson(
  id: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('delete_person', { id }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_people').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete person.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2. WM_PROJECTS (MEDIA & DESIGN PRODUCTIONS)
// ---------------------------------------------------------------------------

export async function listDepartmentProjects(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<WmProject[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmProject[]>('list_projects', { department, section }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    let query = supabase
      .from('wm_projects')
      .select('*')
      .eq('department', department)
      .order('created_at', { ascending: false });

    if (section) {
      query = query.eq('section', section);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { ok: true, data: (data as WmProject[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load projects.';
    return { ok: false, error: msg };
  }
}

export async function createDepartmentProject(
  input: {
    department: DepartmentKey;
    section?: SectionKey | null;
    title: string;
    brief: string;
    status?: 'planning' | 'active' | 'completed' | 'archived';
    due_at?: string | null;
  },
  testToken?: string | null,
): Promise<OperationResult<WmProject>> {
  if (testToken) {
    return callSuperAdminOperations<WmProject>('create_project', input, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      department: input.department,
      section: input.section || null,
      title: input.title.trim(),
      brief: input.brief.trim(),
      status: input.status || 'planning',
      due_at: input.due_at || null,
    };

    const { data, error } = await supabase.from('wm_projects').insert(payload).select().single();
    if (error) throw error;
    return { ok: true, data: data as WmProject };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create project.';
    return { ok: false, error: msg };
  }
}

export async function updateDepartmentProject(
  id: string,
  updates: Partial<Omit<WmProject, 'id' | 'created_at' | 'updated_at' | 'created_by'>>,
  testToken?: string | null,
): Promise<OperationResult<WmProject>> {
  if (testToken) {
    return callSuperAdminOperations<WmProject>('update_project', { id, updates }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('wm_projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmProject };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update project.';
    return { ok: false, error: msg };
  }
}

export async function deleteDepartmentProject(
  id: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('delete_project', { id }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_projects').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete project.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3. WM_PROJECT_STAGES
// ---------------------------------------------------------------------------

export async function listProjectStages(
  projectId: string,
  testToken?: string | null,
): Promise<OperationResult<WmProjectStage[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectStage[]>('list_stages', { projectId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_project_stages')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data as WmProjectStage[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load stages.';
    return { ok: false, error: msg };
  }
}

export async function createProjectStage(
  input: {
    project_id: string;
    title: string;
    sort_order?: number;
    status?: 'todo' | 'in_progress' | 'done';
  },
  testToken?: string | null,
): Promise<OperationResult<WmProjectStage>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectStage>('create_stage', input, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      project_id: input.project_id,
      title: input.title.trim(),
      sort_order: input.sort_order ?? 0,
      status: input.status || 'todo',
    };

    const { data, error } = await supabase.from('wm_project_stages').insert(payload).select().single();
    if (error) throw error;
    return { ok: true, data: data as WmProjectStage };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create stage.';
    return { ok: false, error: msg };
  }
}

export async function updateProjectStage(
  id: string,
  updates: Partial<Omit<WmProjectStage, 'id' | 'project_id' | 'created_at'>>,
  testToken?: string | null,
): Promise<OperationResult<WmProjectStage>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectStage>('update_stage', { id, updates }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_project_stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmProjectStage };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update stage.';
    return { ok: false, error: msg };
  }
}

export async function deleteProjectStage(
  id: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('delete_stage', { id }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_project_stages').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete stage.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 4. WM_PROJECT_MEMBERS
// ---------------------------------------------------------------------------

export async function listProjectMembers(
  projectId: string,
  testToken?: string | null,
): Promise<OperationResult<WmProjectMember[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectMember[]>('list_members', { projectId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_project_members')
      .select('*, person:wm_people(*)')
      .eq('project_id', projectId);

    if (error) throw error;
    return { ok: true, data: (data as WmProjectMember[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load project members.';
    return { ok: false, error: msg };
  }
}

export async function addProjectMember(
  input: {
    project_id: string;
    person_id: string;
    project_role: string;
  },
  testToken?: string | null,
): Promise<OperationResult<WmProjectMember>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectMember>('add_member', input, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      project_id: input.project_id,
      person_id: input.person_id,
      project_role: input.project_role.trim(),
    };

    const { data, error } = await supabase
      .from('wm_project_members')
      .insert(payload)
      .select('*, person:wm_people(*)')
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmProjectMember };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to add project member.';
    return { ok: false, error: msg };
  }
}

export async function removeProjectMember(
  projectId: string,
  personId: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('remove_member', { projectId, personId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase
      .from('wm_project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('person_id', personId);

    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove project member.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 5. WM_PROJECT_TASKS
// ---------------------------------------------------------------------------

export async function listProjectTasks(
  projectId: string,
  testToken?: string | null,
): Promise<OperationResult<WmProjectTask[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectTask[]>('list_tasks', { projectId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_project_tasks')
      .select('*, assigned_person:wm_people(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data as WmProjectTask[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load tasks.';
    return { ok: false, error: msg };
  }
}

export async function createProjectTask(
  input: {
    project_id: string;
    stage_id?: string | null;
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigned_person_id?: string | null;
    due_at?: string | null;
  },
  testToken?: string | null,
): Promise<OperationResult<WmProjectTask>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectTask>('create_task', input, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      project_id: input.project_id,
      stage_id: input.stage_id || null,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      assigned_person_id: input.assigned_person_id || null,
      due_at: input.due_at || null,
    };

    const { data, error } = await supabase
      .from('wm_project_tasks')
      .insert(payload)
      .select('*, assigned_person:wm_people(*)')
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmProjectTask };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create task.';
    return { ok: false, error: msg };
  }
}

export async function updateProjectTask(
  id: string,
  updates: Partial<Omit<WmProjectTask, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'created_by' | 'assigned_person'>>,
  testToken?: string | null,
): Promise<OperationResult<WmProjectTask>> {
  if (testToken) {
    return callSuperAdminOperations<WmProjectTask>('update_task', { id, updates }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('wm_project_tasks')
      .update(payload)
      .eq('id', id)
      .select('*, assigned_person:wm_people(*)')
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmProjectTask };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update task.';
    return { ok: false, error: msg };
  }
}

export async function deleteProjectTask(
  id: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('delete_task', { id }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_project_tasks').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete task.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 6. WM_SHIFTS & WM_SHIFT_ASSIGNMENTS (VOLUNTEER & SECURITY OPERATIONS)
// ---------------------------------------------------------------------------

export async function listDepartmentShifts(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<WmShift[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmShift[]>('list_shifts', { department, section }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    let query = supabase
      .from('wm_shifts')
      .select('*')
      .eq('department', department)
      .order('starts_at', { ascending: true });

    if (section) {
      query = query.eq('section', section);
    }

    const { data: shifts, error: sErr } = await query;
    if (sErr) throw sErr;

    // Fetch assignments count for each shift
    const shiftIds = (shifts || []).map((s: WmShift) => s.id);
    let countsMap: Record<string, number> = {};
    if (shiftIds.length > 0) {
      const { data: assignments } = await supabase
        .from('wm_shift_assignments')
        .select('shift_id, status')
        .in('shift_id', shiftIds);

      (assignments || []).forEach((a: { shift_id: string; status: string }) => {
        if (a.status !== 'cancelled') {
          countsMap[a.shift_id] = (countsMap[a.shift_id] || 0) + 1;
        }
      });
    }

    const combined: WmShift[] = (shifts || []).map((s: WmShift) => ({
      ...s,
      assigned_count: countsMap[s.id] || 0,
    }));

    return { ok: true, data: combined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load shifts.';
    return { ok: false, error: msg };
  }
}

export async function createDepartmentShift(
  input: {
    department: DepartmentKey;
    section?: SectionKey | null;
    title: string;
    description?: string;
    location: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    status?: ShiftStatus;
  },
  testToken?: string | null,
): Promise<OperationResult<WmShift>> {
  if (testToken) {
    return callSuperAdminOperations<WmShift>('create_shift', input, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      department: input.department,
      section: input.section || null,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      location: input.location.trim(),
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      capacity: Math.max(1, input.capacity),
      status: input.status || 'open',
    };

    const { data, error } = await supabase.from('wm_shifts').insert(payload).select().single();
    if (error) throw error;
    return { ok: true, data: data as WmShift };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create shift.';
    return { ok: false, error: msg };
  }
}

export async function updateDepartmentShift(
  id: string,
  updates: Partial<Omit<WmShift, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'assigned_count'>>,
  testToken?: string | null,
): Promise<OperationResult<WmShift>> {
  if (testToken) {
    return callSuperAdminOperations<WmShift>('update_shift', { id, updates }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('wm_shifts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmShift };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update shift.';
    return { ok: false, error: msg };
  }
}

export async function deleteDepartmentShift(
  id: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('delete_shift', { id }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_shifts').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete shift.';
    return { ok: false, error: msg };
  }
}

export async function listShiftAssignments(
  shiftId: string,
  testToken?: string | null,
): Promise<OperationResult<WmShiftAssignment[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmShiftAssignment[]>('list_shift_assignments', { shiftId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_shift_assignments')
      .select('*, person:wm_people(*)')
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data as WmShiftAssignment[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load shift assignments.';
    return { ok: false, error: msg };
  }
}

export interface AssignShiftInput {
  shift_id: string;
  person_id?: string | null;
  member_id?: string | null;
  role_type?: ShiftRoleType;
  responsibility?: string;
  station?: string;
  notes?: string;
  is_supervisor?: boolean;
  assignee_name?: string;
  assignee_email?: string;
  status?: ShiftAssignmentStatus;
}

export function assignPersonToShift(
  input: AssignShiftInput,
  testToken?: string | null,
): Promise<OperationResult<WmShiftAssignment>>;
export function assignPersonToShift(
  shiftId: string,
  personId: string,
  status?: ShiftAssignmentStatus,
  testToken?: string | null,
): Promise<OperationResult<WmShiftAssignment>>;
export async function assignPersonToShift(
  inputOrShiftId: AssignShiftInput | string,
  personIdOrStatusOrToken?: string | null,
  statusArg?: ShiftAssignmentStatus,
  testTokenArg?: string | null,
): Promise<OperationResult<WmShiftAssignment>> {
  let normalizedInput: AssignShiftInput;
  let testToken: string | null | undefined;

  if (typeof inputOrShiftId === 'object') {
    normalizedInput = inputOrShiftId;
    testToken = personIdOrStatusOrToken;
  } else {
    normalizedInput = {
      shift_id: inputOrShiftId,
      person_id: personIdOrStatusOrToken || '',
      status: statusArg || 'assigned',
    };
    testToken = testTokenArg;
  }

  if (testToken) {
    return callSuperAdminOperations<WmShiftAssignment>('assign_shift', normalizedInput as any, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      shift_id: normalizedInput.shift_id,
      person_id: normalizedInput.person_id || null,
      member_id: normalizedInput.member_id || null,
      role_type: normalizedInput.role_type || 'team_member',
      responsibility: normalizedInput.responsibility?.trim() || '',
      station: normalizedInput.station?.trim() || '',
      notes: normalizedInput.notes?.trim() || '',
      is_supervisor: Boolean(normalizedInput.is_supervisor),
      assignee_name: normalizedInput.assignee_name?.trim() || '',
      assignee_email: normalizedInput.assignee_email?.trim() || '',
      status: normalizedInput.status || 'assigned',
    };

    const { data, error } = await supabase
      .from('wm_shift_assignments')
      .insert(payload)
      .select('*, person:wm_people(*)')
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmShiftAssignment };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to assign person to shift.';
    return { ok: false, error: msg };
  }
}

export async function batchAssignShiftPeople(
  shiftId: string,
  assignments: Array<Omit<AssignShiftInput, 'shift_id'>>,
  testToken?: string | null,
): Promise<OperationResult<WmShiftAssignment[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmShiftAssignment[]>(
      'batch_assign_shifts',
      { shift_id: shiftId, assignments },
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payloads = assignments.map((a) => ({
      shift_id: shiftId,
      person_id: a.person_id || null,
      member_id: a.member_id || null,
      role_type: a.role_type || 'team_member',
      responsibility: a.responsibility?.trim() || '',
      station: a.station?.trim() || '',
      notes: a.notes?.trim() || '',
      is_supervisor: Boolean(a.is_supervisor),
      assignee_name: a.assignee_name?.trim() || '',
      assignee_email: a.assignee_email?.trim() || '',
      status: a.status || 'assigned',
    }));

    if (payloads.length === 0) return { ok: true, data: [] };

    const { data, error } = await supabase
      .from('wm_shift_assignments')
      .insert(payloads)
      .select('*, person:wm_people(*)');

    if (error) throw error;
    return { ok: true, data: (data as WmShiftAssignment[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save shift assignments.';
    return { ok: false, error: msg };
  }
}

export async function duplicateDepartmentShift(
  shiftId: string,
  input: {
    starts_at: string;
    ends_at: string;
    title?: string;
    copyAssignments?: boolean;
  },
  testToken?: string | null,
): Promise<OperationResult<WmShift>> {
  if (testToken) {
    return callSuperAdminOperations<WmShift>(
      'duplicate_shift',
      {
        shift_id: shiftId,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        title: input.title,
        copy_assignments: input.copyAssignments,
      },
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data: origShift, error: sErr } = await supabase
      .from('wm_shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (sErr || !origShift) throw sErr || new Error('Original shift not found.');

    const newShiftPayload = {
      department: origShift.department,
      section: origShift.section || null,
      title: input.title?.trim() || origShift.title,
      description: origShift.description || '',
      location: origShift.location,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      capacity: origShift.capacity,
      status: 'open' as ShiftStatus,
    };

    const { data: newShift, error: nErr } = await supabase
      .from('wm_shifts')
      .insert(newShiftPayload)
      .select()
      .single();

    if (nErr || !newShift) throw nErr || new Error('Failed to clone shift.');

    if (input.copyAssignments) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('wm_shift_assignments')
        .select('*')
        .eq('shift_id', shiftId)
        .neq('status', 'cancelled');
      if (assignmentsError) {
        await supabase.from('wm_shifts').delete().eq('id', newShift.id);
        throw assignmentsError;
      }

      if (assignments && assignments.length > 0) {
        const copyPayloads = assignments.map((a: any) => ({
          shift_id: newShift.id,
          person_id: a.person_id || null,
          member_id: a.member_id || null,
          role_type: a.role_type || 'team_member',
          responsibility: a.responsibility || '',
          station: a.station || '',
          notes: a.notes || '',
          is_supervisor: Boolean(a.is_supervisor),
          assignee_name: a.assignee_name || '',
          assignee_email: a.assignee_email || '',
          status: 'assigned' as ShiftAssignmentStatus,
        }));
        const { error: copyError } = await supabase.from('wm_shift_assignments').insert(copyPayloads);
        if (copyError) {
          await supabase.from('wm_shifts').delete().eq('id', newShift.id);
          throw copyError;
        }
      }
    }

    return { ok: true, data: newShift as WmShift };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to duplicate shift.';
    return { ok: false, error: msg };
  }
}

export async function listDepartmentCoHeads(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<ShiftCandidate[]>> {
  if (testToken) {
    const r = await callSuperAdminOperations<any[]>('list_co_heads', { department, section }, testToken);
    if (!r.ok) return { ok: false, error: r.error };
    const candidates: ShiftCandidate[] = (r.data || []).map((h) => ({
      id: h.id,
      type: 'co_head',
      name: h.head_name || (h.email ? h.email.split('@')[0] : 'Department Head'),
      email: h.email,
      phone: null,
      roleTitle: 'Department Head / Co-Head',
      institution: 'WEST MUN Secretariat',
      section: h.section || null,
      status: h.active ? 'active' : 'inactive',
      sourceId: h.id,
      memberId: h.id,
    }));
    return { ok: true, data: candidates };
  }

  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    let query = supabase
      .from('department_heads')
      .select('id, head_name, email, department, section, active')
      .eq('department', department)
      .eq('active', true)
      .order('head_name', { ascending: true });

    if (section) {
      query = query.or(`section.eq.${section},section.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const candidates: ShiftCandidate[] = (data || []).map((h: any) => ({
      id: h.id,
      type: 'co_head',
      name: h.head_name || (h.email ? h.email.split('@')[0] : 'Department Head'),
      email: h.email,
      phone: null,
      roleTitle: 'Department Head / Co-Head',
      institution: 'WEST MUN Secretariat',
      section: h.section || null,
      status: h.active ? 'active' : 'inactive',
      sourceId: h.id,
      memberId: h.id,
    }));

    return { ok: true, data: candidates };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query department heads.';
    return { ok: false, error: msg };
  }
}

export async function listDepartmentTeamMembers(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<ShiftCandidate[]>> {
  if (testToken) {
    const [tmRes, peopleRes] = await Promise.all([
      callSuperAdminOperations<any[]>('list_team_members', { department, section }, testToken),
      listDepartmentPeople(department, section, testToken),
    ]);

    const candidates: ShiftCandidate[] = [];
    const seenEmails = new Set<string>();

    if (tmRes.ok && tmRes.data) {
      for (const m of tmRes.data) {
        if (m.email) seenEmails.add(m.email.toLowerCase());
        candidates.push({
          id: m.id,
          type: 'team_member',
          name: m.full_name || 'Team Member',
          email: m.email || '',
          phone: m.phone || null,
          roleTitle: 'Team Member',
          institution: m.institution || null,
          section: m.section || null,
          status: m.status || 'accepted',
          sourceId: m.id,
          memberId: m.id,
        });
      }
    }

    if (peopleRes.ok && peopleRes.data) {
      for (const p of peopleRes.data) {
        if (p.email && seenEmails.has(p.email.toLowerCase())) continue;
        candidates.push({
          id: p.id,
          type: 'team_member',
          name: p.display_name,
          email: p.email || '',
          phone: p.phone || null,
          roleTitle: p.role_title || 'Operations Staff',
          institution: null,
          section: p.section || null,
          status: p.status || 'active',
          sourceId: p.id,
          personId: p.id,
        });
      }
    }

    return { ok: true, data: candidates };
  }

  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    const teamValues = department === 'media_press' ? ['media_press', 'media'] : [department];

    let query = supabase
      .from('team_registrations')
      .select('id, full_name, email, phone, institution, team, section, status')
      .in('team', teamValues)
      .eq('status', 'accepted')
      .order('full_name', { ascending: true });

    if (section) {
      query = query.eq('section', section);
    }

    const [{ data: regs, error: rErr }, peopleResult] = await Promise.all([
      query,
      listDepartmentPeople(department, section, null),
    ]);

    if (rErr) throw rErr;

    const candidates: ShiftCandidate[] = [];
    const seenEmails = new Set<string>();

    for (const r of regs || []) {
      if (r.email) seenEmails.add(r.email.toLowerCase());
      candidates.push({
        id: r.id,
        type: 'team_member',
        name: r.full_name || 'Team Member',
        email: r.email || '',
        phone: r.phone || null,
        roleTitle: 'Team Member',
        institution: r.institution || null,
        section: r.section || null,
        status: r.status || 'accepted',
        sourceId: r.id,
        memberId: r.id,
      });
    }

    if (peopleResult.ok && peopleResult.data) {
      for (const p of peopleResult.data) {
        if (p.email && seenEmails.has(p.email.toLowerCase())) continue;
        candidates.push({
          id: p.id,
          type: 'team_member',
          name: p.display_name,
          email: p.email || '',
          phone: p.phone || null,
          roleTitle: p.role_title || 'Operations Staff',
          institution: null,
          section: p.section || null,
          status: p.status || 'active',
          sourceId: p.id,
          personId: p.id,
        });
      }
    }

    return { ok: true, data: candidates };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query department team members.';
    return { ok: false, error: msg };
  }
}

export async function listDepartmentRosterCandidates(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<{ coHeads: ShiftCandidate[]; teamMembers: ShiftCandidate[] }>> {
  const [headsRes, membersRes] = await Promise.all([
    listDepartmentCoHeads(department, section, testToken),
    listDepartmentTeamMembers(department, section, testToken),
  ]);

  if (!headsRes.ok && !membersRes.ok) {
    return { ok: false, error: headsRes.error || membersRes.error || 'Could not load shift candidates.' };
  }

  return {
    ok: true,
    data: {
      coHeads: headsRes.data || [],
      teamMembers: membersRes.data || [],
    },
  };
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: ShiftAssignmentStatus,
  testToken?: string | null,
): Promise<OperationResult<WmShiftAssignment>> {
  if (testToken) {
    return callSuperAdminOperations<WmShiftAssignment>(
      'update_assignment_status',
      { assignmentId, status },
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_shift_assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select('*, person:wm_people(*)')
      .single();

    if (error) throw error;
    return { ok: true, data: data as WmShiftAssignment };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update assignment.';
    return { ok: false, error: msg };
  }
}

export async function removeShiftAssignment(
  assignmentId: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('remove_assignment', { assignmentId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_shift_assignments').delete().eq('id', assignmentId);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove assignment.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 7. WM_REGISTRATION_WINDOWS
// ---------------------------------------------------------------------------

export async function listRegistrationWindows(
  testToken?: string | null,
): Promise<OperationResult<WmRegistrationWindow[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmRegistrationWindow[]>(
      'list_registration_windows',
      {},
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    const { data, error } = await supabase
      .from('wm_registration_windows')
      .select('*')
      .order('team', { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data as WmRegistrationWindow[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load registration windows.';
    return { ok: false, error: msg };
  }
}

export async function setRegistrationWindowStatus(
  team: string,
  isOpen: boolean,
  testToken?: string | null,
): Promise<OperationResult<WmRegistrationWindow>> {
  if (testToken) {
    return callSuperAdminOperations<WmRegistrationWindow>(
      'set_registration_window',
      { team, isOpen },
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    const payload = {
      team,
      is_open: isOpen,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('wm_registration_windows')
      .upsert(payload, { onConflict: 'team' })
      .select()
      .single();

    if (error) throw error;

    // Keep public.settings team switch in sync for backward compatibility
    try {
      await supabase.from('settings').upsert({
        key: `team_${team}_open`,
        value: isOpen ? 'true' : 'false',
      });
    } catch {}

    return { ok: true, data: data as WmRegistrationWindow };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update registration window.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 7.5. WM_TEAM_GROUPS & WM_TEAM_GROUP_MEMBERS (CUSTOM TEAMS & BULK ASSIGNMENT)
// ---------------------------------------------------------------------------

export async function listDepartmentGroups(
  department: DepartmentKey,
  section?: SectionKey | null,
  testToken?: string | null,
): Promise<OperationResult<WmTeamGroup[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmTeamGroup[]>('list_groups', { department, section }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    await ensureFreshSupabaseSession();
    let query = supabase
      .from('wm_team_groups')
      .select('*, members:wm_team_group_members(*)')
      .eq('department', department)
      .order('name', { ascending: true });

    if (section) {
      query = query.eq('section', section);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped: WmTeamGroup[] = (data || []).map((g: any) => ({
      ...g,
      member_count: Array.isArray(g.members) ? g.members.length : 0,
    }));

    return { ok: true, data: mapped };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load team groups.';
    return { ok: false, error: msg };
  }
}

export async function createDepartmentGroup(
  input: {
    department: DepartmentKey;
    section?: SectionKey | null;
    name: string;
    description?: string;
    members?: Array<{
      member_id?: string | null;
      person_id?: string | null;
      member_name: string;
      member_email: string;
      role_title?: string;
    }>;
  },
  testToken?: string | null,
): Promise<OperationResult<WmTeamGroup>> {
  if (testToken) {
    return callSuperAdminOperations<WmTeamGroup>('create_group', input as any, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const groupPayload = {
      department: input.department,
      section: input.section || null,
      name: input.name.trim(),
      description: input.description?.trim() || '',
    };

    const { data: grp, error: gErr } = await supabase
      .from('wm_team_groups')
      .insert(groupPayload)
      .select()
      .single();

    if (gErr || !grp) throw gErr || new Error('Failed to create group.');

    let savedMembers: WmTeamGroupMember[] = [];
    if (input.members && input.members.length > 0) {
      const memberPayloads = input.members.map((m) => ({
        group_id: grp.id,
        member_id: m.member_id || null,
        person_id: m.person_id || null,
        member_name: m.member_name.trim(),
        member_email: m.member_email.trim(),
        role_title: m.role_title?.trim() || '',
      }));

      const { data: mData, error: mErr } = await supabase
        .from('wm_team_group_members')
        .insert(memberPayloads)
        .select();

      if (mErr) {
        await supabase.from('wm_team_groups').delete().eq('id', grp.id);
        throw mErr;
      }
      savedMembers = (mData || []) as WmTeamGroupMember[];
    }

    return {
      ok: true,
      data: {
        ...(grp as WmTeamGroup),
        member_count: savedMembers.length,
        members: savedMembers,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create group.';
    return { ok: false, error: msg };
  }
}

export async function updateDepartmentGroup(
  id: string,
  updates: { name?: string; description?: string },
  testToken?: string | null,
): Promise<OperationResult<WmTeamGroup>> {
  if (testToken) {
    return callSuperAdminOperations<WmTeamGroup>('update_group', { id, updates }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('wm_team_groups')
      .update(payload)
      .eq('id', id)
      .select('*, members:wm_team_group_members(*)')
      .single();

    if (error) throw error;
    return {
      ok: true,
      data: {
        ...(data as WmTeamGroup),
        member_count: Array.isArray((data as any).members) ? (data as any).members.length : 0,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update group.';
    return { ok: false, error: msg };
  }
}

export async function deleteDepartmentGroup(
  id: string,
  testToken?: string | null,
): Promise<OperationResult<void>> {
  if (testToken) {
    return callSuperAdminOperations<void>('delete_group', { id }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { error } = await supabase.from('wm_team_groups').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete group.';
    return { ok: false, error: msg };
  }
}

export async function listGroupMembers(
  groupId: string,
  testToken?: string | null,
): Promise<OperationResult<WmTeamGroupMember[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmTeamGroupMember[]>('list_group_members', { groupId }, testToken);
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const { data, error } = await supabase
      .from('wm_team_group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('member_name', { ascending: true });

    if (error) throw error;
    return { ok: true, data: (data as WmTeamGroupMember[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load group members.';
    return { ok: false, error: msg };
  }
}

export async function syncGroupMembers(
  groupId: string,
  members: Array<{
    member_id?: string | null;
    person_id?: string | null;
    member_name: string;
    member_email: string;
    role_title?: string;
  }>,
  testToken?: string | null,
): Promise<OperationResult<WmTeamGroupMember[]>> {
  if (testToken) {
    return callSuperAdminOperations<WmTeamGroupMember[]>(
      'sync_group_members',
      { groupId, members },
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    // Snapshot current members so a failed replacement can be rolled back.
    const { data: previousMembers, error: readError } = await supabase
      .from('wm_team_group_members')
      .select('member_id, person_id, member_name, member_email, role_title')
      .eq('group_id', groupId);
    if (readError) throw readError;

    // Delete existing members and stop immediately if deletion fails.
    const { error: deleteError } = await supabase.from('wm_team_group_members').delete().eq('group_id', groupId);
    if (deleteError) throw deleteError;

    const payloads = members.map((m) => ({
      group_id: groupId,
      member_id: m.member_id || null,
      person_id: m.person_id || null,
      member_name: m.member_name.trim(),
      member_email: m.member_email.trim(),
      role_title: m.role_title?.trim() || '',
    }));

    if (payloads.length === 0) {
      return { ok: true, data: [] };
    }

    const { data, error } = await supabase
      .from('wm_team_group_members')
      .insert(payloads)
      .select();

    if (error) {
      // Best-effort restore: do not silently leave a group empty after a failed edit.
      if (previousMembers?.length) {
        const restorePayloads = previousMembers.map((m: any) => ({ ...m, group_id: groupId }));
        const { error: restoreError } = await supabase.from('wm_team_group_members').insert(restorePayloads);
        if (restoreError) {
          throw new Error(`Could not save new group members (${error.message}) and restoring the previous members also failed (${restoreError.message}). Please refresh and verify this group.`);
        }
      }
      throw error;
    }
    return { ok: true, data: (data as WmTeamGroupMember[]) || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update group members.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 8. SUPER IT TEST SESSIONS DISPATCHER & SESSION REFRESH
// ---------------------------------------------------------------------------

async function ensureFreshSupabaseSession(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
      await supabase.auth.refreshSession();
    }
  } catch {}
}

async function callSuperAdminOperations<T>(
  action: string,
  payload: Record<string, unknown>,
  testToken: string,
): Promise<OperationResult<T>> {
  try {
    const res = await fetch(`/api/super-admin?action=operations&op=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        action: `wm_ops_${action}`,
        op: action,
        ...payload,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || `Super Admin operation ${action} failed.` };
    }
    return { ok: true, data: data.data as T };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : `Failed to reach server for ${action}.`;
    return { ok: false, error: msg };
  }
}
