import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles.css';

// Keeps the installed app up to date: new versions load on the next launch.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
