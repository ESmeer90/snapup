import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getUnreadCount } from '@/lib/api';

interface ChatContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnread: (count?: number) => void;
}

const ChatContext = createContext<ChatContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnread: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await getUnreadCount(user.id);
      setUnreadCount(count);
    } catch {
      // Silently fail
    }
  }, [user]);

  const decrementUnread = useCallback((count: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  // Initial load
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-unread-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as any;
        // If this message is for the current user, increment unread
        if (newMsg.receiver_id === user.id && !newMsg.is_read) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const updated = payload.new as any;
        const old = payload.old as any;
        // If a message was marked as read
        if (updated.receiver_id === user.id && updated.is_read && !old.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Poll every 60 seconds as a fallback
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  return (
    <ChatContext.Provider value={{ unreadCount, refreshUnreadCount, decrementUnread }}>
      {children}
    </ChatContext.Provider>
  );
};
