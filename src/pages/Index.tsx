
import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { CartProvider } from '@/contexts/CartContext';
import ErrorBoundary from '@/components/snapup/ErrorBoundary';

const Index: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="SnapUp failed to load" onReset={() => window.location.reload()}>
      <AuthProvider>
        <ChatProvider>
          <CartProvider>
            <AppProvider>
              <AppLayout />
            </AppProvider>
          </CartProvider>
        </ChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default Index;

