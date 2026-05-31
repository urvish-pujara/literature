import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { configureApi } from '@literature/domain';
import { App } from './App.js';
import { API_BASE } from './env.js';
import './styles.css';

configureApi({ baseUrl: API_BASE });

const root = document.getElementById('root');
if (!root) throw new Error('root element missing');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
