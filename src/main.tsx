import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configure } from 'tv-vod-auth';
import { configureApi } from 'tv-vod-api';
import '@digitalvirgo/drm-player/styles.css';
import App from './App';
import { platformInit } from './utils/platformInit';
import { SERVICE_ID } from './constants/api';
import './index.css';

configure({
  serviceId: SERVICE_ID,
  authHost: import.meta.env.VITE_AUTH_HOST || '/api/user',
  smartVideoHost: import.meta.env.VITE_SMART_VIDEO_HOST || '/api/smartvideo',
  authLogin: import.meta.env.VITE_AUTH_LOGIN || undefined,
  authSecret: import.meta.env.VITE_AUTH_SECRET || undefined,
  castlabsLicense: import.meta.env.VITE_CASTLABS_LICENSE || undefined,
  drmEnv: import.meta.env.VITE_DRM_ENV || undefined,
});

configureApi({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  apiKey: import.meta.env.VITE_API_KEY,
  apiSecret: import.meta.env.VITE_API_SECRET,
  campaignId: import.meta.env.VITE_CAMPAIGN_ID,
  countryCode: import.meta.env.VITE_COUNTRY_CODE,
  languageCode: import.meta.env.VITE_LANGUAGE_CODE,
});

platformInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
