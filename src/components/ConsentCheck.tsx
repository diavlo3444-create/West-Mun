import React from 'react';

interface ConsentCheckProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children?: React.ReactNode;
}

/** Required "I agree to the Terms and Privacy Policy" checkbox. */
export const ConsentCheck: React.FC<ConsentCheckProps> = ({ id, checked, onChange, error, children }) => (
  <div>
    <label htmlFor={id} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-relaxed cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af37] cursor-pointer"
      />
      <span>
        {children ?? (
          <>
            I have read and agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] underline underline-offset-2 hover:text-[#f3e5ab]">
              Terms of Service
            </a>{' '}
            and the{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] underline underline-offset-2 hover:text-[#f3e5ab]">
              Privacy Policy
            </a>
            .
          </>
        )}
      </span>
    </label>
    {error && <p className="text-[11px] text-red-400 mt-1 ml-6">{error}</p>}
  </div>
);
