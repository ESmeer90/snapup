/**
 * South African Shipping via ShipLogic
 * ShipLogic is the exclusive courier integration for SnapUp.
 * Sandbox: https://sandbox.shiplogic.com
 * Live: https://api.shiplogic.com
 */

import type { SAProvince } from '@/types';

export type ShippingTier = 'same' | 'neighbor' | 'cross';

export interface CourierRate {
  id: string;
  name: string;
  logo: string;
  rates: Record<ShippingTier, number>;
  estimatedDays: Record<ShippingTier, string>;
  description: string;
}

// Province adjacency map
const PROVINCE_NEIGHBORS: Record<SAProvince, SAProvince[]> = {
  'Gauteng': ['North West', 'Limpopo', 'Mpumalanga', 'Free State'],
  'North West': ['Gauteng', 'Limpopo', 'Free State', 'Northern Cape'],
  'Limpopo': ['Gauteng', 'North West', 'Mpumalanga'],
  'Mpumalanga': ['Gauteng', 'Limpopo', 'KwaZulu-Natal', 'Free State'],
  'KwaZulu-Natal': ['Mpumalanga', 'Free State', 'Eastern Cape'],
  'Free State': ['Gauteng', 'North West', 'Mpumalanga', 'KwaZulu-Natal', 'Eastern Cape', 'Northern Cape'],
  'Eastern Cape': ['KwaZulu-Natal', 'Free State', 'Northern Cape', 'Western Cape'],
  'Northern Cape': ['North West', 'Free State', 'Eastern Cape', 'Western Cape'],
  'Western Cape': ['Eastern Cape', 'Northern Cape'],
};

// ShipLogic service levels with estimated rates
export const SHIPLOGIC_SERVICES: CourierRate[] = [
  {
    id: 'shiplogic-economy',
    name: 'ShipLogic Economy',
    logo: 'SL',
    rates: { same: 79, neighbor: 99, cross: 149 },
    estimatedDays: { same: '3-5 days', neighbor: '4-6 days', cross: '5-7 days' },
    description: 'Budget-friendly delivery via ShipLogic. Best for non-urgent parcels.',
  },
  {
    id: 'shiplogic-standard',
    name: 'ShipLogic Standard',
    logo: 'SL',
    rates: { same: 99, neighbor: 149, cross: 199 },
    estimatedDays: { same: '2-3 days', neighbor: '3-4 days', cross: '4-5 days' },
    description: 'Reliable standard delivery with real-time tracking via ShipLogic.',
  },
  {
    id: 'shiplogic-express',
    name: 'ShipLogic Express',
    logo: 'SL',
    rates: { same: 149, neighbor: 199, cross: 279 },
    estimatedDays: { same: '1-2 days', neighbor: '2-3 days', cross: '2-4 days' },
    description: 'Fast express delivery for urgent shipments via ShipLogic.',
  },
];

// Legacy alias
export const COURIER_RATES = SHIPLOGIC_SERVICES;

export function getShippingTier(fromProvince: SAProvince, toProvince: SAProvince): ShippingTier {
  if (fromProvince === toProvince) return 'same';
  const neighbors = PROVINCE_NEIGHBORS[fromProvince] || [];
  if (neighbors.includes(toProvince)) return 'neighbor';
  return 'cross';
}

export function getShippingTierLabel(tier: ShippingTier): string {
  switch (tier) {
    case 'same': return 'Same Province';
    case 'neighbor': return 'Neighboring Province';
    case 'cross': return 'Cross-Country';
  }
}

export function calculateShippingCost(
  courierId: string,
  fromProvince: SAProvince,
  toProvince: SAProvince
): { cost: number; tier: ShippingTier; estimatedDays: string; courier: CourierRate } | null {
  const courier = SHIPLOGIC_SERVICES.find(c => c.id === courierId);
  if (!courier) return null;
  const tier = getShippingTier(fromProvince, toProvince);
  return { cost: courier.rates[tier], tier, estimatedDays: courier.estimatedDays[tier], courier };
}

export function getAllShippingQuotes(
  fromProvince: SAProvince,
  toProvince: SAProvince
): Array<{ cost: number; tier: ShippingTier; estimatedDays: string; courier: CourierRate }> {
  const tier = getShippingTier(fromProvince, toProvince);
  return SHIPLOGIC_SERVICES.map(courier => ({
    cost: courier.rates[tier],
    tier,
    estimatedDays: courier.estimatedDays[tier],
    courier,
  })).sort((a, b) => a.cost - b.cost);
}

export function getCheapestShipping(
  fromProvince: SAProvince,
  toProvince: SAProvince
): { cost: number; tier: ShippingTier; estimatedDays: string; courier: CourierRate } {
  return getAllShippingQuotes(fromProvince, toProvince)[0];
}
