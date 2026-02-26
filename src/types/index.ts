export type UserRole = 'user' | 'admin';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  province: SAProvince;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  show_email?: boolean;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch_code?: string;
  bank_account_holder?: string;
  payment_sandbox?: boolean;

  role?: UserRole;
  verified_seller?: boolean;
  verification_status?: VerificationStatus;
  verification_document_url?: string;
  status?: 'active' | 'suspended' | 'banned';
  created_at: string;
  updated_at: string;
}




export interface PublicProfile {
  id: string;
  full_name: string;
  province: SAProvince;
  bio?: string;
  avatar_url?: string;
  show_email: boolean;
  email?: string | null;
  created_at: string;
  listing_count: number;
  sold_count: number;
  avg_rating: number;
  total_ratings: number;
}


export type SAProvince =
  | 'Eastern Cape'
  | 'Free State'
  | 'Gauteng'
  | 'KwaZulu-Natal'
  | 'Limpopo'
  | 'Mpumalanga'
  | 'Northern Cape'
  | 'North West'
  | 'Western Cape';

export const SA_PROVINCES: SAProvince[] = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ListingStatus = 'active' | 'sold' | 'archived';

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  category_id: string | null;
  condition: ListingCondition;
  location: string;
  province: SAProvince;
  images: string[];
  status: ListingStatus;
  view_count: number;
  is_negotiable: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  seller_name?: string;
  seller_avatar?: string;
  category_name?: string;
  category_slug?: string;
  category_icon?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}
export interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  // Joined fields
  sender_name?: string;
  sender_avatar?: string;
  receiver_name?: string;
  receiver_avatar?: string;
  listing_title?: string;
  listing_image?: string;
  listing_price?: number;
}



export interface Conversation {
  conversation_id: string;
  listing_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  other_user_avg_rating?: number;
  other_user_total_ratings?: number;
  listing_title: string;
  listing_image?: string;
  listing_price?: number;
  last_message: string;
  last_message_at: string;
  last_message_sender_id: string;
  unread_count: number;
  total_messages: number;
}



export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type EscrowStatus = 'holding' | 'released' | 'disputed' | 'refunded' | 'cancelled';

export interface EscrowHold {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  amount: number;
  commission_amount: number;
  net_seller_amount: number;
  status: EscrowStatus;
  payment_confirmed_at: string | null;
  delivery_confirmed_at: string | null;
  release_at: string | null;
  released_at: string | null;
  release_conditions: {
    delivery_confirmed?: boolean;
    dispute_window_passed?: boolean;
    no_active_dispute?: boolean;
    auto_released?: boolean;
    batch_released?: boolean;
    admin_released?: boolean;
    admin_refunded?: boolean;
    admin_split?: boolean;
    refund_amount?: number;
    seller_amount?: number;
  };
  created_at: string;
  updated_at: string;
  // Enriched fields from edge function
  listing_title?: string;
  listing_image?: string | null;
  order_status?: string;
  buyer_name?: string;
}

// ============ ADMIN ESCROW TYPES ============

export interface AdminEscrowStats {
  active_count: number;
  active_amount: number;
  releasing_24h_count: number;
  releasing_24h_amount: number;
  disputed_count: number;
  disputed_amount: number;
  recently_released: {
    id: string;
    order_id: string;
    seller_id: string;
    amount: number;
    net_seller_amount: number;
    commission_amount: number;
    released_at: string;
    release_conditions: Record<string, any>;
  }[];
}

export interface SellerEscrowData {
  summary: {
    total_in_escrow: number;
    total_holding: number;
    total_disputed: number;
    total_released: number;
  };
  holds: (EscrowHold & {
    listing_title?: string;
    listing_image?: string | null;
    order_status?: string;
    buyer_name?: string;
  })[];
  payout_history: {
    id: string;
    order_id: string;
    amount: number;
    commission_amount: number;
    net_seller_amount: number;
    released_at: string;
    release_conditions: Record<string, any>;
    listing_title: string;
    created_at: string;
  }[];
}

export type EscrowResolutionAction = 'release_to_seller' | 'refund_to_buyer' | 'split';


export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  amount: number;
  service_fee: number;
  total: number;
  payment_method: string;
  payment_id: string | null;

  tracking_number?: string | null;
  carrier?: string | null;
  tracking_status?: string | null;
  courier_service?: string | null;
  label_url?: string | null;
  shipment_id?: string | null;
  address_consent?: boolean;
  escrow_status?: EscrowStatus | null;
  escrow_release_at?: string | null;
  delivery_confirmed_at?: string | null;
  commission_amount?: number;
  net_seller_amount?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  listing_title?: string;
  listing_image?: string;
  listing_price?: number;
  seller_name?: string;
  buyer_name?: string;
  // Tracking history (populated separately)
  tracking_history?: OrderTracking[];
  // Escrow hold (populated separately)
  escrow_hold?: EscrowHold | null;
}



// ============ ORDER TRACKING TYPES ============

