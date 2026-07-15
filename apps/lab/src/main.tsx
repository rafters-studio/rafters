import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './app';

const container = document.getElementById('root');
if (!container) throw new Error('lab: #root missing');
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
