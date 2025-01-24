// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ReactWalletsProvider from './ReactWalletsProvider'; // <--- Importamos nuestro proveedor

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ReactWalletsProvider>
      <App />
    </ReactWalletsProvider>
  </React.StrictMode>
);

reportWebVitals();
