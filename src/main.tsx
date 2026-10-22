import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// Register PWA Service Worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available for GATE Multi-QR Scanner.');
  },
  onOfflineReady() {
    console.log('GATE Multi-QR Scanner is ready to work offline.');
  },
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
