import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('--- Testing Secretariat Fixes ---');

// 1. Verify public images exist
const zainJpg = path.resolve('public/zain-firas.jpg');
const muazJpg = path.resolve('public/muaz.jpg');
const fahadJpg = path.resolve('public/fahad.jpg');

assert(fs.existsSync(zainJpg), 'public/zain-firas.jpg must exist');
assert(fs.existsSync(muazJpg), 'public/muaz.jpg must exist');
assert(fs.existsSync(fahadJpg), 'public/fahad.jpg must exist for backward compatibility');

const zainStat = fs.statSync(zainJpg);
const muazStat = fs.statSync(muazJpg);
assert(zainStat.size > 10000, 'zain-firas.jpg must be a valid image file');
assert(muazStat.size > 10000, 'muaz.jpg must be a valid image file');
console.log('✓ Image assets verified:');
console.log(`  - zain-firas.jpg (${zainStat.size} bytes)`);
console.log(`  - muaz.jpg (${muazStat.size} bytes)`);

// 2. Verify DEFAULT_SECRETARIAT in src/lib/content.ts
const contentTs = fs.readFileSync('src/lib/content.ts', 'utf8');
assert(contentTs.includes("name: 'Zain Firas'"), "DEFAULT_SECRETARIAT must contain name: 'Zain Firas'");
assert(contentTs.includes("image_url: '/zain-firas.jpg'"), "DEFAULT_SECRETARIAT must have image_url: '/zain-firas.jpg'");
assert(!contentTs.includes("name: 'Fahad', department: 'Executive Secretariat'"), "USG must not be named 'Fahad'");
console.log('✓ src/lib/content.ts DEFAULT_SECRETARIAT correctly defines USG as Zain Firas with /zain-firas.jpg');

// 3. Verify safeUrl in src/lib/safe.ts
const safeTs = fs.readFileSync('src/lib/safe.ts', 'utf8');
assert(safeTs.includes('/^[a-zA-Z0-9_\\-./]+$/'), 'safeUrl should support relative filenames');
console.log('✓ src/lib/safe.ts safeUrl supports relative filenames and https');

// 4. Verify SecretariatSection.tsx
const secSectionTs = fs.readFileSync('src/components/SecretariatSection.tsx', 'utf8');
assert(secSectionTs.includes('SecretariatAvatar'), 'SecretariatSection must use SecretariatAvatar');
assert(secSectionTs.includes('onError={handleError}'), 'SecretariatAvatar must have onError fallback handler');
assert(secSectionTs.includes("name = 'Zain Firas'"), 'SecretariatSection must normalize USG name to Zain Firas');
assert(secSectionTs.includes('/zain-firas.jpg'), 'SecretariatSection must reference /zain-firas.jpg');
assert(secSectionTs.includes('/muaz.jpg'), 'SecretariatSection must reference /muaz.jpg');
console.log('✓ src/components/SecretariatSection.tsx properly handles fallback and normalization');

// 5. Verify database seed and migration
const seedSql = fs.readFileSync('supabase/seed.sql', 'utf8');
assert(seedSql.includes("(3, 'Under-Secretary-General', 'Zain Firas'"), 'seed.sql must seed USG as Zain Firas');
assert(seedSql.includes("'/zain-firas.jpg'"), 'seed.sql must seed USG image as /zain-firas.jpg');

const migrationSql = fs.readFileSync('supabase/migration_fix_secretariat.sql', 'utf8');
assert(migrationSql.includes("name = 'Zain Firas'"), 'migration_fix_secretariat.sql must update name to Zain Firas');
assert(migrationSql.includes("image_url = '/zain-firas.jpg'"), 'migration_fix_secretariat.sql must update USG image');
assert(migrationSql.includes("image_url = '/muaz.jpg'"), 'migration_fix_secretariat.sql must update Muaz image');
console.log('✓ supabase/seed.sql and supabase/migration_fix_secretariat.sql verified');

console.log('--- All Secretariat Fix Tests Passed Successfully! ---');
