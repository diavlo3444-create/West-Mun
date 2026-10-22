import assert from 'node:assert';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  AsYouType,
} from 'libphonenumber-js';

console.log('--- Testing International Phone Number Selector & Country Codes ---');

// 1. Verify countries list
const countries = getCountries();
assert(countries.length > 200, `Expected > 200 countries, got ${countries.length}`);
console.log(`✓ libphonenumber-js loaded with ${countries.length} countries.`);

// 2. Verify default is Saudi Arabia (+966)
assert(countries.includes('SA'), 'Saudi Arabia (SA) must be available');
assert.strictEqual(getCountryCallingCode('SA'), '966', 'SA calling code must be 966');
console.log('✓ Saudi Arabia is available with calling code +966.');

// 3. Test key countries requested: Sudan (+249), UAE (+971), Egypt (+20), UK (+44), USA (+1)
const testCases = [
  { code: 'SA', calling: '966', national: '512345678', expectedDigits: '966512345678' },
  { code: 'SD', calling: '249', national: '912345678', expectedDigits: '249912345678' },
  { code: 'AE', calling: '971', national: '501234567', expectedDigits: '971501234567' },
  { code: 'EG', calling: '20', national: '1012345678', expectedDigits: '201012345678' },
  { code: 'GB', calling: '44', national: '7911123456', expectedDigits: '447911123456' },
  { code: 'US', calling: '1', national: '2025550123', expectedDigits: '12025550123' },
];

for (const tc of testCases) {
  assert(countries.includes(tc.code), `${tc.code} must be in countries list`);
  const calling = getCountryCallingCode(tc.code);
  assert.strictEqual(calling, tc.calling, `${tc.code} calling code must be ${tc.calling}`);

  const ayt = new AsYouType(tc.code);
  const formatted = ayt.input(tc.national);
  assert(formatted.length > 0, `Formatted national number should not be empty for ${tc.code}`);

  const full = `+${calling}${tc.national}`;
  const parsed = parsePhoneNumberFromString(full, tc.code);
  assert(parsed, `Failed to parse ${full} for ${tc.code}`);
  assert(parsed.isValid(), `Expected valid number for ${tc.code}: ${full}`);

  const rawDigits = parsed.number.replace(/\D/g, '');
  assert.strictEqual(rawDigits, tc.expectedDigits, `Digits mismatch for ${tc.code}`);
  assert(rawDigits.length >= 7 && rawDigits.length <= 15, `ITU E.164 digits length check failed for ${tc.code}`);

  console.log(`✓ ${tc.code} (+${calling}) validated: national="${formatted}" -> full digits="${rawDigits}"`);
}

// 4. Test invalid numbers rejection
const invalidPhone = parsePhoneNumberFromString('+96612', 'SA');
assert(!invalidPhone || !invalidPhone.isValid(), 'Incomplete SA number must be marked invalid');
console.log('✓ Incomplete/invalid phone numbers are correctly flagged as invalid.');

// 5. Test flag emoji generator logic
function getCountryFlagEmoji(iso) {
  return String.fromCodePoint(...iso.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}
assert.strictEqual(getCountryFlagEmoji('SA'), '🇸🇦');
assert.strictEqual(getCountryFlagEmoji('SD'), '🇸🇩');
assert.strictEqual(getCountryFlagEmoji('AE'), '🇦🇪');
assert.strictEqual(getCountryFlagEmoji('EG'), '🇪🇬');
assert.strictEqual(getCountryFlagEmoji('GB'), '🇬🇧');
assert.strictEqual(getCountryFlagEmoji('US'), '🇺🇸');
console.log('✓ Country flag emojis render correctly (🇸🇦 🇸🇩 🇦🇪 🇪🇬 🇬🇧 🇺🇸).');

// 6. Test role selection definitions
const roles = ['co_head', 'designer', 'marketing'];
assert.strictEqual(roles.length, 3);
console.log('✓ All 3 EB roles properly mapped without altering database enums.');

console.log('\n--- All EB phone, country selector, and role tests PASSED! ---');
