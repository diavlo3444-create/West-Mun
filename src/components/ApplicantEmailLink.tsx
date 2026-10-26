import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  ExternalLink,
  ChevronDown,
  Copy,
  Check,
  Send,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  ApplicantEmailContext,
  EmailTemplateType,
  getEmailTemplates,
  openGmailCompose,
  openMailto,
} from '../lib/applicantEmail';

export interface ApplicantEmailLinkProps extends ApplicantEmailContext {
  /** Database ID required to create a private invite for an accepted team applicant. */
  registrationId?: string;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
  align?: 'left' | 'right';
  variant?: 'inline' | 'badge' | 'button';
  buttonLabel?: string;
}

export const ApplicantEmailLink: React.FC<ApplicantEmailLinkProps> = ({
  applicantName,
  applicantEmail,
  registrationId,
  type,
  department,
  section,
  status,
  roleTitle,
  institution,
  assignment,
  missingInfoNote,
  inquirySubject,
  templateType,
  className = '',
  iconClassName = '',
  showIcon = true,
  align = 'left',
  variant = 'inline',
  buttonLabel = 'Email applicant',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateType | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const cleanEmail = (applicantEmail || '').trim();
  if (!cleanEmail) {
    return <span className="font-mono text-neutral-400">No email</span>;
  }

  const ctx: ApplicantEmailContext = {
    applicantName,
    applicantEmail: cleanEmail,
    type,
    department,
    section,
    status,
    roleTitle,
    institution,
    assignment,
    missingInfoNote,
    inquirySubject,
    templateType,
  };

  const { templates, defaultTemplate } = getEmailTemplates(ctx);
  const currentTemplate = selectedTemplateId
    ? templates.find((t) => t.id === selectedTemplateId) || defaultTemplate
    : defaultTemplate;

  // Close popup menu on outside click or escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handlePrimaryClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // The accepted team email must carry the one-time invitation, not a protected dashboard URL.
    if (currentTemplate.id === 'approved' && type === 'team') {
      if (!registrationId) {
        window.alert('This application is missing its registration ID. Refresh the registrations page and try again.');
        return;
      }

      // Open synchronously so the browser does not block the Gmail tab while the invite is generated.
      const composeWindow = window.open('about:blank', '_blank');
      try {
        const { data, error } = await supabase.functions.invoke('team-signup', {
          body: { action: 'create', registrationId },
        });
        if (error || !data?.success || typeof data?.signupUrl !== 'string') {
          composeWindow?.close();
          window.alert(data?.error || error?.message || 'Could not generate the private signup link. Confirm an admin has finalized the approval, then retry.');
          return;
        }

        const body = typeof data.message === 'string'
          ? data.message
          : `Hello ${applicantName || 'Applicant'},\n\nCongratulations! Your application to join WEST MUN 2027 has been approved.\n\nCreate your account using this private invitation (it is tied to your application email):\n${data.signupUrl}\n\nWEST MUN 2027 Secretariat`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanEmail)}&su=${encodeURIComponent(currentTemplate.subject)}&body=${encodeURIComponent(body)}`;
        if (composeWindow) composeWindow.location.href = gmailUrl;
        else window.location.href = gmailUrl;
      } catch {
        composeWindow?.close();
        window.alert('Could not generate the private signup link. Please try again.');
      }
      return;
    }

    openGmailCompose(ctx, currentTemplate.id);
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(cleanEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {}
  };

  const handleCopyBody = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(
        `Subject: ${currentTemplate.subject}\n\n${currentTemplate.body}`
      );
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } catch {}
  };

  const handleSelectTemplate = (e: React.MouseEvent, id: EmailTemplateType) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTemplateId(id);
  };

  const handleMailto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMailto(ctx, currentTemplate.id);
    setMenuOpen(false);
  };

  const templateIcon = (id: EmailTemplateType) => {
    switch (id) {
      case 'approved':
        return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      case 'rejected':
        return <XCircle className="h-3 w-3 text-rose-400" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-amber-400" />;
      case 'shift_assignment':
        return <FileText className="h-3 w-3 text-sky-400" />;
      case 'missing_info':
        return <AlertCircle className="h-3 w-3 text-amber-300" />;
      case 'inquiry_reply':
        return <Send className="h-3 w-3 text-[#d4af37]" />;
      default:
        return <Mail className="h-3 w-3 text-neutral-400" />;
    }
  };

  return (
    <div
      ref={menuRef}
      className="relative inline-flex items-center align-middle"
      onClick={(e) => e.stopPropagation()}
    >
      {variant === 'button' ? (
        <div className="inline-flex items-stretch rounded-md border border-[#d4af37]/35 bg-[#d4af37]/10 text-xs text-[#f1d98c] shadow-sm transition-all hover:bg-[#d4af37]/20 hover:border-[#d4af37]/60">
          <button
            type="button"
            onClick={handlePrimaryClick}
            title={`Compose email to ${cleanEmail} in Gmail (${currentTemplate.label})`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>{buttonLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleMenu}
            aria-label="Email templates and options"
            title="Choose template or mailto fallback"
            className="border-l border-[#d4af37]/25 px-1.5 py-1.5 hover:bg-[#d4af37]/20 cursor-pointer"
          >
            <ChevronDown className="h-3 w-3 text-[#f1d98c]" />
          </button>
        </div>
      ) : variant === 'badge' ? (
        <div className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-neutral-300 transition-colors hover:border-[#d4af37]/40 hover:text-white">
          <button
            type="button"
            onClick={handlePrimaryClick}
            title={`Compose email in Gmail: ${cleanEmail}`}
            className="inline-flex items-center gap-1.5 font-mono cursor-pointer hover:text-[#d4af37]"
          >
            {showIcon && <Mail className={`h-3 w-3 text-[#d4af37] ${iconClassName}`} />}
            <span>{cleanEmail}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleMenu}
            aria-label="Options"
            title="Email options and fallback"
            className="text-neutral-500 hover:text-[#d4af37] cursor-pointer"
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <span className={`group inline-flex items-center gap-1 font-mono text-[10.5px] ${className}`}>
          <button
            type="button"
            onClick={handlePrimaryClick}
            title={`Compose email in Gmail: ${cleanEmail} (${currentTemplate.label})`}
            className="inline-flex items-center gap-1 text-neutral-400 transition-colors hover:text-[#d4af37] hover:underline cursor-pointer"
          >
            {showIcon && (
              <Mail
                className={`h-3 w-3 shrink-0 text-neutral-500 transition-colors group-hover:text-[#d4af37] ${iconClassName}`}
              />
            )}
            <span className="truncate max-w-[18rem]">{cleanEmail}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleMenu}
            aria-label="Email options"
            title="Email options (templates, mailto fallback)"
            className="text-neutral-600 transition-colors hover:text-[#d4af37] cursor-pointer"
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </span>
      )}

      {/* Dropdown Popover */}
      {menuOpen && (
        <div
          className={`absolute z-50 mt-1 w-80 rounded-lg border border-white/15 bg-[#121217] p-3 text-left shadow-2xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
                Email Applicant
              </p>
              <p className="truncate text-xs font-medium text-white">{cleanEmail}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:border-white/20 hover:text-white cursor-pointer"
              title="Copy email address to clipboard"
            >
              {copiedEmail ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
              <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick Actions: Gmail & Mailto */}
          <div className="space-y-1 mb-2.5">
            <button
              type="button"
              onClick={(e) => {
                handlePrimaryClick(e);
                setMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md bg-[#d4af37]/15 border border-[#d4af37]/35 px-2.5 py-1.5 text-xs font-semibold text-[#f1d98c] hover:bg-[#d4af37]/25 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#d4af37]" />
                <span>Compose in Gmail</span>
              </span>
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </button>

            <button
              type="button"
              onClick={handleMailto}
              className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08] hover:text-white cursor-pointer"
              title="Open default system email client using mailto:"
            >
              <span className="flex items-center gap-1.5">
                <Send className="h-3 w-3 text-neutral-400" />
                <span>Default mail app (mailto)</span>
              </span>
              <span className="text-[9.5px] font-mono text-neutral-500">RFC 6068</span>
            </button>
          </div>

          {/* Template Selection */}
          <div className="border-t border-white/10 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-neutral-400">
                Message Template
              </span>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-[9.5px] text-neutral-400 hover:text-[#d4af37] flex items-center gap-1 cursor-pointer"
                title="Copy subject and prewritten body"
              >
                {copiedBody ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                <span>{copiedBody ? 'Copied' : 'Copy text'}</span>
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
              {templates.map((tpl) => {
                const isActive = tpl.id === currentTemplate.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={(e) => handleSelectTemplate(e, tpl.id)}
                    className={`flex w-full items-start gap-2 rounded-md p-1.5 text-left text-[11px] transition-colors cursor-pointer ${
                      isActive
                        ? 'border border-[#d4af37]/40 bg-[#d4af37]/10 text-white'
                        : 'border border-transparent hover:bg-white/5 text-neutral-300'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{templateIcon(tpl.id)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isActive ? 'text-[#f1d98c]' : 'text-neutral-200'}`}>
                          {tpl.label}
                        </span>
                        {tpl.id === defaultTemplate.id && (
                          <span className="text-[9px] font-mono text-emerald-400/90 uppercase">Auto</span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-neutral-400">{tpl.subject}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Box */}
          <div className="mt-2.5 rounded border border-white/10 bg-[#09090c] p-2 text-[10px]">
            <p className="truncate font-semibold text-neutral-300">
              <span className="text-neutral-400">Subject: </span>
              {currentTemplate.subject}
            </p>
            <p className="mt-1 line-clamp-2 text-neutral-400 whitespace-pre-line font-mono text-[9.5px]">
              {currentTemplate.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
