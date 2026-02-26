// ============ COMMISSION CALCULATION ============
// Dynamic commission tiers loaded from DB (admin-configurable)
// Fallback to hardcoded defaults if DB unavailable

import { supabase } from '@/lib/supabase';

export interface CommissionTiers {
  low_threshold: number;
  low_rate: number;
  mid_threshold: number;
  mid_rate: number;
  high_rate: number;
}

export interface CommissionBreakdown {
  salePrice: number;
  commissionRate: number;
  commissionAmount: number;
  netSellerAmount: number;
  tier: 'standard' | 'mid' | 'premium';
  tierLabel: string;
}

// Default tiers (used as fallback)
const DEFAULT_TIERS: CommissionTiers = {
  low_threshold: 500,
  low_rate: 0.12,
  mid_threshold: 2000,
  mid_rate: 0.10,
  high_rate: 0.05,
};

// Cache for commission tiers (refreshed every 5 minutes)
let cachedTiers: CommissionTiers | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchCommissionTiers(): Promise<CommissionTiers> {
  const now = Date.now();
  if (cachedTiers && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedTiers;
  }

  try {
    const { data, error } = await supabase
      .from('commission_tiers')
      .select('low_threshold, low_rate, mid_threshold, mid_rate, high_rate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      cachedTiers = {
        low_threshold: Number(data.low_threshold) || DEFAULT_TIERS.low_threshold,
        low_rate: Number(data.low_rate) || DEFAULT_TIERS.low_rate,
        mid_threshold: Number(data.mid_threshold) || DEFAULT_TIERS.mid_threshold,
        mid_rate: Number(data.mid_rate) || DEFAULT_TIERS.mid_rate,
        high_rate: Number(data.high_rate) || DEFAULT_TIERS.high_rate,
      };
      cacheTimestamp = now;
      return cachedTiers;
    }
  } catch (err) {
    console.warn('Failed to fetch commission tiers from DB:', err);
  }

  return DEFAULT_TIERS;
}

// Force refresh cache (call after admin updates tiers)
export function invalidateCommissionCache() {
  cachedTiers = null;
  cacheTimestamp = 0;
}

// Synchronous version using cached or default tiers
function getTiers(): CommissionTiers {
  return cachedTiers || DEFAULT_TIERS;
}

export function getCommissionRate(price: number): number {
  const tiers = getTiers();
  if (price < tiers.low_threshold) return tiers.low_rate;
  if (price <= tiers.mid_threshold) return tiers.mid_rate;
  return tiers.high_rate;
}

export function getCommissionTier(price: number): { tier: 'standard' | 'mid' | 'premium'; label: string } {
  const tiers = getTiers();
  if (price < tiers.low_threshold) return { tier: 'standard', label: `Standard (< R${tiers.low_threshold})` };
  if (price <= tiers.mid_threshold) return { tier: 'mid', label: `Mid-range (R${tiers.low_threshold}–R${tiers.mid_threshold.toLocaleString()})` };
  return { tier: 'premium', label: `Premium (> R${tiers.mid_threshold.toLocaleString()})` };
}

export function calculateCommission(salePrice: number, promoActive: boolean = false): CommissionBreakdown {
  const rate = promoActive ? 0 : getCommissionRate(salePrice);
  const commissionAmount = Math.round(salePrice * rate * 100) / 100;
  const netSellerAmount = Math.round((salePrice - commissionAmount) * 100) / 100;
  const { tier, label } = getCommissionTier(salePrice);

  return {
    salePrice,
    commissionRate: rate,
    commissionAmount,
    netSellerAmount,
    tier,
    tierLabel: label,
  };
}

export function formatCommissionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

// Dynamic commission tiers for display (uses cached values)
export function getCommissionTiersDisplay() {
  const tiers = getTiers();
  return [
    { min: 0, max: tiers.low_threshold - 1, rate: tiers.low_rate, label: `Under R${tiers.low_threshold}`, rateLabel: `${Math.round(tiers.low_rate * 100)}%` },
    { min: tiers.low_threshold, max: tiers.mid_threshold, rate: tiers.mid_rate, label: `R${tiers.low_threshold} – R${tiers.mid_threshold.toLocaleString()}`, rateLabel: `${Math.round(tiers.mid_rate * 100)}%` },
    { min: tiers.mid_threshold + 1, max: Infinity, rate: tiers.high_rate, label: `Over R${tiers.mid_threshold.toLocaleString()}`, rateLabel: `${Math.round(tiers.high_rate * 100)}%` },
  ];
}

// Legacy export for backward compatibility
export const COMMISSION_TIERS = [
  { min: 0, max: 499, rate: 0.12, label: 'Under R500', rateLabel: '12%' },
  { min: 500, max: 2000, rate: 0.10, label: 'R500 – R2,000', rateLabel: '10%' },
  { min: 2001, max: Infinity, rate: 0.05, label: 'Over R2,000', rateLabel: '5%' },
];

// Placeholder for future payment gateway split payment configuration
// When a SA payment gateway is integrated, implement split payment logic here.
// export function buildSplitPaymentConfig(params: { ... }) { ... }


// Update commission tiers in DB (admin only)
export async function updateCommissionTiers(tiers: Partial<CommissionTiers>): Promise<void> {
  // First get the current row id
  const { data: current } = await supabase
    .from('commission_tiers')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!current) {
    // Insert new row
    const { error } = await supabase.from('commission_tiers').insert({
      low_threshold: tiers.low_threshold,
      low_rate: tiers.low_rate,
      mid_threshold: tiers.mid_threshold,
      mid_rate: tiers.mid_rate,
      high_rate: tiers.high_rate,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('commission_tiers')
      .update({
        low_threshold: tiers.low_threshold,
        low_rate: tiers.low_rate,
        mid_threshold: tiers.mid_threshold,
        mid_rate: tiers.mid_rate,
        high_rate: tiers.high_rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id);
    if (error) throw error;
  }

  invalidateCommissionCache();
}