export type TrackingStatus = 'Pending' | 'Processing' | 'Shipped' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned';

export const TRACKING_STATUSES: TrackingStatus[] = [
  'Pending',
  'Processing',
  'Shipped',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
];

export const TRACKING_STATUS_CONFIG: Record<TrackingStatus, { color: string; bgColor: string; description: string }> = {
  'Pending': { color: 'text-amber-700', bgColor: 'bg-amber-100', description: 'Order received, awaiting processing' },
  'Processing': { color: 'text-blue-700', bgColor: 'bg-blue-100', description: 'Seller is preparing your order' },
  'Shipped': { color: 'text-indigo-700', bgColor: 'bg-indigo-100', description: 'Package has been shipped' },
  'In Transit': { color: 'text-purple-700', bgColor: 'bg-purple-100', description: 'Package is on its way' },
  'Out for Delivery': { color: 'text-cyan-700', bgColor: 'bg-cyan-100', description: 'Package is out for delivery' },
  'Delivered': { color: 'text-emerald-700', bgColor: 'bg-emerald-100', description: 'Package has been delivered' },
  'Cancelled': { color: 'text-red-700', bgColor: 'bg-red-100', description: 'Order has been cancelled' },
  'Returned': { color: 'text-orange-700', bgColor: 'bg-orange-100', description: 'Package is being returned' },
};

export const SA_CARRIERS = [
  'ShipLogic',
  'ShipLogic Economy',
  'ShipLogic Standard',
  'ShipLogic Express',
  'The Courier Guy',
  'RAM Hand-to-Hand',
  'Fastway Couriers',
  'Aramex',
  'PostNet',
  'SA Post Office',
  'Collect (In Person)',
  'Other',
];


export interface OrderTracking {
  id: string;
  order_id: string;
  status: TrackingStatus;
  tracking_number: string | null;
  carrier: string | null;
  notes: string | null;
  photo_url: string | null;
  label_url?: string | null;
  shipment_id?: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============ COURIER / SHIPPING TYPES ============

export const COURIER_SERVICES = [
  { id: 'The Courier Guy', name: 'The Courier Guy', logo: 'TCG' },
  { id: 'Fastway', name: 'Fastway Couriers', logo: 'FWY' },
  { id: 'Aramex', name: 'Aramex', logo: 'ARX' },
] as const;

export type CourierServiceId = typeof COURIER_SERVICES[number]['id'];

export interface ShipmentData {
  tracking_number: string;
  label_url: string;
  shipment_id: string;
  courier_service: string;
  api_used: boolean;
  label_data: {
    order_id: string;
    tracking_number: string;
    courier: string;
    seller_name: string;
    seller_province: string;
    item_description: string;
    item_location: string;
    created_at: string;
  };
}

export interface SellerOrder {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  amount: number;
  service_fee: number;
  total: number;
  payment_method: string;
  payment_id: string | null;

  tracking_number?: string | null;
  carrier?: string | null;
  tracking_status?: string | null;
  courier_service?: string | null;
  label_url?: string | null;
  shipment_id?: string | null;
  created_at: string;
  updated_at: string;
  listing_title?: string;
  listing_image?: string;
  listing_price?: number;
  buyer_name_masked?: string;
  buyer_province_masked?: string;
}


// ============ SELLER DASHBOARD TYPES ============

export interface SellerAnalytics {
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  total_views: number;
  total_orders: number;
  total_revenue: number;
  total_fees: number;
  pending_orders: number;
  completed_orders: number;
  avg_rating: number;
  total_ratings: number;
}

export interface SellerRating {
  id: string;
  seller_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
  buyer_name?: string;
  buyer_name_masked?: string;
  listing_title?: string;
}



// ============ PAYOUT TYPES ============

export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

export const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  approved: { label: 'Approved', color: 'text-blue-700', bg: 'bg-blue-100' },
  processing: { label: 'Processing', color: 'text-purple-700', bg: 'bg-purple-100' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
};

export interface Payout {
  id: string;
  seller_id: string;
  amount: number;
  status: PayoutStatus;
  payout_method: string;
  bank_name: string | null;
  account_number_masked: string | null;
  branch_code: string | null;
  reference: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerEarnings {
  total_revenue: number;
  total_fees: number;
  net_earnings: number;
  completed_payouts: number;
  pending_payouts: number;
  available_balance: number;
}

// SA Banks list
export const SA_BANKS = [
  'ABSA Bank',
  'African Bank',
  'Bidvest Bank',
  'Capitec Bank',
  'Discovery Bank',
  'First National Bank (FNB)',
  'Investec',
  'Nedbank',
  'Standard Bank',
  'TymeBank',
  'Other',
];

// ============ DISPUTE TYPES ============

export type DisputeReason = 'item_not_received' | 'item_not_as_described' | 'damaged' | 'wrong_item' | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_refund' | 'resolved_no_refund' | 'resolved_partial_refund' | 'closed';

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  item_not_received: 'Item Not Received',
  item_not_as_described: 'Item Not as Described',
  damaged: 'Item Damaged',
  wrong_item: 'Wrong Item Received',
  other: 'Other Issue',
};

export const DISPUTE_STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; bg: string; icon: string }> = {
  open: { label: 'Open', color: 'text-amber-700', bg: 'bg-amber-100', icon: 'AlertTriangle' },
  under_review: { label: 'Under Review', color: 'text-blue-700', bg: 'bg-blue-100', icon: 'Eye' },
  resolved_refund: { label: 'Refunded', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: 'CheckCircle2' },
  resolved_no_refund: { label: 'Resolved (No Refund)', color: 'text-gray-700', bg: 'bg-gray-100', icon: 'XCircle' },
  resolved_partial_refund: { label: 'Partial Refund', color: 'text-purple-700', bg: 'bg-purple-100', icon: 'DollarSign' },
  closed: { label: 'Closed', color: 'text-gray-500', bg: 'bg-gray-100', icon: 'Lock' },
};

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: DisputeReason;
  description: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution: string | null;
  resolution_amount: number | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  order_listing_title?: string;
  order_listing_image?: string;
  order_amount?: number;
  order_total?: number;
  order_status?: string;
  buyer_name?: string;
  seller_name?: string;
}

