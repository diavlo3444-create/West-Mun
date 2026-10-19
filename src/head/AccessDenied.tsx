import React from 'react';
import { ShieldX, LogOut, ExternalLink, HelpCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { DEPARTMENTS, isDepartmentKey, type DepartmentKey, type SectionKey } from './departments';
import { Panel, Notice, btnPrimary, btnSecondary } from '../dashboard/ui';

export interface AccessDeniedProps {
  email?: string;
  userId?: string;
  onSignOut: () => void;
  reason?: 'no_assignment' | 'department_mismatch';
  authorizedDepartment?: DepartmentKey;
  authorizedSection?: SectionKey | null;
  requestedDepartment?: string;
  requestedSection?: string;
  onGoToAuthorizedDashboard?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  email,
  userId,
  onSignOut,
  reason = 'no_assignment',
  authorizedDepartment,
  authorizedSection,
  requestedDepartment,
  requestedSection,
  onGoToAuthorizedDashboard,
}) => {
  const isMismatch = reason === 'department_mismatch' && authorizedDepartment;
  const authDeptMeta = authorizedDepartment ? DEPARTMENTS[authorizedDepartment] : null;
  const reqDeptLabel =
    requestedDepartment && isDepartmentKey(requestedDepartment)
      ? DEPARTMENTS[requestedDepartment].label
      : requestedDepartment || 'requested portal';

  return (
    <div className="wm-app flex min-h-screen items-center justify-center px-4 py-12">
      <Panel className="w-full max-w-lg overflow-hidden border-rose-400/20">
        <div className="h-px bg-gradient-to-r from-transparent via-rose-400/55 to-transparent" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/[0.07] text-rose-300">
              {isMismatch ? (
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ShieldX className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <h1 className="wm-serif mt-4 text-[26px] text-white">Access denied</h1>
            <p className="mt-1 text-[9.5px] font-mono uppercase tracking-[0.18em] text-neutral-400">
              {isMismatch ? 'Unauthorized department route' : 'No active head assignment'}
            </p>
          </div>

          <div className="mt-6">
            {isMismatch ? (
              <div className="space-y-3">
                <p className="text-[11.5px] leading-relaxed text-neutral-400">
                  You are signed in as an authorized department head, but your assignment does not
                  include the{' '}
                  <span className="font-medium text-rose-300">
                    {reqDeptLabel}
                    {requestedSection ? ` (${requestedSection.toUpperCase()})` : ''}
                  </span>{' '}
                  dashboard.
                </p>
                <div className="rounded-md border border-[#d4af37]/25 bg-[#d4af37]/[0.05] p-3">
                  <span className="block text-[9px] font-mono uppercase tracking-[0.14em] text-[#d4af37]/85">
                    Your verified assignment
                  </span>
                  <p className="mt-1 text-[12px] font-medium text-white">
                    {authDeptMeta?.label || authorizedDepartment}
                    {authorizedSection && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#e2c258]">
                        {authorizedSection} division
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-[10px] leading-relaxed text-neutral-400">
                  Changing the URL never grants access to another department or section. Scope is
                  enforced by Row Level Security on every request.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11.5px] leading-relaxed text-neutral-400">
                  Your account authenticated successfully, but it is not an active department head in{' '}
                  <code className="font-mono text-[10.5px] text-[#d4af37]">public.department_heads</code>.
                </p>
                <div className="rounded-md border border-white/[0.07] bg-white/[0.015] p-3 text-[10.5px]">
                  <p className="font-mono text-neutral-400">
                    Email{' '}
                    <span className="text-neutral-200">{email || 'Unknown'}</span>
                  </p>
                  {userId && (
                    <p className="mt-1 truncate font-mono text-neutral-400">
                      User ID <span className="text-neutral-400">{userId}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isMismatch && (
            <Notice tone="info" className="mt-4">
              <span className="inline-flex items-start gap-2">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                <span>
                  To activate access, contact the Secretary-General or IT Super Admin. They must assign
                  your account to a department from the IT Super Admin console.
                </span>
              </span>
            </Notice>
          )}

          <div className="mt-6 flex flex-col gap-2 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {isMismatch && onGoToAuthorizedDashboard ? (
              <button type="button" onClick={onGoToAuthorizedDashboard} className={btnPrimary}>
                Go to my dashboard
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 transition-colors hover:text-white"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Return to website
              </a>
            )}

            <button type="button" onClick={onSignOut} className={btnSecondary}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
};
