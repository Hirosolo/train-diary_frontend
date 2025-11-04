import React from 'react';
import { setErrorNotifier, setSuccessNotifier } from './notify';

type Toast = {
  id: number;
  type: 'error' | 'success';
  message: string;
};

interface NotificationContextValue {
  notifyError: (message: string) => void;
  notifySuccess: (message: string) => void;
}

export const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export const useNotification = () => {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counterRef = React.useRef(0);

  const removeToast = React.useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const pushToast = React.useCallback((type: Toast['type'], message: string) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    // Auto dismiss after 4 seconds
    window.setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const notifyError = React.useCallback((message: string) => {
    pushToast('error', message);
  }, [pushToast]);

  const notifySuccess = React.useCallback((message: string) => {
    pushToast('success', message);
  }, [pushToast]);

  // Expose notifiers for non-React code (e.g., API module)
  React.useEffect(() => {
    setErrorNotifier(notifyError);
    setSuccessNotifier(notifySuccess);
  }, [notifyError, notifySuccess]);

  return (
    <NotificationContext.Provider value={{ notifyError, notifySuccess }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.type === 'error' ? 'toast-error' : 'toast-success'}`}
            role="status"
            onClick={() => removeToast(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};


