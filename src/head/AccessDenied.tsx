import React from 'react';
import { ShieldX, LogOut, ExternalLink, HelpCircle } from 'lucide-react';

interface AccessDeniedProps {
  email?: string;
  userId?: string;
  onSignOut: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ email, userId, onSignOut }) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#070709] text-white">
      <div className="w-full max-w-lg bg-[#0c0c10] border border-red-500/30 rounded-sm p-7 sm:p-9 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
            <ShieldX className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif text-white tracking-tight">Access Denied</h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            No Department Head Authorization Found
          </p>
        </div>

        <div className="p-4 bg-[#121217] border border-neutral-800 rounded-sm text-xs space-y-2.5">
          <p className="text-neutral-300 leading-relaxed font-light">
            Your account is authenticated with WEST MUN, but it is not currently assigned as an active department head in <code className="text-[#d4af37] font-mono">public.department_heads</code>.
          </p>
          <div className="pt-2 border-t border-neutral-800/80 font-mono text-[11px] text-neutral-400 space-y-1">
            <div>Authenticated Email: <span className="text-white">{email || 'Unknown'}</span></div>
            {userId && <div className="truncate">User ID: <span className="text-neutral-500">{userId}</span></div>}
          </div>
        </div>

        <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-sm text-xs text-neutral-400 flex items-start gap-2.5 font-light">
          <HelpCircle className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
          <div>
            <span className="text-neutral-200 font-medium">How to activate access:</span>
            <p className="mt-0.5">
              Contact the Secretary-General or Conference Administrator. They must authorize your email via the official Secretariat SQL assignment script.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800">
          <a
            href="/"
            className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            <span>Return to Website</span>
            <ExternalLink className="w-3 h-3" />
          </a>

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
