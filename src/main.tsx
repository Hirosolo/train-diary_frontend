import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/global.css';
import { DashboardRefreshProvider } from './context/DashboardRefreshContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DashboardRefreshProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </DashboardRefreshProvider>
    </AuthProvider>
  </React.StrictMode>,
);