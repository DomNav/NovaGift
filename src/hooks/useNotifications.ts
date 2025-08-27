import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'envelope_received' | 'envelope_opened' | 'envelope_expired' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  envelopeId?: string;
  amountUsd?: number;
  asset?: string;
  actionUrl?: string;
}

export interface NotificationSummary {
  totalUnread: number;
  pendingEnvelopes: number;
  recentNotifications: Notification[];
}

interface NotificationState {
  notifications: Notification[];
  summary: NotificationSummary;
  isLoading: boolean;
  error: string | null;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'envelope_received',
    title: 'New Gift Received! 🎁',
    message: 'You received a $25.50 USDC gift envelope',
    timestamp: Date.now() - 300000, // 5 minutes ago
    read: false,
    envelopeId: 'env_123',
    amountUsd: 25.50,
    asset: 'USDC',
    actionUrl: '/open?e=env_123'
  },
  {
    id: '2', 
    type: 'envelope_received',
    title: 'New Gift Received! 🎁',
    message: 'You received a $100.00 XLM gift envelope',
    timestamp: Date.now() - 3600000, // 1 hour ago
    read: false,
    envelopeId: 'env_456',
    amountUsd: 100.00,
    asset: 'XLM',
    actionUrl: '/open?e=env_456'
  },
  {
    id: '3',
    type: 'envelope_opened',
    title: 'Gift Claimed ✅',
    message: 'Your $50.00 gift was successfully claimed by the recipient',
    timestamp: Date.now() - 7200000, // 2 hours ago
    read: true,
    envelopeId: 'env_789',
    amountUsd: 50.00
  }
];

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    summary: {
      totalUnread: 0,
      pendingEnvelopes: 0,
      recentNotifications: []
    },
    isLoading: false,
    error: null
  });

  const fetchNotifications = useCallback(async () => {
    const walletAddress = localStorage.getItem('wallet_address');
    if (!walletAddress) {
      setState(prev => ({
        ...prev,
        notifications: [],
        summary: {
          totalUnread: 0,
          pendingEnvelopes: 0,
          recentNotifications: []
        }
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Call the real API endpoint
      const apiBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${apiBaseUrl}/api/notifications/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const apiResponse = await response.json();
      
      if (!apiResponse.ok) {
        throw new Error(apiResponse.error || 'Failed to fetch notifications');
      }
      
      const apiSummary = apiResponse.data as NotificationSummary;
      const notifications = apiSummary.recentNotifications;

      const summary: NotificationSummary = {
        totalUnread: apiSummary.totalUnread,
        pendingEnvelopes: apiSummary.pendingEnvelopes,
        recentNotifications: apiSummary.recentNotifications
      };

      setState(prev => ({
        ...prev,
        notifications,
        summary,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load notifications'
      }));
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    }));

    // Update summary
    setState(prev => {
      const unreadNotifications = prev.notifications.filter(n => !n.read);
      const pendingEnvelopes = prev.notifications.filter(n => 
        n.type === 'envelope_received' && !n.read
      ).length;

      return {
        ...prev,
        summary: {
          ...prev.summary,
          totalUnread: unreadNotifications.length,
          pendingEnvelopes
        }
      };
    });

    try {
      const walletAddress = localStorage.getItem('wallet_address');
      if (walletAddress) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        await fetch(`${apiBaseUrl}/api/notifications/${notificationId}/read`, { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress }),
        });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      summary: {
        ...prev.summary,
        totalUnread: 0,
        pendingEnvelopes: 0
      }
    }));

    try {
      const walletAddress = localStorage.getItem('wallet_address');
      if (walletAddress) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        await fetch(`${apiBaseUrl}/api/notifications/mark-all-read`, { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress }),
        });
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Fetch notifications on mount and when wallet changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return {
    notifications: state.notifications,
    summary: state.summary,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}
