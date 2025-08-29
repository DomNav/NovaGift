import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { formatAddress } from '@/lib/wallet';

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'envelope_received':
      return '🎁';
    case 'envelope_opened':
      return '✅';
    case 'envelope_expired':
      return '⏰';
    case 'system':
      return '🔔';
    default:
      return '📬';
  }
};

export const NotificationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { summary, isLoading, markAsRead, markAllAsRead } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative glass-card px-3 py-1.5 hover:bg-brand-text/5 transition-colors rounded-full"
        disabled={isLoading}
      >
        <span className="text-sm">🔔</span>

        {/* Notification Badge */}
        {summary.totalUnread > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
            {summary.totalUnread > 99 ? '99+' : summary.totalUnread}
          </div>
        )}

        {/* Pulse indicator for pending envelopes */}
        {summary.pendingEnvelopes > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-positive rounded-full animate-pulse" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-brand-surface border border-brand-text/10 dark:border-white/10 rounded-lg shadow-lg backdrop-blur-lg z-[9999] max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-brand-text/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-brand-text">Notifications</h3>
              {summary.totalUnread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-text/60 hover:text-brand-text transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Summary */}
            {summary.pendingEnvelopes > 0 && (
              <div className="mt-2 p-2 bg-brand-positive/10 rounded-md">
                <p className="text-xs text-brand-positive font-medium">
                  🎁 {summary.pendingEnvelopes} gift{summary.pendingEnvelopes === 1 ? '' : 's'}{' '}
                  waiting to be opened!
                </p>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {summary.recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-brand-text/50">
                <div className="text-2xl mb-2">📭</div>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              summary.recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-brand-text/5 last:border-b-0 hover:bg-brand-text/5 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-brand-positive/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.actionUrl ? (
                    <Link to={notification.actionUrl} className="block">
                      <NotificationContent notification={notification} />
                    </Link>
                  ) : (
                    <NotificationContent notification={notification} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {summary.recentNotifications.length > 0 && (
            <div className="p-3 border-t border-brand-text/10 dark:border-white/10">
              <Link
                to="/activity"
                className="text-xs text-brand-text/60 hover:text-brand-text transition-colors block text-center"
                onClick={() => setIsOpen(false)}
              >
                View all activity →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface NotificationContentProps {
  notification: Notification;
}

const NotificationContent = ({ notification }: NotificationContentProps) => (
  <div className="flex items-start gap-3">
    <div className="text-lg mt-0.5 flex-shrink-0">{getNotificationIcon(notification.type)}</div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-text truncate">{notification.title}</p>
        {!notification.read && (
          <div className="w-2 h-2 bg-brand-positive rounded-full flex-shrink-0 ml-2" />
        )}
      </div>

      <p className="text-xs text-brand-text/70 mt-1 line-clamp-2">{notification.message}</p>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-brand-text/50">{formatTimeAgo(notification.timestamp)}</span>

        {notification.amountUsd && (
          <span className="text-xs font-medium text-brand-positive">
            ${notification.amountUsd.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  </div>
);
