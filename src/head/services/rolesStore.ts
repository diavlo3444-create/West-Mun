import { supabase } from '../../lib/supabase';
import type { DepartmentKey, SectionKey } from '../departments';

export interface ApprovedMember {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  institution?: string | null;
  team: string;
  section?: SectionKey | null;
  status: string;
  experience?: string | null;
  statement?: string | null;
  created_at: string;
}

export interface DepartmentPosition {
  id: string;
  created_at: string;
  updated_at: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  title: string;
  description: string;
  parent_position_id: string | null;
  member_id: string | null;
  sort_order: number;
  member?: ApprovedMember | null;
  parent_title?: string;
  child_count?: number;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface DepartmentTask {
  id: string;
  created_at: string;
  updated_at: string;
  department: DepartmentKey;
  section?: SectionKey | null;
  position_id: string | null;
  member_id: string;
  supervisor_member_id: string | null;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  location: string;
  notes: string;
  member?: ApprovedMember | null;
  supervisor?: ApprovedMember | null;
  position_title?: string;
}

export interface RolesScope {
  department: DepartmentKey;
  section?: SectionKey | null;
  testToken?: string | null;
}

export interface PositionInput {
  title: string;
  description?: string;
  parent_position_id?: string | null;
  member_id?: string | null;
  sort_order?: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  member_id: string;
  position_id?: string | null;
  supervisor_member_id?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string | null;
  location?: string;
  notes?: string;
}

export interface RolesResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  isFallback?: boolean;
}

// ---------------------------------------------------------------------------
// LocalStorage Resilient Cache Keys
// ---------------------------------------------------------------------------
function getCacheKey(type: string, scope: RolesScope): string {
  const sec = scope.section ? scope.section : 'general';
  return `westmun_roles_${type}_${scope.department}_${sec}`;
}

function loadLocalCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ---------------------------------------------------------------------------
// Circular Hierarchy Validation
// ---------------------------------------------------------------------------
export function getDescendantPositionIds(
  positions: DepartmentPosition[],
  rootId: string
): Set<string> {
  const descendants = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const p of positions) {
      if (p.parent_position_id === current && !descendants.has(p.id)) {
        descendants.add(p.id);
        queue.push(p.id);
      }
    }
  }

  return descendants;
}

