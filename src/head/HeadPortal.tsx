import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { HeadLogin } from './HeadLogin';
import { DepartmentDashboard } from './DepartmentDashboard';
import { AccessDenied } from './AccessDenied';
import {
  isGenderSeparated,
  fetchHeadAssignment,
  getDepartmentDashboardUrl,
  type HeadAssignment,
} from './departments';
import { Loader2, Shield } from 'lucide-react';

interface AccessDeniedState {
  reason: 'no_assignment' | 'department_mismatch';
  email?: string;
  userId?: string;
  requestedDept?: string;
  requestedSec?: string;
}

export default function HeadPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [assignment, setAssignment] = useState<HeadAssignment | null>(null);
  const [accessDeniedState, setAccessDeniedState] = useState<AccessDeniedState | null>(null);

  // Extract path: e.g. /head, /head/design, or /head/volunteers/female
  const currentPath =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/head'
      : '/head';

  const segments = currentPath.split('/').filter(Boolean);
  // segments[0] === 'head'
  const isBaseHead = segments.length <= 1; // i.e. /head or /
  const requestedDeptSlug = segments[1];
  const requestedSectionSlug = segments[2];

  // For /head route, loading starts as false so login form displays immediately
  const [loading, setLoading] = useState(!isBaseHead);

  /**
   * Handle session verification and route authorization
   */
  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      if (!supabaseConfigured || !supabase) {
        if (!active) return;
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();

        if (!active) return;

        // -------------------------------------------------------------
        // Case A: User is on the base Head Portal route (/head)
        // -------------------------------------------------------------
        if (isBaseHead) {
          // If an authorized head is already signed in, auto-redirect to their dashboard
          if (s?.user) {
            const userAssign = await fetchHeadAssignment(s.user.id);
            if (!active) return;

            if (userAssign) {
              setSession(s);
              setAssignment(userAssign);
              const targetUrl = getDepartmentDashboardUrl(userAssign.department, userAssign.section);
              window.location.replace(targetUrl);
              return;
            }
          }
          // If signed out or unassigned: Display the login form immediately
          // NEVER display "Access Denied" or require an assignment just to view /head
          setLoading(false);
          return;
        }

        // -------------------------------------------------------------
        // Case B: User requested a protected department URL (/head/:dept)
        // -------------------------------------------------------------
        // 1. Signed-out visitor entering a department URL -> redirect to /head
        if (!s?.user) {
          window.location.replace('/head');
          return;
        }

        setSession(s);

        // 2. Query public.department_heads for the authenticated user's actual UID
        const userAssign = await fetchHeadAssignment(s.user.id);
        if (!active) return;

        // 3. Authenticated user has NO assignment in public.department_heads
        if (!userAssign) {
          setAccessDeniedState({
            reason: 'no_assignment',
            email: s.user.email,
            userId: s.user.id,
          });
          setLoading(false);
          return;
        }

        setAssignment(userAssign);

        // 4. Verify department and gender section match assignment
        const deptMismatch = requestedDeptSlug !== userAssign.department;
        const sectionMismatch =
          isGenderSeparated(userAssign.department) &&
          requestedSectionSlug !== userAssign.section;

        // Missing section on gender-separated department -> redirect to exact section
        if (
          !deptMismatch &&
          isGenderSeparated(userAssign.department) &&
          !requestedSectionSlug &&
          userAssign.section
        ) {
          window.location.replace(
            getDepartmentDashboardUrl(userAssign.department, userAssign.section)
          );
          return;
        }

        // Mismatch: Deny access if head attempts to open another department or gender section
        if (deptMismatch || sectionMismatch) {
          setAccessDeniedState({
            reason: 'department_mismatch',
            email: s.user.email,
            userId: s.user.id,
            requestedDept: requestedDeptSlug,
            requestedSec: requestedSectionSlug,
          });
          setLoading(false);
          return;
        }

        // Exact match authorized
        setAccessDeniedState(null);
        setLoading(false);
      } catch (err) {
        console.error('Error during Head Portal route verification:', err);
        if (active) setLoading(false);
      }
    };

    verifyAccess();

    return () => {
      active = false;
    };
  }, [isBaseHead, requestedDeptSlug, requestedSectionSlug]);

  /**
   * Complete sign-out helper
   */
  const handleSignOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setAssignment(null);
    setAccessDeniedState(null);
    window.location.assign('/head');
  }, []);

  // 1. When visiting /head: Always display Head Portal sign-in form immediately
  if (isBaseHead) {
    return (
      <HeadLogin
        onSuccess={(newAssign) => {
          setAssignment(newAssign);
          const target = getDepartmentDashboardUrl(newAssign.department, newAssign.section);
          window.location.assign(target);
        }}
      />
    );
  }

  // 2. Loading state for protected department routes
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#070709] text-white">
        <div className="flex flex-col items-center gap-4 p-8 bg-[#0c0c10] border border-[#d4af37]/30 rounded-sm shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
            <span>Verifying Department Authorization…</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Access Denied (either unassigned account or department/section mismatch)
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
                window.location.assign(canonical);
              }
            : undefined
        }
        onSignOut={handleSignOut}
      />
    );
  }

  // 4. Not logged in on protected route -> fallback to HeadLogin
  if (!session || !assignment) {
    return (
      <HeadLogin
        onSuccess={(newAssign) => {
          setAssignment(newAssign);
          const target = getDepartmentDashboardUrl(newAssign.department, newAssign.section);
          window.location.assign(target);
        }}
      />
    );
  }

  // 5. Authorized department head -> Render Department Dashboard
  return (
    <DepartmentDashboard
      department={assignment.department}
      section={assignment.section}
      headName={assignment.headName || undefined}
      headEmail={session.user.email}
      onSignOut={handleSignOut}
    />
  );
}
