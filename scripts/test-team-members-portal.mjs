import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- Testing WEST MUN 2027 Cinematic Team Members Portal ---');

// 1. Verify TeamWelcomeIntro component file and features
const introPath = path.resolve('src/team/TeamWelcomeIntro.tsx');
assert(fs.existsSync(introPath), 'TeamWelcomeIntro.tsx must exist');
const introSource = fs.readFileSync(introPath, 'utf8');

assert(introSource.includes('WEST MUN 2027 · CONFERENCE CORPS'), 'Must include official WEST MUN Conference Corps header');
assert(introSource.includes('#050508'), 'Must use near-black dark background #050508');
assert(introSource.includes('#d4af37'), 'Must use signature WEST MUN gold #d4af37');
assert(introSource.includes('canvasRef'), 'Must feature ambient particle canvas for delicate gold motes');
assert(introSource.includes('prefers-reduced-motion') || introSource.includes('prefersReducedMotion'), 'Must respect prefers-reduced-motion');
assert(introSource.includes('memberName'), 'Must render real member name');
assert(introSource.includes('roleTitle'), 'Must render member role title');
assert(introSource.includes('Skip intro'), 'Must provide an accessible skip option');
assert(introSource.includes('Operational Clearance Active'), 'Must display verified active credential clearance');

// 2. Verify TeamMemberPortal component file and features
const portalPath = path.resolve('src/team/TeamMemberPortal.tsx');
assert(fs.existsSync(portalPath), 'TeamMemberPortal.tsx must exist');
const portalSource = fs.readFileSync(portalPath, 'utf8');

// Imports & Intro integration
assert(portalSource.includes('import { TeamWelcomeIntro }'), 'TeamMemberPortal must import TeamWelcomeIntro');
assert(portalSource.includes('showIntro'), 'TeamMemberPortal must manage showIntro state');
assert(portalSource.includes('sessionStorage.getItem'), 'Must check session storage to show intro once per session');
assert(portalSource.includes('sessionStorage.setItem'), 'Must remember when intro has been completed');
assert(portalSource.includes('sessionStorage.removeItem'), 'Must clear intro state on sign out');
assert(portalSource.includes('<TeamWelcomeIntro'), 'Must render TeamWelcomeIntro component');
assert(portalSource.includes('Replay Intro'), 'Must provide a Replay Intro button');

// Hero section & animated team identity
assert(portalSource.includes('WEST MUN 2027'), 'Hero must show WEST MUN 2027 branding');
assert(portalSource.includes('memberName'), 'Hero must prominently display the member name');
assert(portalSource.includes('roleTitle || defaultRoleLabel'), 'Hero must display verified member role');
assert(portalSource.includes('info.briefing'), 'Hero must display team briefing mandate');

// Live team information: Role, Shifts, Pass, Scanner
assert(portalSource.includes('My Role & Mandate'), 'Must include My Role & Mandate dossier section');
assert(portalSource.includes('My Shifts & Deployment'), 'Must include My Shifts section');
assert(portalSource.includes('My QR Pass'), 'Must retain My QR Pass integration');
assert(portalSource.includes('team === "security"') && portalSource.includes('/scanner'), 'Scanner must be restricted exclusively to security team members');
assert(portalSource.includes('No shifts assigned yet'), 'Must provide clean editorial empty state for unassigned shifts');

// Route checks preserved
assert(portalSource.includes('isTeamHub'), 'Must handle /team-members hub route');
assert(portalSource.includes('/security') && portalSource.includes('/media') && portalSource.includes('/volunteer'), 'Must preserve team routes');

console.log('All WEST MUN Team Members Portal tests passed successfully!');
