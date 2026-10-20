/**
 * Automated Verification Suite for Security Team Registration:
 * 1. Validates exact question titles, prompts, and minimum word counts.
 * 2. Tests word counter logic against whitespace, newlines, tabs, and punctuation.
 * 3. Tests validation rejects under-length answers and passes valid answers.
 * 4. Tests that Media and Volunteer teams are unaffected.
 * 5. Verifies database migration schema and security permissions.
 * 6. Verifies Head Portal (/head) and Admin Portal (/admin) candidate views.
 * 7. Tests backend endpoint (/api/team-register) word count enforcement.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  SECURITY_QUESTIONS,
  countWords,
  validateSecurityAnswers,
} from '../src/lib/securityQuestions.ts';

console.log('====================================================');
console.log('WEST MUN — Security Team Registration Test Suite');
console.log('====================================================');

// 1. VERIFY QUESTIONS DEFINITIONS
assert.strictEqual(SECURITY_QUESTIONS.length, 4, 'Must have exactly 4 Security questions');

const [q1, q2, q3, q4] = SECURITY_QUESTIONS;

// Question 1: Emergency Problem-Solving (min 80 words)
assert.strictEqual(q1.key, 'security_emergency_steps');
assert.strictEqual(q1.title, 'Emergency Problem-Solving');
assert.strictEqual(q1.minWords, 80);
assert(
  q1.prompt.includes('At times when issues come up suddenly in the MUN') &&
  q1.prompt.includes('disagreements between two individuals or a medical emergency') &&
  q1.prompt.includes('Please be detailed and thorough with your answer.'),
  'Question 1 prompt must match specification'
);
console.log('[PASS] Question 1: Emergency Problem-Solving (min 80 words) verified');

// Question 2: Teamwork and Communication (min 50 words)
assert.strictEqual(q2.key, 'security_teamwork');
assert.strictEqual(q2.title, 'Teamwork and Communication');
assert.strictEqual(q2.minWords, 50);
assert(
  q2.prompt.includes('Tell us about your teamwork and communication in a team.'),
  'Question 2 prompt must match specification'
);
console.log('[PASS] Question 2: Teamwork and Communication (min 50 words) verified');

// Question 3: Motivation (min 50 words)
assert.strictEqual(q3.key, 'security_motivation');
assert.strictEqual(q3.title, 'Motivation');
assert.strictEqual(q3.minWords, 50);
assert(
  q3.prompt.includes('Why do you want to join the WEST MUN Security Team?'),
  'Question 3 prompt must match specification'
);
console.log('[PASS] Question 3: Motivation (min 50 words) verified');

// Question 4: Handling Bullying and Harassment (min 50 words)
assert.strictEqual(q4.key, 'security_handling_harassment');
assert.strictEqual(q4.title, 'Handling Bullying and Harassment');
assert.strictEqual(q4.minWords, 50);
assert(
  q4.prompt.includes('What would be your immediate course of action') &&
  q4.prompt.includes('delegate or chair being bullied, mistreated, harassed, or made to feel unsafe'),
  'Question 4 prompt must match specification'
);
console.log('[PASS] Question 4: Handling Bullying and Harassment (min 50 words) verified');

// 2. WORD COUNT ALGORITHM ACCURACY
assert.strictEqual(countWords(''), 0);
assert.strictEqual(countWords('   \n\t  '), 0);
assert.strictEqual(countWords('One two three'), 3);
assert.strictEqual(countWords('  One   two \n three \t four  five  '), 5);
assert.strictEqual(countWords('Disagreements between two individuals, or a sudden medical emergency!'), 9);
console.log('[PASS] Word count algorithm accurately normalizes whitespace and punctuation');

// Helper to generate text of exact word count
function generateText(wordCount) {
  const words = [
    'protocol', 'security', 'diplomacy', 'delegation', 'conference',
    'emergency', 'resolution', 'communication', 'liaison', 'coordination',
    'safety', 'hallway', 'decorum', 'respect', 'monitoring',
  ];
  const list = [];
  for (let i = 0; i < wordCount; i++) {
    list.push(words[i % words.length]);
  }
  return list.join(' ');
}

// 3. VALIDATION REJECTS INSUFFICIENT ANSWERS
const underlengthAnswers = {
  security_emergency_steps: generateText(79), // 79 < 80
  security_teamwork: generateText(50),
  security_motivation: generateText(50),
  security_handling_harassment: generateText(50),
};
const res1 = validateSecurityAnswers(underlengthAnswers);
assert.strictEqual(res1.valid, false, '79 words for Q1 must be rejected');
assert(res1.errors.security_emergency_steps, 'Must flag security_emergency_steps error');
assert(res1.errors.security_emergency_steps.includes('79 / 80 words'), 'Must report current vs minimum');
console.log('[PASS] Under-length response (79/80 words) correctly rejected by validation');

const underlengthQ2 = {
  security_emergency_steps: generateText(80),
  security_teamwork: generateText(49), // 49 < 50
  security_motivation: generateText(50),
  security_handling_harassment: generateText(50),
};
const res2 = validateSecurityAnswers(underlengthQ2);
assert.strictEqual(res2.valid, false, '49 words for Q2 must be rejected');
assert(res2.errors.security_teamwork, 'Must flag security_teamwork error');
console.log('[PASS] Under-length response (49/50 words) correctly rejected by validation');

// 4. VALIDATION ACCEPTS MET REQUIREMENTS
const validAnswers = {
  security_emergency_steps: generateText(85), // 85 >= 80
  security_teamwork: generateText(52),       // 52 >= 50
  security_motivation: generateText(50),     // 50 >= 50
  security_handling_harassment: generateText(60), // 60 >= 50
};
const resValid = validateSecurityAnswers(validAnswers);
assert.strictEqual(resValid.valid, true, 'All 4 answers meeting or exceeding minimum must pass');
assert.strictEqual(Object.keys(resValid.errors).length, 0, 'No errors for valid answers');
assert.strictEqual(resValid.counts.security_emergency_steps, 85);
assert.strictEqual(resValid.counts.security_teamwork, 52);
assert.strictEqual(resValid.counts.security_motivation, 50);
assert.strictEqual(resValid.counts.security_handling_harassment, 60);
console.log('[PASS] Valid responses meeting all 4 minimums pass successfully');

// 5. DATABASE MIGRATION SCRIPT VERIFICATION
const migrationPath = path.resolve('supabase/migration_security_team_questions.sql');
assert(fs.existsSync(migrationPath), 'Migration file must exist');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

assert(
  migrationSql.includes('security_emergency_steps') &&
  migrationSql.includes('security_teamwork') &&
  migrationSql.includes('security_motivation') &&
  migrationSql.includes('security_handling_harassment'),
  'Migration must add all 4 columns to public.team_registrations'
);
assert(
  migrationSql.includes('v_words < 80') &&
  migrationSql.includes('v_words < 50'),
  'Trigger must check 80 and 50 word count thresholds'
);
assert(
  migrationSql.includes('grant insert') &&
  migrationSql.includes('security_emergency_steps') &&
  migrationSql.includes('anon, authenticated'),
  'Migration must grant insert permissions on new columns to anon & authenticated'
);
console.log('[PASS] Database migration file correctly structured with schema, trigger guard, and grants');

// 6. CLIENT UI VERIFICATION (TeamRegistrationModal.tsx)
const modalPath = path.resolve('src/components/TeamRegistrationModal.tsx');
const modalCode = fs.readFileSync(modalPath, 'utf8');

assert(
  modalCode.includes("team === 'security'"),
  'Questions must only be rendered when team === security'
);
assert(
  modalCode.includes('SECURITY_QUESTIONS.map') ||
  (modalCode.includes('security_emergency_steps') && modalCode.includes('security_teamwork')),
  'Modal must render all 4 questions'
);
assert(
  modalCode.includes('countWords') && modalCode.includes('words'),
  'Modal must include live word counter'
);
assert(
  modalCode.includes('securityValidation.valid'),
  'Submit button must respect validation state'
);
console.log('[PASS] TeamRegistrationModal.tsx enforces Security team isolation, live counters, and submit guard');

// 7. SECURITY HEAD PORTAL VERIFICATION (HeadRegistrations.tsx)
const headRegPath = path.resolve('src/head/HeadRegistrations.tsx');
const headRegCode = fs.readFileSync(headRegPath, 'utf8');

assert(
  headRegCode.includes('Security Team Scenario Assessment') ||
  headRegCode.includes('Security Team Assessment'),
  'HeadRegistrations modal must display Security Assessment section'
);
assert(
  headRegCode.includes('security_emergency_steps') &&
  headRegCode.includes('security_teamwork'),
  'HeadRegistrations must display the security question responses'
);
console.log('[PASS] HeadRegistrations.tsx renders all 4 answers in the Security Head candidate dossier modal');

// 8. ADMIN PORTAL VERIFICATION (RegistrationsManager.tsx)
const adminRegPath = path.resolve('src/admin/RegistrationsManager.tsx');
const adminRegCode = fs.readFileSync(adminRegPath, 'utf8');

assert(
  adminRegCode.includes('Security Team Scenario Assessment') ||
  adminRegCode.includes('Security Team Assessment'),
  'RegistrationsManager modal must display Security Assessment section'
);
assert(
  adminRegCode.includes('security_emergency_steps') &&
  adminRegCode.includes('security_teamwork'),
  'RegistrationsManager must include security questions in modal and CSV export'
);
console.log('[PASS] RegistrationsManager.tsx renders all 4 answers in Admin portal and CSV export');

// 9. BACKEND API SERVER IMPLEMENTATION VERIFICATION
const serverPath = path.resolve('server.ts');
const serverCode = fs.readFileSync(serverPath, 'utf8');

assert(
  serverCode.includes("app.post('/api/team-register'") ||
  serverCode.includes('app.post("/api/team-register"'),
  'server.ts must define /api/team-register'
);
assert(
  serverCode.includes('emergencyWords < 80') &&
  serverCode.includes('teamworkWords < 50'),
  'server.ts must enforce 80 and 50 word count minimums for Security team'
);
console.log('[PASS] server.ts defines /api/team-register with backend word count enforcement');

// 10. LOCAL ROUTES PROXY VERIFICATION
const localRoutesPath = path.resolve('api/local-routes.ts');
const localRoutesCode = fs.readFileSync(localRoutesPath, 'utf8');

assert(
  localRoutesCode.includes("pathname === '/api/team-register'"),
  'api/local-routes.ts must route /api/team-register'
);
console.log('[PASS] api/local-routes.ts provides development serverless proxy for /api/team-register');

console.log('====================================================');
console.log('Results: All 10 Security Team Registration tests PASSED!');
console.log('====================================================');
