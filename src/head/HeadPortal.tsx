import React, { useState, useEffect, useCallback } from 'react';
import { HeadLogin } from './HeadLogin';
import { DepartmentDashboard } from './DepartmentDashboard';
import { AccessDenied } from './AccessDenied';
import {
  isGenderSeparated,
  getDepartmentDashboardUrl,
  getRoleTitle,
  type HeadAssignment,
  type DepartmentKey,
  type SectionKey,
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

  // For /head route, loading starts as false so login form displays immediately
  const [loading, setLoading] = useState(!isBaseHead);

  /**
   * Handle session verification and route authorization via /api/head-auth
   */
  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('westmun_head_session') : null;

      // -------------------------------------------------------------
      // Case A: User is on the base Head Portal route (/head)
      // -------------------------------------------------------------
      if (isBaseHead) {
        if (!token) {
          if (active) setLoading(false);
          return;
        }

        try {
          const resp = await fetch('/api/head-auth?action=session', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!active) return;

          if (resp.ok) {
            const data = await resp.json();
            if (data.authorized && data.head) {
              const dept = data.head.department as DepartmentKey;
              const sec = data.head.section as SectionKey | null;
              const assign: HeadAssignment = {
                department: dept,
                section: sec,
                headName: data.head.headName || null,
                roleTitle: getRoleTitle(dept, sec),
              };

              setHeadUser(data.head);
              setAssignment(assign);

              const targetUrl = getDepartmentDashboardUrl(dept, sec);
              window.location.replace(targetUrl);
              return;
            }
          } else {
            // Invalid/expired token
            sessionStorage.removeItem('westmun_head_session');
          }
        } catch (err) {
          console.error('[Head Portal] Error verifying session:', err);
        }

        if (active) setLoading(false);
        return;
      }

      // -------------------------------------------------------------
      // Case B: User requested a protected department URL (/head/:dept)
      // -------------------------------------------------------------
      if (!token) {
        window.location.replace('/head');
        return;
      }

      try {
        const resp = await fetch('/api/head-auth?action=session', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!active) return;

        if (!resp.ok) {
          sessionStorage.removeItem('westmun_head_session');
          window.location.replace('/head');
          return;
        }

        const data = await resp.json();
        if (!data.authorized || !data.head) {
          sessionStorage.removeItem('westmun_head_session');
          window.location.replace('/head');
          return;
        }

        const dept = data.head.department as DepartmentKey;
        const sec = data.head.section as SectionKey | null;

        const assign: HeadAssignment = {
          department: dept,
          section: sec,
          headName: data.head.headName || null,
          roleTitle: getRoleTitle(dept, sec),
        };

        setHeadUser(data.head);
        setAssignment(assign);

        // Check department & section authorization
        const deptMismatch = requestedDeptSlug !== dept;
        const sectionMismatch =
          isGenderSeparated(dept) &&
          requestedSectionSlug !== sec;

        // Missing section on gender-separated department -> redirect to exact section
        if (!deptMismatch && isGenderSeparated(dept) && !requestedSectionSlug && sec) {
          window.location.replace(getDepartmentDashboardUrl(dept, sec));
          return;
        }

        // Mismatch: Deny access if head attempts to open another department or gender section
        if (deptMismatch || sectionMismatch) {
          setAccessDeniedState({
            reason: 'department_mismatch',
            email: data.head.email,
            userId: data.head.id,
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
        console.error('[Head Portal] Error during route verification:', err);
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
    setHeadUser(null);
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

  // 3. Access Denied (department/section mismatch)
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
  if (!headUser || !assignment) {
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
      headEmail={headUser.email}
      onSignOut={handleSignOut}
    />
  );
}
