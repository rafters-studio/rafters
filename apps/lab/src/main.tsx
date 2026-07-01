import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { RaftersElement } from '@rafters/ui/primitives/rafters-element';
import '@rafters/ui/next/button.element';
import utilityCss from './styles/global.css?inline';
import './styles/global.css';
import { App } from './app';

// Web Components carry the same utility class strings as the React binding;
// the compiled sheet must be physically present in each shadow root.
RaftersElement.setUtilityCSS(utilityCss);

const container = document.getElementById('root');
if (!container) throw new Error('lab: #root missing');
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
