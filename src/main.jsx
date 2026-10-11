import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import { registerGameServiceWorker } from './pwa.js';
registerGameServiceWorker();

createRoot(document.getElementById('root')).render(<App />);