// ============ MAP / GEOLOCATION ============

export const SA_PROVINCE_COORDS: Record<SAProvince, { lat: number; lng: number }> = {
  'Eastern Cape': { lat: -32.2968, lng: 26.4194 },
  'Free State': { lat: -29.0852, lng: 26.1596 },
  'Gauteng': { lat: -26.2708, lng: 28.1123 },
  'KwaZulu-Natal': { lat: -29.6006, lng: 30.3794 },
  'Limpopo': { lat: -23.4013, lng: 29.4179 },
  'Mpumalanga': { lat: -25.5653, lng: 30.5279 },
  'Northern Cape': { lat: -29.0467, lng: 21.8569 },
  'North West': { lat: -26.6639, lng: 25.2838 },
  'Western Cape': { lat: -33.2278, lng: 21.8569 },
};

export const SA_CENTER = { lat: -28.4793, lng: 24.6727 };


// ============ ADMIN TYPES ============

export interface AdminStats {
  total_users: number;
  active_listings: number;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  open_disputes: number;
  pending_payouts: number;
  pending_verifications: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  province: SAProvince;
  role: UserRole;
  status: 'active' | 'suspended' | 'banned';
  verified_seller: boolean;
  verification_status: VerificationStatus;
  created_at: string;
  listing_count?: number;
  order_count?: number;
}

export interface AdminPayout {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_email: string;
  amount: number;
  status: PayoutStatus;
  bank_name: string | null;
  account_number_masked: string | null;
  reference: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface AdminDispute extends Dispute {
  admin_notes?: string;
}

// ============ BUYER PROTECTION ============

// ============ PROMO TYPES ============

export type PromoType = 'first_sales_free' | 'percent_off' | 'flat_off';

export interface Promo {
  id: string;
  name: string;
  type: PromoType;
  discount_percent: number;
  discount_flat: number;
  max_sales: number | null;
  max_amount: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  description: string;
  target_provinces: string[];
  created_at: string;
  updated_at: string;
  // Computed fields from admin stats
  usage_count?: number;
  commission_forgone?: number;
  unique_sellers?: number;
}

export interface SellerPromoStatus {
  has_active_promo: boolean;
  delivered_count: number;
  promo: {
    id: string;
    name: string;
    type: PromoType;
    description: string;
    max_sales: number | null;
    start_date: string;
    end_date: string | null;
    target_provinces: string[];
  } | null;
  usage_count: number;
  remaining_free_sales: number;
  commission_saved: number;
  is_eligible: boolean;
}

export interface PromoImpactStats {
  total_promos: number;
  active_promos: number;
  total_promo_usage: number;
  total_commission_forgone: number;
  unique_sellers_using_promos: number;
}

// ============ BUYER PROTECTION ============

export const BUYER_PROTECTION_LIMIT = 5000; // R5,000 max coverage
export const BUYER_PROTECTION_ELIGIBLE_STATUSES: OrderStatus[] = ['paid', 'shipped', 'delivered'];

// ============ OFFER TYPES ============

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'expired' | 'withdrawn';

export const OFFER_STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100', icon: 'Clock' },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: 'CheckCircle2' },
  declined: { label: 'Declined', color: 'text-red-700', bg: 'bg-red-100', icon: 'XCircle' },
  countered: { label: 'Countered', color: 'text-blue-700', bg: 'bg-blue-100', icon: 'ArrowLeftRight' },
  expired: { label: 'Expired', color: 'text-gray-500', bg: 'bg-gray-100', icon: 'Clock' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bg: 'bg-gray-100', icon: 'Undo2' },
};

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OfferStatus;
  counter_amount: number | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  buyer_name?: string;
  seller_name?: string;
  listing_title?: string;
  listing_price?: number;
}
