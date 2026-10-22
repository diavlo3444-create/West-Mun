import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  AsYouType,
  type CountryCode,
} from 'libphonenumber-js';
import { Search, ChevronDown, Check, Globe2 } from 'lucide-react';

export interface PhoneValue {
  countryCode: CountryCode;
  callingCode: string;
  nationalNumber: string;
  fullNumber: string;
  digits: string;
  isValid: boolean;
}

export interface InternationalPhoneInputProps {
  id?: string;
  initialCountry?: CountryCode;
  value?: string;
  onChange: (value: PhoneValue) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  className?: string;
  label?: string;
  hint?: string;
}

export function getCountryFlagEmoji(iso: string): string {
  try {
    return String.fromCodePoint(
      ...iso
        .toUpperCase()
        .split('')
        .map((c) => 127397 + c.charCodeAt(0))
    );
  } catch {
    return '🌐';
  }
}

export interface CountryItem {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

const REGION_DISPLAY = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

// Priority countries shown at the top of the search dropdown for quick access
const PRIORITY_CODES: CountryCode[] = [
  'SA', // Saudi Arabia (Default)
  'AE', // UAE
  'SD', // Sudan
  'EG', // Egypt
  'KW', // Kuwait
  'QA', // Qatar
  'BH', // Bahrain
  'OM', // Oman
  'JO', // Jordan
  'GB', // United Kingdom
  'US', // United States
];

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  id = 'phone-input',
  initialCountry = 'SA',
  value = '',
  onChange,
  disabled = false,
  required = true,
  error,
  className = '',
  label,
  hint,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(initialCountry);
  const [nationalNumber, setNationalNumber] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setTouched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Build the complete country list once
  const allCountries = useMemo<CountryItem[]>(() => {
    const list: CountryItem[] = [];
    const countryCodes = getCountries();

    for (const code of countryCodes) {
      try {
        const callingCode = getCountryCallingCode(code);
        const name = REGION_DISPLAY ? REGION_DISPLAY.of(code) || code : code;
        list.push({
          code,
          name,
          callingCode,
          flag: getCountryFlagEmoji(code),
        });
      } catch {
        // Skip unmapped codes
      }
    }

    // Sort alphabetically by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, []);

  const countryMap = useMemo(() => {
    const map = new Map<CountryCode, CountryItem>();
    for (const c of allCountries) {
      map.set(c.code, c);
    }
    return map;
  }, [allCountries]);

  const currentCountry = countryMap.get(selectedCountry) || {
    code: selectedCountry,
    name: 'Saudi Arabia',
    callingCode: '966',
    flag: '🇸🇦',
  };

  // Filter countries for the search dropdown
  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^\+/, '');
    if (!query) return allCountries;

    return allCountries.filter((c) => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchCalling = c.callingCode.includes(query);
      const matchCode = c.code.toLowerCase().includes(query);
      return matchName || matchCalling || matchCode;
    });
  }, [allCountries, searchQuery]);

  const priorityCountryItems = useMemo(() => {
    if (searchQuery.trim()) return [];
    return PRIORITY_CODES.map((code) => countryMap.get(code)).filter(
      (c): c is CountryItem => Boolean(c)
    );
  }, [countryMap, searchQuery]);

  // Validation logic using libphonenumber-js
  const validatePhone = (numberStr: string, country: CountryCode): { isValid: boolean; digits: string; fullNumber: string } => {
    const callingCode = getCountryCallingCode(country);
    const cleanedDigits = numberStr.replace(/\D/g, '');

    if (!cleanedDigits) {
      return { isValid: false, digits: '', fullNumber: '' };
    }

    // Attempt parsing with country context
    let parsed = parsePhoneNumberFromString(numberStr, country);
    if (!parsed) {
      // Try with explicit plus and calling code
      parsed = parsePhoneNumberFromString(`+${callingCode}${cleanedDigits}`, country);
    }

    if (parsed) {
      const isValid = parsed.isValid();
      const rawDigits = parsed.number.replace(/\D/g, '');
      const fullNumber = parsed.formatInternational();
      return { isValid, digits: rawDigits, fullNumber };
    }

    // Fallback if parser didn't match, check standard ITU-T length
    const totalDigits = `${callingCode}${cleanedDigits}`;
    const isValid = totalDigits.length >= 7 && totalDigits.length <= 15;
    return {
      isValid,
      digits: totalDigits,
      fullNumber: `+${callingCode} ${numberStr}`,
    };
  };

  // Format as user types
  const handlePhoneChange = (rawInput: string) => {
    // If the user pasted an international number starting with +, try to detect the country
    if (rawInput.trim().startsWith('+')) {
      const parsed = parsePhoneNumberFromString(rawInput.trim());
      if (parsed && parsed.country) {
        setSelectedCountry(parsed.country);
        const formatted = parsed.formatNational();
        setNationalNumber(formatted);

        const { isValid, digits, fullNumber } = validatePhone(formatted, parsed.country);
        onChange({
          countryCode: parsed.country,
          callingCode: getCountryCallingCode(parsed.country),
          nationalNumber: formatted,
          fullNumber,
          digits,
          isValid,
        });
        return;
      }
    }

    // As-you-type formatting
    const ayt = new AsYouType(selectedCountry);
    const formatted = ayt.input(rawInput);
    setNationalNumber(formatted);

    const { isValid, digits, fullNumber } = validatePhone(formatted, selectedCountry);
    onChange({
      countryCode: selectedCountry,
      callingCode: currentCountry.callingCode,
      nationalNumber: formatted,
      fullNumber,
      digits,
      isValid,
    });
  };

  const handleSelectCountry = (country: CountryItem) => {
    setSelectedCountry(country.code);
    setIsDropdownOpen(false);
    setSearchQuery('');

    // Re-format existing national number with new country rules
    const ayt = new AsYouType(country.code);
    const formatted = ayt.input(nationalNumber);
    setNationalNumber(formatted);

    const { isValid, digits, fullNumber } = validatePhone(formatted, country.code);
    onChange({
      countryCode: country.code,
      callingCode: country.callingCode,
      nationalNumber: formatted,
      fullNumber,
      digits,
      isValid,
    });

    phoneInputRef.current?.focus();
  };

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  // Initial trigger to inform parent of default state
  useEffect(() => {
    const { isValid, digits, fullNumber } = validatePhone(nationalNumber, selectedCountry);
    onChange({
      countryCode: selectedCountry,
      callingCode: currentCountry.callingCode,
      nationalNumber,
      fullNumber,
      digits,
      isValid,
    });
  }, [selectedCountry]);

  // Placeholder based on country
  const placeholder = useMemo(() => {
    if (selectedCountry === 'SA') return '5X XXX XXXX';
    if (selectedCountry === 'AE') return '50 XXX XXXX';
    if (selectedCountry === 'EG') return '10 XXXX XXXX';
    if (selectedCountry === 'SD') return '91 XXX XXXX';
    if (selectedCountry === 'GB') return '7911 123456';
    if (selectedCountry === 'US') return '(555) 000-0000';
    return 'Phone number';
  }, [selectedCountry]);

  // Validation status
  const currentValidation = validatePhone(nationalNumber, selectedCountry);
  const showValidationWarning = touched && nationalNumber.trim().length > 0 && !currentValidation.isValid;

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-neutral-300">
          {label} {required && <span className="text-[#d4af37]">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          className={`flex items-center rounded-lg border transition-all ${
            showValidationWarning || error
              ? 'border-rose-500/80 bg-rose-950/10 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
              : currentValidation.isValid && nationalNumber.trim().length > 0
              ? 'border-[#d4af37]/80 bg-black/60 shadow-[0_0_12px_rgba(212,175,55,0.12)]'
              : 'border-white/10 bg-black/40 hover:border-white/20 focus-within:border-[#d4af37]'
          }`}
        >
          {/* Country Selector Button */}
          <button
            type="button"
            id={`${id}-country-btn`}
            aria-label={`Select country code, current is ${currentCountry.name} (+${currentCountry.callingCode})`}
            aria-expanded={isDropdownOpen}
            onClick={() => !disabled && setIsDropdownOpen((prev) => !prev)}
            disabled={disabled}
            className="group flex shrink-0 items-center gap-2 border-r border-white/10 px-3.5 py-3 text-left transition hover:bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] disabled:opacity-50"
          >
            <span className="text-xl leading-none select-none" role="img" aria-label={currentCountry.name}>
              {currentCountry.flag}
            </span>
            <span className="font-mono text-sm font-semibold tracking-wide text-neutral-200 group-hover:text-white">
              +{currentCountry.callingCode}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-[#d4af37]' : 'group-hover:text-white'
              }`}
            />
          </button>

          {/* National Phone Input */}
          <input
            id={id}
            ref={phoneInputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            required={required}
            value={nationalNumber}
            onBlur={() => setTouched(true)}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent px-3.5 py-3 text-sm text-white placeholder-neutral-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />

          {/* Valid Indicator */}
          {currentValidation.isValid && nationalNumber.trim().length > 0 && (
            <div className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/20 text-[#e2c258]" title="Valid phone number format">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Searchable Dropdown Popover */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[300px] max-w-sm rounded-xl border border-[#d4af37]/30 bg-[#0e0e12] p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code (+966, Sudan, UK…)"
                className="w-full rounded-lg border border-white/10 bg-black/60 pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d4af37]/70"
              />
            </div>

            {/* Country List Scroll Area */}
            <div className="max-h-60 overflow-y-auto overscroll-contain pr-1 text-xs divide-y divide-white/[0.04]">
              {/* Popular / Regional Countries */}
              {priorityCountryItems.length > 0 && (
                <div className="pb-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d4af37]">
                    Popular in Region
                  </div>
                  {priorityCountryItems.map((c) => (
                    <button
                      key={`priority-${c.code}`}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition ${
                        selectedCountry === c.code
                          ? 'bg-[#d4af37]/20 font-semibold text-white'
                          : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base leading-none select-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-neutral-400">+{c.callingCode}</span>
                        {selectedCountry === c.code && (
                          <Check className="h-3.5 w-3.5 text-[#d4af37]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All Countries Section */}
              <div className="pt-1">
                {!searchQuery.trim() && (
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    All Countries ({allCountries.length})
                  </div>
                )}
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-neutral-400">
                    No country matches "{searchQuery}"
                  </div>
                ) : (
                  filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left transition ${
                        selectedCountry === c.code
                          ? 'bg-[#d4af37]/20 font-semibold text-white'
                          : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base leading-none select-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-neutral-400">+{c.callingCode}</span>
                        {selectedCountry === c.code && (
                          <Check className="h-3.5 w-3.5 text-[#d4af37]" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Message or Error */}
      {showValidationWarning && (
        <p className="text-[11px] text-rose-300 flex items-center gap-1.5 pt-0.5">
          <span>Please enter a valid phone number for {currentCountry.name}.</span>
        </p>
      )}

      {error && (
        <p className="text-[11px] text-rose-300 flex items-center gap-1.5 pt-0.5">
          <span>{error}</span>
        </p>
      )}

      {hint && !showValidationWarning && !error && (
        <p className="text-[11px] text-neutral-500">{hint}</p>
      )}
    </div>
  );
};
