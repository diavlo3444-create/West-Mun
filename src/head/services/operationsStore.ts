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

export interface WmShift {
  id: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  title: string;
  location: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: 'open' | 'closed';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assigned_count?: number;
}

export interface WmShiftAssignment {
  id: string;
  shift_id: string;
  person_id: string;
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled';
  assigned_by?: string | null;
  created_at: string;
  updated_at: string;
  person?: WmPerson;
  shift?: WmShift;
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
    location: string;
    starts_at: string;
    ends_at: string;
    capacity: number;
    status?: 'open' | 'closed';
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

export async function assignPersonToShift(
  shiftId: string,
  personId: string,
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled' = 'assigned',
  testToken?: string | null,
): Promise<OperationResult<WmShiftAssignment>> {
  if (testToken) {
    return callSuperAdminOperations<WmShiftAssignment>(
      'assign_to_shift',
      { shiftId, personId, status },
      testToken,
    );
  }
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
    const payload = {
      shift_id: shiftId,
      person_id: personId,
      status,
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

export async function updateAssignmentStatus(
  assignmentId: string,
  status: 'assigned' | 'completed' | 'no_show' | 'cancelled',
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

export async function listRegistrationWindows(): Promise<OperationResult<WmRegistrationWindow[]>> {
  if (!supabase) return { ok: false, error: 'Database client not initialized.' };

  try {
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
// 8. SUPER IT TEST SESSIONS DISPATCHER
// ---------------------------------------------------------------------------

async function callSuperAdminOperations<T>(
  action: string,
  payload: Record<string, unknown>,
  testToken: string,
): Promise<OperationResult<T>> {
  try {
    const res = await fetch('/api/super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        action: `wm_ops_${action}`,
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
