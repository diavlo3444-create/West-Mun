import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- Testing WEST MUN EB Cinematic Sign-In Welcome Animation ---');

// 1. Verify EbWelcomeAnimation component source file
const compPath = path.resolve('src/components/eb/EbWelcomeAnimation.tsx');
assert(fs.existsSync(compPath), 'EbWelcomeAnimation.tsx component must exist');
const compSource = fs.readFileSync(compPath, 'utf8');

// Check required visual & branding elements
assert(compSource.includes('WEST MUN 2027 · Executive Board'), 'Must include official WEST MUN Executive Board banner');
assert(compSource.includes('#050508'), 'Must use near-black dark background #050508');
assert(compSource.includes('#d4af37'), 'Must use luxury WEST MUN gold #d4af37');
assert(compSource.includes('canvasRef'), 'Must feature ambient particle canvas');
assert(compSource.includes('prefers-reduced-motion') || compSource.includes('prefersReducedMotion'), 'Must respect prefers-reduced-motion');
assert(compSource.includes('Reports To'), 'Must include Reports To relationship visual hierarchy');
assert(compSource.includes('profile.reportingHeadName'), 'Must render real reporting head name');
assert(compSource.includes('hasReportingHead'), 'Must conditionally check for reporting head existence');
assert(compSource.includes('Skip intro'), 'Must provide an accessible skip option');

// Verify graceful skip when no reporting head
assert(
  compSource.includes('hasReportingHead ?') && compSource.includes('Authorized Operational Credential'),
  'Must gracefully skip supervisor card and never invent fake head if none is assigned'
);

// 2. Verify EbNavbar replay button & prop
const navbarPath = path.resolve('src/components/eb/EbNavbar.tsx');
assert(fs.existsSync(navbarPath), 'EbNavbar.tsx must exist');
const navbarSource = fs.readFileSync(navbarPath, 'utf8');
assert(navbarSource.includes('onReplayWelcome?: () => void'), 'EbNavbar must accept onReplayWelcome prop');
assert(navbarSource.includes('onReplayWelcome &&'), 'EbNavbar must render welcome replay button when provided');

// 3. Verify EbOverviewView replay button & prop
const overviewPath = path.resolve('src/components/eb/EbOverviewView.tsx');
assert(fs.existsSync(overviewPath), 'EbOverviewView.tsx must exist');
const overviewSource = fs.readFileSync(overviewPath, 'utf8');
assert(overviewSource.includes('onReplayWelcome?: () => void'), 'EbOverviewView must accept onReplayWelcome prop');
assert(overviewSource.includes('onReplayWelcome &&'), 'EbOverviewView must render Replay Intro button');

// 4. Verify EbPortal.tsx integration
const portalPath = path.resolve('src/pages/EbPortal.tsx');
assert(fs.existsSync(portalPath), 'EbPortal.tsx must exist');
const portalSource = fs.readFileSync(portalPath, 'utf8');
assert(portalSource.includes('import { EbWelcomeAnimation }'), 'EbPortal must import EbWelcomeAnimation');
assert(portalSource.includes('showWelcome'), 'EbPortal must manage showWelcome state');
assert(portalSource.includes('sessionStorage.getItem(`wm_eb_welcome_${builtProfile.id}`)'), 'EbPortal must check session storage to show once per session');
assert(portalSource.includes('sessionStorage.setItem(`wm_eb_welcome_${profile.id}`'), 'EbPortal must remember when welcome has completed');
assert(portalSource.includes('sessionStorage.removeItem(`wm_eb_welcome_${profile.id}`)'), 'EbPortal must reset welcome flag on sign out');
assert(portalSource.includes('<EbWelcomeAnimation'), 'EbPortal must render EbWelcomeAnimation in JSX');
assert(portalSource.includes('onReplayWelcome={handleReplayWelcome}'), 'EbPortal must connect handleReplayWelcome to views');

console.log('All EB welcome animation integration assertions passed successfully!');
