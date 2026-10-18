import React from 'react';
import { ShieldX, LogOut, ExternalLink, HelpCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { DEPARTMENTS, isDepartmentKey, type DepartmentKey, type SectionKey } from './departments';

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
  const reqDeptLabel = requestedDepartment && isDepartmentKey(requestedDepartment)
    ? DEPARTMENTS[requestedDepartment].label
    : requestedDepartment || 'Requested Portal';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#070709] text-white">
      <div className="w-full max-w-lg bg-[#0c0c10] border border-red-500/30 rounded-sm p-7 sm:p-9 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            {isMismatch ? <ShieldAlert className="w-7 h-7" /> : <ShieldX className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-serif text-white tracking-tight">Access Denied</h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            {isMismatch ? 'Unauthorized Department Access' : 'No Department Head Authorization Found'}
          </p>
        </div>

        {isMismatch ? (
          <div className="p-4 bg-[#121217] border border-neutral-800 rounded-sm text-xs space-y-3">
            <p className="text-neutral-300 leading-relaxed font-light">
              You are signed in as an authorized department head, but you do not have permission to access the{' '}
              <span className="text-red-300 font-medium">{reqDeptLabel}{requestedSection ? ` (${requestedSection.toUpperCase()})` : ''}</span> dashboard.
            </p>
            <div className="p-3 bg-[#181820] border border-[#d4af37]/30 rounded-sm space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#d4af37] block">
                Your Approved Assignment:
              </span>
              <p className="text-white font-medium">
                {authDeptMeta?.label || authorizedDepartment}
                {authorizedSection && (
                  <span className="ml-2 text-xs font-mono uppercase text-[#e5c158]">
                    ({authorizedSection.toUpperCase()} Division)
                  </span>
                )}
              </p>
            </div>
            <p className="text-[11px] text-neutral-400 italic">
              Security note: Changing the browser URL never grants access to another department or section.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-[#121217] border border-neutral-800 rounded-sm text-xs space-y-2.5">
            <p className="text-neutral-300 leading-relaxed font-light">
              Your account is authenticated with WEST MUN, but it is not currently assigned as an active department head in{' '}
              <code className="text-[#d4af37] font-mono">public.department_heads</code>.
            </p>
            <div className="pt-2 border-t border-neutral-800/80 font-mono text-[11px] text-neutral-400 space-y-1">
              <div>
                Authenticated Email: <span className="text-white">{email || 'Unknown'}</span>
              </div>
              {userId && (
                <div className="truncate">
                  User ID: <span className="text-neutral-500">{userId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!isMismatch && (
          <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-sm text-xs text-neutral-400 flex items-start gap-2.5 font-light">
            <HelpCircle className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
            <div>
              <span className="text-neutral-200 font-medium">How to activate access:</span>
              <p className="mt-0.5">
                Contact the Secretary-General or Conference Administrator. They must authorize your account via the official Secretariat department head assignment script.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800">
          {isMismatch && onGoToAuthorizedDashboard ? (
            <button
              type="button"
              onClick={onGoToAuthorizedDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-gradient-to-r from-[#e5c158] to-[#d4af37] hover:brightness-110 rounded-sm cursor-pointer transition-all"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href="/"
              className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <span>Return to Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 rounded-sm cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
