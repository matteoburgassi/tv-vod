import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { platformInit } from './utils/platformInit';
import './index.css';

platformInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
