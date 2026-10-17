import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element for the app to render into');

// the README demo scenes load in development only, from the flute-preview query (ADR-038)
const isFlutePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('flute-preview');
const FluteProjectPreview = isFlutePreview
  ? lazy(() => import('./flute/ProjectPreview').then((module) => ({ default: module.FluteProjectPreview })))
  : null;

createRoot(root).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delay={300}>
        {FluteProjectPreview ? <Suspense fallback={null}><FluteProjectPreview enabled><App /></FluteProjectPreview></Suspense> : <App />}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
