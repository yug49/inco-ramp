'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Define notification type
export interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

// Define context type
interface NotificationContextType {
  notifications: NotificationProps[];
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
}

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { message, type, id }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
