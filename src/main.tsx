import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configure } from '@digitalvirgo/drm-player';
import '@digitalvirgo/drm-player/styles.css';
import App from './App';
import { platformInit } from './utils/platformInit';
import { SERVICE_ID } from './constants/api';
import './index.css';

configure({
  serviceId: SERVICE_ID,
  castlabsLicense: import.meta.env.VITE_CASTLABS_LICENSE || undefined,
  drmEnv: import.meta.env.VITE_DRM_ENV || undefined,
});

platformInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