export function validateNoCircularHierarchy(
  positions: DepartmentPosition[],
  positionId: string,
  targetParentId: string | null
): { valid: boolean; reason?: string } {
  if (!targetParentId) {
    return { valid: true };
  }

  if (targetParentId === positionId) {
    return {
      valid: false,
      reason: 'A position cannot report to itself.',
    };
  }

  const descendants = getDescendantPositionIds(positions, positionId);
  if (descendants.has(targetParentId)) {
    return {
      valid: false,
      reason: 'Circular hierarchy detected: a position cannot report to one of its own sub-teams or subordinate positions.',
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// 1. List Approved Members
// Only accepted members belonging to this department & section are returned.
// ---------------------------------------------------------------------------
export async function listApprovedMembers(
  scope: RolesScope
): Promise<RolesResult<ApprovedMember[]>> {
  const teamValues =
    scope.department === 'media_press' ? ['media_press', 'media'] : [scope.department];

  if (!supabase) {
    const local = loadLocalCache<ApprovedMember[]>(getCacheKey('members', scope), []);
    return { ok: true, data: local, isFallback: true };
  }

  try {
    let query = supabase
      .from('team_registrations')
      .select('id, full_name, email, phone, institution, team, section, status, experience, statement, created_at')
      .in('team', teamValues)
      .eq('status', 'accepted')
      .order('full_name', { ascending: true });

    if (scope.section) {
      query = query.eq('section', scope.section);
    }

    const { data, error } = await query;
    if (error) {
      // Return cached members if available
      const local = loadLocalCache<ApprovedMember[]>(getCacheKey('members', scope), []);
      if (local.length > 0) {
        return { ok: true, data: local, isFallback: true };
      }
      throw error;
    }

    const members = (data as ApprovedMember[]) || [];
    saveLocalCache(getCacheKey('members', scope), members);
    return { ok: true, data: members };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query approved members.';
    const local = loadLocalCache<ApprovedMember[]>(getCacheKey('members', scope), []);
    return { ok: true, data: local, error: msg, isFallback: true };
  }
}

// ---------------------------------------------------------------------------
// 2. Positions & Hierarchy CRUD
// ---------------------------------------------------------------------------
export async function listDepartmentPositions(
  scope: RolesScope
): Promise<RolesResult<DepartmentPosition[]>> {
  const cacheKey = getCacheKey('positions', scope);

  if (!supabase) {
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    return { ok: true, data: local, isFallback: true };
  }

  try {
    let query = supabase
      .from('department_positions')
      .select('*')
      .eq('department', scope.department)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (scope.section) {
      query = query.eq('section', scope.section);
    }

    const { data, error } = await query;
    if (error) {
      // Table might not be migrated yet in Supabase
      const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
      return { ok: true, data: local, isFallback: true, error: error.message };
    }

    const positions = (data as DepartmentPosition[]) || [];
    saveLocalCache(cacheKey, positions);
    return { ok: true, data: positions };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load positions.';
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    return { ok: true, data: local, error: msg, isFallback: true };
  }
}

export async function createDepartmentPosition(
  scope: RolesScope,
  input: PositionInput
): Promise<RolesResult<DepartmentPosition>> {
  const cacheKey = getCacheKey('positions', scope);
  const now = new Date().toISOString();

  const newPosition: DepartmentPosition = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: now,
    updated_at: now,
    department: scope.department,
    section: scope.section || null,
    title: input.title.trim(),
    description: (input.description || '').trim(),
    parent_position_id: input.parent_position_id || null,
    member_id: input.member_id || null,
    sort_order: input.sort_order ?? 0,
  };

  if (!supabase) {
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    const updated = [...local, newPosition];
    saveLocalCache(cacheKey, updated);
    return { ok: true, data: newPosition, isFallback: true };
  }

  try {
    const payload = {
      department: scope.department,
      section: scope.section || null,
      title: input.title.trim(),
      description: (input.description || '').trim(),
      parent_position_id: input.parent_position_id || null,
      member_id: input.member_id || null,
      sort_order: input.sort_order ?? 0,
    };

    const { data, error } = await supabase
      .from('department_positions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Fallback to local cache if table missing or RLS issue
      const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
      const updated = [...local, newPosition];
      saveLocalCache(cacheKey, updated);
      return { ok: true, data: newPosition, isFallback: true, error: error.message };
    }

    const created = data as DepartmentPosition;
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    saveLocalCache(cacheKey, [...local, created]);
    return { ok: true, data: created };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create position.';
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    const updated = [...local, newPosition];
    saveLocalCache(cacheKey, updated);
    return { ok: true, data: newPosition, error: msg, isFallback: true };
  }
}

export async function updateDepartmentPosition(
  scope: RolesScope,
  id: string,
  updates: Partial<PositionInput>
): Promise<RolesResult<DepartmentPosition>> {
  const cacheKey = getCacheKey('positions', scope);
  const now = new Date().toISOString();

  if (!supabase) {
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    let updatedPos: DepartmentPosition | undefined;
    const updated = local.map((p) => {
      if (p.id === id) {
        updatedPos = {
          ...p,
          ...updates,
          updated_at: now,
        };
        return updatedPos;
      }
      return p;
    });
    saveLocalCache(cacheKey, updated);
    return { ok: true, data: updatedPos, isFallback: true };
  }

  try {
    const payload = {
      ...updates,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('department_positions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
      let updatedPos: DepartmentPosition | undefined;
      const updated = local.map((p) => {
        if (p.id === id) {
          updatedPos = { ...p, ...updates, updated_at: now };
          return updatedPos;
        }
        return p;
      });
      saveLocalCache(cacheKey, updated);
      return { ok: true, data: updatedPos, isFallback: true, error: error.message };
    }

    const result = data as DepartmentPosition;
    const local = loadLocalCache<DepartmentPosition[]>(cacheKey, []);
    saveLocalCache(cacheKey, local.map((p) => (p.id === id ? result : p)));
    return { ok: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update position.';
    return { ok: false, error: msg };
  }
}

export async function deleteDepartmentPosition(
  scope: RolesScope,
  id: string
): Promise<RolesResult<void>> {
  const posCacheKey = getCacheKey('positions', scope);
  const taskCacheKey = getCacheKey('tasks', scope);

  // Safe Cascade:
  // 1. Reparent children to target position's parent (or null)
  // 2. Clear position_id from associated tasks so tasks remain intact
  if (!supabase) {
    const localPos = loadLocalCache<DepartmentPosition[]>(posCacheKey, []);
    const target = localPos.find((p) => p.id === id);
    const parentId = target ? target.parent_position_id : null;

    const reparented = localPos
      .filter((p) => p.id !== id)
      .map((p) => (p.parent_position_id === id ? { ...p, parent_position_id: parentId } : p));
    saveLocalCache(posCacheKey, reparented);

    const localTasks = loadLocalCache<DepartmentTask[]>(taskCacheKey, []);
    const updatedTasks = localTasks.map((t) =>
      t.position_id === id ? { ...t, position_id: null } : t
    );
    saveLocalCache(taskCacheKey, updatedTasks);

    return { ok: true, isFallback: true };
  }

  try {
    // Look up target to find parent
    const { data: target } = await supabase
      .from('department_positions')
      .select('parent_position_id')
      .eq('id', id)
      .maybeSingle();

    const parentId = target?.parent_position_id || null;

    // Reparent any child positions
    await supabase
      .from('department_positions')
      .update({ parent_position_id: parentId })
      .eq('parent_position_id', id);

    // Unlink from any tasks
    await supabase
      .from('department_tasks')
      .update({ position_id: null })
      .eq('position_id', id);

    // Delete position
    const { error } = await supabase
      .from('department_positions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    const localPos = loadLocalCache<DepartmentPosition[]>(posCacheKey, []);
    saveLocalCache(posCacheKey, localPos.filter((p) => p.id !== id));
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete position.';
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3. Tasks & Responsibilities CRUD
// ---------------------------------------------------------------------------
export async function listDepartmentTasks(
  scope: RolesScope
): Promise<RolesResult<DepartmentTask[]>> {
  const cacheKey = getCacheKey('tasks', scope);

  if (!supabase) {
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    return { ok: true, data: local, isFallback: true };
  }

  try {
    let query = supabase
      .from('department_tasks')
      .select('*')
      .eq('department', scope.department)
      .order('created_at', { ascending: false });

    if (scope.section) {
      query = query.eq('section', scope.section);
    }

    const { data, error } = await query;
    if (error) {
      const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
      return { ok: true, data: local, isFallback: true, error: error.message };
    }

    const tasks = (data as DepartmentTask[]) || [];
    saveLocalCache(cacheKey, tasks);
    return { ok: true, data: tasks };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load tasks.';
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    return { ok: true, data: local, error: msg, isFallback: true };
  }
}

export async function createDepartmentTask(
  scope: RolesScope,
  input: TaskInput
): Promise<RolesResult<DepartmentTask>> {
  const cacheKey = getCacheKey('tasks', scope);
  const now = new Date().toISOString();

  const newTask: DepartmentTask = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: now,
    updated_at: now,
    department: scope.department,
    section: scope.section || null,
    position_id: input.position_id || null,
    member_id: input.member_id,
    supervisor_member_id: input.supervisor_member_id || null,
    title: input.title.trim(),
    description: (input.description || '').trim(),
    priority: input.priority || 'normal',
    status: input.status || 'not_started',
    deadline: input.deadline || null,
    location: (input.location || '').trim(),
    notes: (input.notes || '').trim(),
  };

  if (!supabase) {
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    const updated = [newTask, ...local];
    saveLocalCache(cacheKey, updated);
    return { ok: true, data: newTask, isFallback: true };
  }

  try {
    const payload = {
      department: scope.department,
      section: scope.section || null,
      position_id: input.position_id || null,
      member_id: input.member_id,
      supervisor_member_id: input.supervisor_member_id || null,
      title: input.title.trim(),
      description: (input.description || '').trim(),
      priority: input.priority || 'normal',
      status: input.status || 'not_started',
      deadline: input.deadline || null,
      location: (input.location || '').trim(),
      notes: (input.notes || '').trim(),
    };

    const { data, error } = await supabase
      .from('department_tasks')
      .insert(payload)
      .select()
      .single();

    if (error) {
      const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
      const updated = [newTask, ...local];
      saveLocalCache(cacheKey, updated);
      return { ok: true, data: newTask, isFallback: true, error: error.message };
    }

    const created = data as DepartmentTask;
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    saveLocalCache(cacheKey, [created, ...local]);
    return { ok: true, data: created };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create task.';
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    const updated = [newTask, ...local];
    saveLocalCache(cacheKey, updated);
    return { ok: true, data: newTask, error: msg, isFallback: true };
  }
}

export async function updateDepartmentTask(
  scope: RolesScope,
  id: string,
  updates: Partial<TaskInput>
): Promise<RolesResult<DepartmentTask>> {
  const cacheKey = getCacheKey('tasks', scope);
  const now = new Date().toISOString();

  if (!supabase) {
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    let updatedTask: DepartmentTask | undefined;
    const updated = local.map((t) => {
      if (t.id === id) {
        updatedTask = { ...t, ...updates, updated_at: now };
        return updatedTask;
      }
      return t;
    });
    saveLocalCache(cacheKey, updated);
    return { ok: true, data: updatedTask, isFallback: true };
  }

  try {
    const payload = {
      ...updates,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('department_tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
      let updatedTask: DepartmentTask | undefined;
      const updated = local.map((t) => {
        if (t.id === id) {
          updatedTask = { ...t, ...updates, updated_at: now };
          return updatedTask;
        }
        return t;
      });
      saveLocalCache(cacheKey, updated);
      return { ok: true, data: updatedTask, isFallback: true, error: error.message };
    }

    const result = data as DepartmentTask;
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    saveLocalCache(cacheKey, local.map((t) => (t.id === id ? result : t)));
    return { ok: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update task.';
    return { ok: false, error: msg };
  }
}

export async function deleteDepartmentTask(
  scope: RolesScope,
  id: string
): Promise<RolesResult<void>> {
  const cacheKey = getCacheKey('tasks', scope);

  if (!supabase) {
    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    saveLocalCache(cacheKey, local.filter((t) => t.id !== id));
    return { ok: true, isFallback: true };
  }

  try {
    const { error } = await supabase
      .from('department_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const local = loadLocalCache<DepartmentTask[]>(cacheKey, []);
    saveLocalCache(cacheKey, local.filter((t) => t.id !== id));
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete task.';
    return { ok: false, error: msg };
  }
}

// Backward-compatible aliases for RolesManagement
export type RolesPosition = DepartmentPosition;
export type MemberTask = DepartmentTask;
export const listRolesPositions = listDepartmentPositions;
export const listMemberTasks = listDepartmentTasks;
export const createRolesPosition = createDepartmentPosition;
export const updateRolesPosition = updateDepartmentPosition;
export const deleteRolesPosition = deleteDepartmentPosition;
export const createMemberTask = createDepartmentTask;
export const updateMemberTask = updateDepartmentTask;
export const deleteMemberTask = deleteDepartmentTask;

