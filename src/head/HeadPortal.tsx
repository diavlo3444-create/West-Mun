import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { HeadLogin, type HeadAssignment } from './HeadLogin';
import { DepartmentDashboard } from './DepartmentDashboard';
import { AccessDenied } from './AccessDenied';
import {
  isDepartmentKey,
  isSectionKey,
  isGenderSeparated,
  type DepartmentKey,
  type SectionKey,
} from './departments';
import { Loader2, Shield } from 'lucide-react';

export default function HeadPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [assignment, setAssignment] = useState<HeadAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Extract path: e.g. /head, /head/design, or /head/security/male
  const currentPath =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/head'
      : '/head';

  const segments = currentPath.split('/').filter(Boolean);
  // segments[0] === 'head'
  const requestedDeptSlug = segments[1];
  const requestedSectionSlug = segments[2];

  /**
   * Look up department and section assignment for authenticated user
   */
  const fetchUserAssignment = useCallback(
    async (userId: string): Promise<HeadAssignment | null> => {
      if (!supabase) return null;

      try {
        // 1. Try by id
        const { data: recordById } = await supabase
          .from('department_heads')
          .select('department, section, head_name, active')
          .eq('id', userId)
          .maybeSingle();

        let record = recordById;

        // 2. Try by user_id
        if (!record) {
          const { data: recordByUserId } = await supabase
            .from('department_heads')
            .select('department, section, head_name, active')
            .eq('user_id', userId)
            .maybeSingle();
          record = recordByUserId;
        }

        if (record && record.active !== false && isDepartmentKey(record.department)) {
          const dept = record.department as DepartmentKey;
          const rawSec = record.section;
          const section: SectionKey | null = isSectionKey(rawSec) ? rawSec : null;

          return {
            department: dept,
            section,
            headName: record.head_name || null,
          };
        }
      } catch (err) {
        console.error('Failed to query department_heads:', err);
      }

      return null;
    },
    []
  );

  /**
   * Calculate the canonical URL for a given assignment
   */
  const getCanonicalUrl = useCallback((assign: HeadAssignment): string => {
    if (assign.section) {
      return `/head/${assign.department}/${assign.section}`;
    }
    return `/head/${assign.department}`;
  }, []);

  /**
   * Verify session & permissions on mount
   */
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      if (!supabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!s?.user) {
          setSession(null);
          setAssignment(null);
          setLoading(false);
          return;
        }

        setSession(s);
        const userAssign = await fetchUserAssignment(s.user.id);

        if (!active) return;

        if (userAssign) {
          setAssignment(userAssign);
          setAccessDenied(false);

          const canonicalUrl = getCanonicalUrl(userAssign);

          // If currently at /head, redirect to canonical dashboard
          if (currentPath === '/head') {
            window.location.replace(canonicalUrl);
            return;
          }

          // Strict authorization: URL tampering prevention.
          // If the user's assignment is security/male and they try to visit /head/security/female,
          // or /head/volunteers, redirect immediately back to their canonical authorized URL.
          const isDeptMismatch = requestedDeptSlug !== userAssign.department;
          const isSectionMismatch =
            isGenderSeparated(userAssign.department) &&
            requestedSectionSlug !== userAssign.section;

          if (isDeptMismatch || isSectionMismatch) {
            window.location.replace(canonicalUrl);
            return;
          }
        } else {
          setAccessDenied(true);
        }
      } catch (err) {
        console.error('Error during Head Portal initialization:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    initAuth();

    // Listen to Supabase auth changes
    const { data: authListener } =
      supabase?.auth.onAuthStateChange(async (_event, newSession) => {
        if (!active) return;
        if (!newSession?.user) {
          setSession(null);
          setAssignment(null);
          setAccessDenied(false);
        } else {
          setSession(newSession);
          const assign = await fetchUserAssignment(newSession.user.id);
          if (!active) return;
          if (assign) {
            setAssignment(assign);
            setAccessDenied(false);
          } else {
            setAccessDenied(true);
          }
        }
      }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [
    currentPath,
    requestedDeptSlug,
    requestedSectionSlug,
    fetchUserAssignment,
    getCanonicalUrl,
  ]);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setAssignment(null);
    setAccessDenied(false);
    window.location.assign('/head');
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#070709] text-white">
        <div className="flex flex-col items-center gap-4 p-8 bg-[#0c0c10] border border-[#d4af37]/30 rounded-sm shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#121217] border border-[#d4af37]/60 flex items-center justify-center text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-neutral-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
            <span>Loading Department Portal…</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Access Denied (Authenticated in Supabase, but not authorized in public.department_heads)
  if (accessDenied && session?.user) {
    return (
      <AccessDenied
        email={session.user.email}
        userId={session.user.id}
        onSignOut={handleSignOut}
      />
    );
  }

  // 3. Not logged in -> Show shared Head Login page
  if (!session || !assignment) {
    return (
      <HeadLogin
        onSuccess={(newAssign) => {
          setAssignment(newAssign);
          const target = getCanonicalUrl(newAssign);
          window.location.assign(target);
        }}
      />
    );
  }

  // 4. Authorized department head -> Render Department Dashboard with exact section
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
