import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoApp } from './app';
import './index.css';
import 'react-mosaic-ui/styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);
