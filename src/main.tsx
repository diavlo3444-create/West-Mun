import { createRoot } from 'react-dom/client';
// Fonts are bundled with the site (no requests to Google Fonts or other third parties).
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-800.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import '@fontsource/plus-jakarta-sans/latin-300.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import './index.css';

// Tiny path router. Each area is its own code chunk, so visitors of the public
// site never download the admin panel.
async function boot() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  let Page: React.ComponentType;
  if (path === '/admin' || path.startsWith('/admin/')) {
    Page = (await import('./admin/AdminApp')).default;
  } else if (path === '/head' || path.startsWith('/head/')) {
    Page = (await import('./head/HeadPortal')).default;
  } else if (path === '/signup') {
    Page = (await import('./pages/SignupPage')).default;
  } else if (path === '/login') {
    Page = (await import('./pages/LoginPage')).default;
  } else if (path === '/volunteer' || path === '/media' || path === '/security') {
    Page = (await import('./team/TeamMemberPortal')).default;
  } else if (path === '/pass') {
    Page = (await import('./pages/PassPage')).default;
  } else if (path === '/scanner') {
    Page = (await import('./pages/ScannerPage')).default;
  } else if (path === '/terms') {
    const { LegalPage } = await import('./pages/LegalPage');
    Page = () => <LegalPage kind="terms" />;
  } else if (path === '/privacy') {
    const { LegalPage } = await import('./pages/LegalPage');
    Page = () => <LegalPage kind="privacy" />;
  } else if (path === '/preview' || path.startsWith('/preview/')) {
    Page = (await import('./App')).default;
  } else {
    Page = (await import('./App')).default;
  }
  createRoot(document.getElementById('root')!).render(<Page />);
}

boot();
