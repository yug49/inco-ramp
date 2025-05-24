'use client';

import React from 'react';
import { useNotifications } from './NotificationContext';

export const WarriorNotificationDialog: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  // Hide the entire dialog when there are no notifications
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(-10.5rem+384px)] right-45 z-50 w-64 animate-fadeIn">
      <div className="relative animate-slideIn">
        {/* Speech bubble pointer */}
        <div className="absolute w-0 h-0 border-l-[10px] border-l-transparent border-t-[16px] border-slate-700/70 border-r-[10px] border-r-transparent bottom-[-14px] right-12 transform rotate-180"></div>
        
        {/* Speech bubble / dialogue box */}
        <div className="rounded-2xl bg-slate-800/80 backdrop-blur-lg p-3 border border-slate-700/70 shadow-xl">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`mb-2 last:mb-0 p-3 rounded-xl shadow-md text-sm flex justify-between items-center animate-slideIn ${
                notification.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : notification.type === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}
            >
              <div className="flex-1 mr-2">{notification.message}</div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors duration-200"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarriorNotificationDialog;
