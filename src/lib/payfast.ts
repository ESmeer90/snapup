// ============ PAYMENT SERVICE PLACEHOLDER ============
// Payment gateway has been removed during cleanup phase.
// This module provides pricing utility functions used across the app.
// A South African payment gateway (e.g., Yoco, Ozow, Peach Payments) will be integrated later.
//
// When ready to integrate a new gateway:
// 1. Create a new file: src/lib/payment-gateway.ts
// 2. Implement: initializePayment(), verifyPayment(), getPaymentStatus()
// 3. Add gateway credentials as Supabase Edge Function secrets
// 4. Create edge functions for server-side payment processing

export const SERVICE_FEE_RATE = 0.025; // 2.5%

export function calculateTotal(price: number) {
  const serviceFee = Math.round(price * SERVICE_FEE_RATE);
  const total = price + serviceFee;
  return { serviceFee, total };
}

// Placeholder interface for future payment gateway integration
export interface PaymentGatewayConfig {
  provider: 'yoco' | 'ozow' | 'peach' | 'none';
  mode: 'sandbox' | 'live';
  currency: 'ZAR';
}

// Current config - no active payment gateway
export const PAYMENT_GATEWAY_CONFIG: PaymentGatewayConfig = {
  provider: 'none',
  mode: 'sandbox',
  currency: 'ZAR',
};
