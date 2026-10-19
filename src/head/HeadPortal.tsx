import React, { useState, useEffect, useCallback } from 'react';
import { HeadLogin } from './HeadLogin';
import { DepartmentDashboard } from './DepartmentDashboard';
import { AccessDenied } from './AccessDenied';
import {
  isGenderSeparated,
  getDepartmentDashboardUrl,
  getRoleTitle,
  lookupHeadAssignment,
  type HeadAssignment,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { Loader2, Shield } from 'lucide-react';

interface AccessDeniedState {
  reason: 'no_assignment' | 'department_mismatch';
  email?: string;
  userId?: string;
  requestedDept?: string;
  requestedSec?: string;
}

export default function HeadPortal() {
  const [headUser, setHeadUser] = useState<{
    id: string;
    email: string;
    headName?: string;
    department: DepartmentKey;
    section: SectionKey | null;
  } | null>(null);

  const [assignment, setAssignment] = useState<HeadAssignment | null>(null);
  const [accessDeniedState, setAccessDeniedState] = useState<AccessDeniedState | null>(null);

  // Extract path: e.g. /head, /head/design, or /head/volunteers/female
  const currentPath =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/head'
      : '/head';

  const segments = currentPath.split('/').filter(Boolean);
  const isBaseHead = segments.length <= 1; // i.e. /head or /
  const requestedDeptSlug = segments[1];
  const requestedSectionSlug = segments[2];

  // For /head route or protected routes, start with loading=true while verifying session
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  /**
   * Handle session verification and route authorization via Supabase Auth & /api/head-auth
   */
  useEffect(() => {
    let active = true;

    // Listen to real-time Supabase Auth state changes
    let authSub: { subscription: { unsubscribe: () => void } } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, s) => {
        if (!active) return;
        if (event === 'SIGNED_OUT' || !s) {
          setHeadUser(null);
          setAssignment(null);
          setLoading(false);
        } else if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          verifyAccess();
        }
      });
      authSub = data;
    }

    const verifyAccess = async () => {
      // 1. Check Supabase Auth Session first
      let resolvedHead: any = null;
      let resolvedAssignment: HeadAssignment | null = null;
      let deniedInfo: AccessDeniedState | null = null;

      if (supabase && supabaseConfigured) {
        try {
          const { data: supaSessionData } = await supabase.auth.getSession();
          let supaSession = supaSessionData?.session;

          // If session exists and access token is expired, attempt token refresh
          if (supaSession?.expires_at && supaSession.expires_at * 1000 < Date.now()) {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session) {
              supaSession = refreshData.session;
            }
          }

          const supaUser = supaSession?.user;
          if (supaUser) {
            const lookup = await lookupHeadAssignment(supaUser.id);
            if (lookup.status === 'success' && lookup.assignment) {
              resolvedAssignment = lookup.assignment;
              resolvedHead = {
                id: supaUser.id,
                email: lookup.assignment.headEmail || supaUser.email || '',
                headName:
                  lookup.assignment.headName ||
                  (supaUser.user_metadata?.full_name as string | undefined) ||
                  '',
                department: lookup.assignment.department,
                section: lookup.assignment.section,
              };
            } else if (lookup.status === 'permission_denied') {
              if (lookup.code === 'SESSION_EXPIRED') {
                // If the session expired, prompt to sign in rather than showing permanent Access Denied
                setHeadUser(null);
                setAssignment(null);
                setAuthError('Your session has expired. Please sign in again.');
                setLoading(false);
                return;
              }
              deniedInfo = {
                reason: 'no_assignment',
                email: supaUser.email,
                userId: supaUser.id,
              };
              setAuthError(lookup.message || 'Access denied for this department head account.');
            } else if (lookup.status === 'not_found') {
              deniedInfo = {
                reason: 'no_assignment',
                email: supaUser.email,
                userId: supaUser.id,
              };
            }
          }
        } catch (err) {
          console.warn('[Head Portal] Supabase session check error:', err);
        }
      }

      // 2. Local development fallback to /api/head-auth session token.
      //    Production access is granted only by a verified Supabase session.
      const token =
        !import.meta.env.PROD && typeof window !== 'undefined'
          ? sessionStorage.getItem('westmun_head_session')
          : null;
      if (!resolvedHead && !deniedInfo && token) {
        try {
          const resp = await fetch('/api/head-auth?action=session', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.authorized && data.head) {
              const dept = data.head.department as DepartmentKey;
              const sec = data.head.section as SectionKey | null;
              resolvedAssignment = {
                department: dept,
                section: sec,
                headName: data.head.headName || null,
                headEmail: data.head.email || null,
                roleTitle: getRoleTitle(dept, sec),
              };
              resolvedHead = data.head;
            }
          } else {
            sessionStorage.removeItem('westmun_head_session');
          }
        } catch (err) {
          console.error('[Head Portal] Head session check error:', err);
        }
      }

      if (!active) return;

      if (deniedInfo) {
        setAccessDeniedState(deniedInfo);
        setLoading(false);
        return;
      }

      // -------------------------------------------------------------
      // Case 1: Unauthenticated
      // -------------------------------------------------------------
      if (!resolvedHead || !resolvedAssignment) {
        setHeadUser(null);
        setAssignment(null);
        if (!isBaseHead) {
          try {
            window.history.replaceState({}, '', '/head');
          } catch {}
          setAuthError('Your session has expired or authentication is required. Please sign in.');
        }
        setLoading(false);
        return;
      }

      // -------------------------------------------------------------
      // Case 2: Authenticated Department Head
      // -------------------------------------------------------------
      setHeadUser(resolvedHead);
      setAssignment(resolvedAssignment);

      const dept = resolvedAssignment.department;
      const sec = resolvedAssignment.section;
      const canonicalTarget = getDepartmentDashboardUrl(dept, sec);

      // On base /head route, redirect smoothly to canonical department URL
      if (isBaseHead) {
        try {
          window.history.replaceState({}, '', canonicalTarget);
        } catch {}
        setLoading(false);
        return;
      }

      // Check department & section authorization
      const deptMismatch = requestedDeptSlug !== dept;
      const sectionMismatch =
        isGenderSeparated(dept) &&
        requestedSectionSlug &&
        requestedSectionSlug !== sec &&
        requestedSectionSlug !== 'sponsors' &&
        requestedSectionSlug !== 'inquiries' &&
        requestedSectionSlug !== 'registrations' &&
        requestedSectionSlug !== 'department';

      // Missing section on gender-separated department -> update URL to exact section
      if (!deptMismatch && isGenderSeparated(dept) && !requestedSectionSlug && sec) {
        try {
          window.history.replaceState({}, '', canonicalTarget);
        } catch {}
        setLoading(false);
        return;
      }

      // Mismatch: Deny access if head attempts to open another department or gender section
      if (deptMismatch || sectionMismatch) {
        setAccessDeniedState({
          reason: 'department_mismatch',
          email: resolvedHead.email,
          userId: resolvedHead.id,
          requestedDept: requestedDeptSlug,
          requestedSec: requestedSectionSlug,
        });
        setLoading(false);
        return;
      }

      // Exact match authorized
      setAccessDeniedState(null);
      setLoading(false);
    };

    verifyAccess();

    return () => {
      active = false;
      authSub?.subscription?.unsubscribe();
    };
  }, [isBaseHead, requestedDeptSlug, requestedSectionSlug]);

  /**
   * Complete sign-out helper
   */
  const handleSignOut = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('westmun_head_session') : null;
    if (token) {
      try {
        await fetch('/api/head-auth?action=logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
      sessionStorage.removeItem('westmun_head_session');
    }
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('wm_head_unlocked_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch {}
    }
    setHeadUser(null);
    setAssignment(null);
    setAccessDeniedState(null);
    setAuthError('');
    try {
      window.history.replaceState({}, '', '/head');
    } catch {}
    setLoading(false);
  }, []);

  // 1. Loading state while verifying credentials or restoring session
  if (loading) {
    return (
      <div className="wm-app flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#101014] text-[#d4af37]">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d4af37]" aria-hidden="true" />
            <span>Verifying department authorization</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Access Denied (department/section mismatch or unregistered user)
  if (accessDeniedState) {
    return (
      <AccessDenied
        reason={accessDeniedState.reason}
        email={accessDeniedState.email}
        userId={accessDeniedState.userId}
        authorizedDepartment={assignment?.department}
        authorizedSection={assignment?.section}
        requestedDepartment={accessDeniedState.requestedDept}
        requestedSection={accessDeniedState.requestedSec}
        onGoToAuthorizedDashboard={
          assignment
            ? () => {
                const canonical = getDepartmentDashboardUrl(
                  assignment.department,
                  assignment.section
                );
                try {
                  window.history.pushState({}, '', canonical);
                } catch {}
                setAccessDeniedState(null);
              }
            : undefined
        }
        onSignOut={handleSignOut}
      />
    );
  }

  // 3. Not logged in -> Render HeadLogin
  if (!headUser || !assignment) {
    return (
      <HeadLogin
        authError={authError}
        onSuccess={(newAssign, user) => {
          setAuthError('');
          const resolved = user
            ? { ...user, section: user.section ?? null }
            : {
                id: '',
                email: newAssign.headEmail || '',
                headName: newAssign.headName || '',
                department: newAssign.department,
                section: newAssign.section ?? null,
              };
          setHeadUser(resolved);
          setAssignment(newAssign);
          setAccessDeniedState(null);
          setLoading(false);

          const target = getDepartmentDashboardUrl(newAssign.department, newAssign.section);
          try {
            window.history.pushState({}, '', target);
          } catch {}
        }}
      />
    );
  }

  // 4. Authorized department head -> Render Department Dashboard
  const initialView =
    requestedSectionSlug === 'sponsors'
      ? ('sponsors' as const)
      : requestedSectionSlug === 'inquiries'
      ? ('inquiries' as const)
      : requestedSectionSlug === 'registrations'
      ? ('registrations' as const)
      : requestedSectionSlug === 'department'
      ? ('department' as const)
      : undefined;

  return (
    <DepartmentDashboard
      department={assignment.department}
      section={assignment.section}
      headName={assignment.headName || undefined}
      headEmail={headUser.email}
      initialView={initialView}
      onSignOut={handleSignOut}
    />
  );
}
