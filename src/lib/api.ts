import { supabase } from '@/lib/supabase';
import type { Listing, Category, Profile, PublicProfile, SAProvince, Order, OrderStatus, SellerAnalytics, SellerRating, SellerOrder, Message, Conversation, OrderTracking, TrackingStatus, Payout, SellerEarnings, Dispute, DisputeReason, ShipmentData, Promo, SellerPromoStatus, PromoImpactStats, EscrowHold, AdminEscrowStats, SellerEscrowData, EscrowResolutionAction, Offer, OfferStatus } from '@/types';












// ============ AUTH ============
export async function signUp(email: string, password: string, fullName: string, province: SAProvince) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, province } },
  });
  if (error) throw error;
  if (data.user) {
    await supabase.functions.invoke('create-profile', {
      body: { full_name: fullName, province },
    });
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ============ PROFILES ============

// Ensure profile exists - calls edge function as fallback to create if missing
export async function ensureProfile(): Promise<Profile | null> {
  try {
    // First try the RPC function
    const { data, error } = await supabase.rpc('ensure_profile_exists', {
      p_full_name: '',
      p_province: 'Northern Cape',
    });
    if (!error && data) return data as Profile;
  } catch {}

  // Fallback: call edge function
  try {
    const { data, error } = await supabase.functions.invoke('create-profile', {
      body: {},
    });
    if (!error && data?.profile) return data.profile as Profile;
  } catch {}

  return null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) {
    // If fetching own profile and it's missing, try to ensure it exists
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id === userId) {
      const ensured = await ensureProfile();
      if (ensured) return ensured;
    }
    return null;
  }
  return data;
}


export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, province, bio, avatar_url, show_email, email, created_at')
    .eq('id', userId)
    .single();
  if (profileError || !profileData) return null;

  // Get listing counts
  const { count: listingCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  const { count: soldCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sold');

  // Get seller ratings
  const { data: ratingsData } = await supabase
    .from('seller_ratings')
    .select('rating')
    .eq('seller_id', userId);

  const totalRatings = ratingsData?.length || 0;
  const avgRating = totalRatings > 0
    ? Math.round((ratingsData!.reduce((sum: number, r: any) => sum + r.rating, 0) / totalRatings) * 10) / 10
    : 0;

  return {
    id: profileData.id,
    full_name: profileData.full_name,
    province: profileData.province,
    bio: profileData.bio,
    avatar_url: profileData.avatar_url,
    show_email: profileData.show_email || false,
    email: profileData.show_email ? profileData.email : null,
    created_at: profileData.created_at,
    listing_count: listingCount || 0,
    sold_count: soldCount || 0,
    avg_rating: avgRating,
    total_ratings: totalRatings,
  };
}

export async function getUserActiveListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, categories!listings_category_id_fkey(name, slug, icon)`)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    category_name: item.categories?.name,
    category_slug: item.categories?.slug,
    category_icon: item.categories?.icon,
  }));
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}


// ============ CATEGORIES ============
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

// ============ LISTINGS ============
export async function getListings(params?: {
  category?: string; province?: string; search?: string;
  minPrice?: number; maxPrice?: number; condition?: string;
  sortBy?: string; limit?: number; offset?: number;
}): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select(`*, profiles!listings_user_id_fkey(full_name, avatar_url, province), categories!listings_category_id_fkey(name, slug, icon)`)
    .eq('status', 'active');

  if (params?.category) query = query.eq('category_id', params.category);
  if (params?.province) query = query.eq('province', params.province);
  if (params?.search) query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  if (params?.minPrice !== undefined) query = query.gte('price', params.minPrice);
  if (params?.maxPrice !== undefined) query = query.lte('price', params.maxPrice);
  if (params?.condition) query = query.eq('condition', params.condition);

  if (params?.sortBy === 'price_asc') query = query.order('price', { ascending: true });
  else if (params?.sortBy === 'price_desc') query = query.order('price', { ascending: false });
  else if (params?.sortBy === 'most_viewed') query = query.order('view_count', { ascending: false });
  else query = query.order('created_at', { ascending: false }); // 'newest' default



  if (params?.limit) query = query.limit(params.limit);
  if (params?.offset) query = query.range(params.offset, params.offset + (params?.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    seller_name: item.profiles?.full_name,
    seller_avatar: item.profiles?.avatar_url,
    category_name: item.categories?.name,
    category_slug: item.categories?.slug,
    category_icon: item.categories?.icon,
    profiles: undefined, categories: undefined,
  }));
}

export async function getListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, profiles!listings_user_id_fkey(full_name, avatar_url, province, phone), categories!listings_category_id_fkey(name, slug, icon)`)
    .eq('id', id).single();
  if (error) return null;
  return { ...data, seller_name: (data as any).profiles?.full_name, seller_avatar: (data as any).profiles?.avatar_url, category_name: (data as any).categories?.name, category_slug: (data as any).categories?.slug, category_icon: (data as any).categories?.icon };
}

export async function createListing(listing: {
  title: string; description: string; price: number; category_id: string | null;
  condition: string; location: string; province: string; images: string[];
  is_negotiable: boolean; user_id: string;
}) {
  const { data, error } = await supabase.from('listings').insert(listing).select().single();
  if (error) throw error;
  return data;
}

export async function updateListing(id: string, updates: Partial<Listing>) {
  const { data, error } = await supabase.from('listings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteListing(id: string) {
  const { error } = await supabase.from('listings').delete().eq('id', id);
  if (error) throw error;
}

export async function getUserListings(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, categories!listings_category_id_fkey(name, slug, icon)`)
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((item: any) => ({ ...item, category_name: item.categories?.name, category_slug: item.categories?.slug, category_icon: item.categories?.icon }));
}

export async function incrementViewCount(listingId: string) {
  const { error } = await supabase.rpc('increment_view_count', { p_listing_id: listingId });
  if (error) console.error('Failed to increment view count:', error);
}

// ============ FAVORITES ============
export async function getFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((f: any) => f.listing_id);
}

export async function toggleFavorite(userId: string, listingId: string, isFavorited: boolean) {
  if (isFavorited) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId });
    if (error) throw error;
  }
}
// ============ MESSAGES & CHAT ============
export async function sendMessage(listingId: string, senderId: string, receiverId: string, content: string, imageUrl?: string | null): Promise<Message> {
  const insertData: any = { listing_id: listingId, sender_id: senderId, receiver_id: receiverId, content };
  if (imageUrl) insertData.image_url = imageUrl;
  const { data, error } = await supabase.from('messages').insert(insertData).select().single();
  if (error) throw error;
  return data;
}

export async function getMessages(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, listings(title, images, price), sender:profiles!messages_sender_id_fkey(full_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)`)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getConversationMessages(listingId: string, userId: string, otherUserId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url), listings(title, images, price)`)
    .eq('listing_id', listingId)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    sender_name: item.sender?.full_name,
    sender_avatar: item.sender?.avatar_url,
    receiver_name: item.receiver?.full_name,
    receiver_avatar: item.receiver?.avatar_url,
    listing_title: item.listings?.title,
    listing_image: item.listings?.images?.[0],
    listing_price: item.listings?.price,
  }));
}

export async function markMessagesAsDelivered(userId: string, listingId: string, senderId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_messages_delivered', {
    p_user_id: userId,
    p_listing_id: listingId,
    p_sender_id: senderId,
  });
  if (error) {
    // Fallback: direct update
    await supabase
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .eq('listing_id', listingId)
      .eq('sender_id', senderId)
      .is('delivered_at', null);
  }
}

export async function markMessagesAsRead(userId: string, listingId: string, senderId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_messages_read', {
    p_user_id: userId,
    p_listing_id: listingId,
    p_sender_id: senderId,
  });
  if (error) {
    // Fallback: direct update
    const now = new Date().toISOString();
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: now, delivered_at: now })
      .eq('receiver_id', userId)
      .eq('listing_id', listingId)
      .eq('sender_id', senderId)
      .eq('is_read', false);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_unread_message_count', { p_user_id: userId });
    if (error) throw error;
    return Number(data) || 0;
  } catch {
    // Fallback: count directly
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (error) return 0;
    return count || 0;
  }
}


export function buildConversations(messages: any[], userId: string): Conversation[] {
  const convMap = new Map<string, Conversation>();
  
  for (const msg of messages) {
    const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    const convId = `${msg.listing_id}_${otherUserId}`;
    
    const existing = convMap.get(convId);
    const isUnread = msg.receiver_id === userId && !msg.is_read;
    
    // Determine last message preview text
    const lastMessagePreview = msg.image_url && !msg.content
      ? '📷 Photo'
      : msg.image_url && msg.content
        ? `📷 ${msg.content}`
        : msg.content;
    
    if (!existing) {
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      convMap.set(convId, {
        conversation_id: convId,
        listing_id: msg.listing_id,
        other_user_id: otherUserId,
        other_user_name: otherUser?.full_name || 'User',
        other_user_avatar: otherUser?.avatar_url,
        listing_title: msg.listings?.title || 'Listing',
        listing_image: msg.listings?.images?.[0],
        listing_price: msg.listings?.price,
        last_message: lastMessagePreview,
        last_message_at: msg.created_at,
        last_message_sender_id: msg.sender_id,
        unread_count: isUnread ? 1 : 0,
        total_messages: 1,
      });
    } else {
      existing.total_messages += 1;
      if (isUnread) existing.unread_count += 1;
      // Messages are ordered DESC, so first one is already the latest
    }
  }
  
  return Array.from(convMap.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

// ============ BATCH USER RATINGS ============


export interface UserRatingInfo {
  avg_rating: number;
  total_ratings: number;
}

/**
 * Batch-fetch average ratings for multiple user IDs (as sellers).
 * Returns a map of userId -> { avg_rating, total_ratings }.
 */
export async function fetchUserRatingsBatch(userIds: string[]): Promise<Record<string, UserRatingInfo>> {
  const result: Record<string, UserRatingInfo> = {};
  if (!userIds.length) return result;

  // Deduplicate
  const uniqueIds = [...new Set(userIds)];

  try {
    const { data, error } = await supabase
      .from('seller_ratings')
      .select('seller_id, rating')
      .in('seller_id', uniqueIds);

    if (error) {
      console.warn('fetchUserRatingsBatch error:', error.message);
      return result;
    }

    // Aggregate ratings per seller
    const ratingMap: Record<string, number[]> = {};
    for (const row of (data || [])) {
      if (!ratingMap[row.seller_id]) ratingMap[row.seller_id] = [];
      ratingMap[row.seller_id].push(row.rating);
    }

    for (const [sellerId, ratings] of Object.entries(ratingMap)) {
      const total = ratings.length;
      const avg = total > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / total) * 10) / 10
        : 0;
      result[sellerId] = { avg_rating: avg, total_ratings: total };
    }

    return result;
  } catch (err: any) {
    console.warn('fetchUserRatingsBatch exception:', err.message);
    return result;
  }
}


// ============ MESSAGE IMAGE UPLOAD ============

export async function uploadMessageImage(file: File): Promise<string> {
  const { userId } = await ensureAuthForUpload();

  // Compress to max 1MB
  let compressedBlob: Blob;
  try {
    compressedBlob = await compressImageToBlob(file, 1200, 1200, 0.75);
  } catch (compressErr) {
    console.warn('Canvas compression failed for message image, using original:', compressErr);
    compressedBlob = file;
  }

  // If still over 1MB, try more aggressive compression
  if (compressedBlob.size > 1024 * 1024) {
    try {
      compressedBlob = await compressImageToBlob(file, 800, 800, 0.6);
    } catch {
      // Keep current blob
    }
  }

  // If STILL over 1MB, try even more aggressive
  if (compressedBlob.size > 1024 * 1024) {
    try {
      compressedBlob = await compressImageToBlob(file, 600, 600, 0.5);
    } catch {
      // Keep current blob
    }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const contentType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const filePath = `${userId}/${timestamp}_${randomSuffix}.${ext}`;

  const sizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
  console.log(`Uploading message image: ${file.name}, compressed size: ${sizeMB}MB`);

  // Try direct storage upload first
  try {
    const { error: uploadError } = await supabase.storage
      .from('messages-images')
      .upload(filePath, compressedBlob, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('messages-images')
        .getPublicUrl(filePath);
      console.log(`Direct message image upload success: ${publicUrl}`);
      return publicUrl;
    }
    console.warn('Direct message image upload failed:', uploadError.message);
  } catch (err: any) {
    console.warn('Direct message image upload exception:', err.message);
  }

  // Fallback: use listing-images edge function with a different bucket hint
  console.log('Falling back to edge function for message image upload...');
  let base64: string;
  try {
    base64 = await blobToBase64(compressedBlob);
  } catch {
    base64 = await fileToBase64(file);
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('upload-listing-image', {
        body: {
          image_base64: base64,
          file_name: `msg_${file.name.substring(0, 40)}`,
          content_type: contentType,
          user_id: userId,
          bucket: 'messages-images',
        },
      });

      if (error) {
        const errMsg = typeof error === 'object' && error !== null
          ? (error as any).message || JSON.stringify(error)
          : String(error);
        console.error(`Message image edge fn attempt ${attempt + 1} error:`, errMsg);
        lastError = new Error(errMsg);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (data?.error) {
        console.error(`Message image edge fn attempt ${attempt + 1} data error:`, data.error);
        lastError = new Error(data.error);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (!data?.url) {
        lastError = new Error('Server returned success but no image URL');
        continue;
      }

      console.log(`Message image edge function upload success: ${data.url}`);
      return data.url;
    } catch (err: any) {
      lastError = err;
      console.error(`Message image edge fn attempt ${attempt + 1} exception:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Message image upload failed after multiple attempts.');
}



// ============ TRANSACTIONS ============
export async function getTransactions(userId: string) {
  const { data, error } = await supabase.functions.invoke('process-payment', {
    body: { action: 'get-transactions' },
  });
  if (error) throw error;
  return data?.transactions || [];
}

export async function initiatePayment(listingId: string, paymentMethod: string) {
  const { data, error } = await supabase.functions.invoke('process-payment', {
    body: { action: 'initiate-payment', listing_id: listingId, payment_method: paymentMethod },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function confirmPayment(transactionId: string) {
  const { data, error } = await supabase.functions.invoke('process-payment', {
    body: { action: 'confirm-payment', transaction_id: transactionId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ============ ORDERS ============
export async function createOrder(order: {
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  service_fee: number;
  total: number;
  payment_method: string;
}): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      ...order,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      listings!orders_listing_id_fkey(title, images, price),
      seller:profiles!orders_seller_id_fkey(full_name),
      buyer:profiles!orders_buyer_id_fkey(full_name)
    `)
    .eq('id', orderId)
    .single();
  if (error) return null;
  return {
    ...data,
    listing_title: (data as any).listings?.title,
    listing_image: (data as any).listings?.images?.[0],
    listing_price: (data as any).listings?.price,
    seller_name: (data as any).seller?.full_name,
    buyer_name: (data as any).buyer?.full_name,
  };
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      listings!orders_listing_id_fkey(title, images, price),
      seller:profiles!orders_seller_id_fkey(full_name),
      buyer:profiles!orders_buyer_id_fkey(full_name)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    listing_title: item.listings?.title,
    listing_image: item.listings?.images?.[0],
    listing_price: item.listings?.price,
    seller_name: item.seller?.full_name,
    buyer_name: item.buyer?.full_name,
  }));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentId?: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (paymentId) updates.payment_id = paymentId;

  
  // Get old status first
  let oldStatus: string | null = null;
  try {
    const { data: oldOrder } = await supabase.from('orders').select('status').eq('id', orderId).single();
    oldStatus = oldOrder?.status || null;
  } catch {}
  
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  
  // Trigger push notification + email for order status change
  if (oldStatus !== status) {
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'notify-order-status',
          order_id: orderId,
          old_status: oldStatus,
          new_status: status,
        },
      });
      console.log(`[OrderStatus] Notification sent for ${orderId}: ${oldStatus} -> ${status}`);
    } catch (notifErr) {
      console.warn('[OrderStatus] Failed to send notification:', notifErr);
      // Non-fatal - order status was already updated
    }
  }
  
  return data;
}



export async function cancelOrder(orderId: string) {
  return updateOrderStatus(orderId, 'cancelled');
}

// ============ REFUNDS ============

export interface RefundResult {
  order_id: string;
  amount: number;
  is_partial: boolean;
  commission_refunded: number;
  net_seller_deduction: number;
  new_order_status: string;
  reason: string | null;
  provider_note: string;
}


export async function processRefund(params: {
  order_id: string;
  refund_amount?: number;
  reason: string;
}): Promise<RefundResult> {
  const { data, error } = await supabase.functions.invoke('process-refund', {
    body: {
      action: 'process-refund',
      order_id: params.order_id,
      refund_amount: params.refund_amount,
      reason: params.reason,
    },
  });
  if (error) {
    const errMsg = typeof error === 'object' ? (error as any).message || JSON.stringify(error) : String(error);
    throw new Error(errMsg);
  }
  if (data?.error) throw new Error(data.error);
  return data.refund as RefundResult;
}

export async function getRefundHistory(orderId: string): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('process-refund', {
    body: { action: 'get-refund-history', order_id: orderId },
  });
  if (error) return [];
  return data?.refunds || [];
}

export async function getAdminRefunds(params?: { status?: string; limit?: number }): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('process-refund', {
    body: { action: 'get-all-refunds', ...params },
  });
  if (error) return [];
  return data?.refunds || [];
}


// ============ ORDER TRACKING ============

export async function getOrderTracking(orderId: string): Promise<OrderTracking[]> {
  const { data, error } = await supabase
    .from('order_tracking')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as OrderTracking[];
}

export async function getOrdersWithTracking(userId: string): Promise<Order[]> {
  // Get all orders for this user (as buyer or seller)
  const orders = await getUserOrders(userId);
  
  // Fetch tracking for all orders in parallel
  const trackingPromises = orders.map(async (order) => {
    try {
      const tracking = await getOrderTracking(order.id);
      return { ...order, tracking_history: tracking };
    } catch {
      return { ...order, tracking_history: [] };
    }
  });
  
  return Promise.all(trackingPromises);
}

export async function addTrackingUpdate(params: {
  order_id: string;
  status: TrackingStatus;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  photo_url?: string;
  updated_by: string;
}): Promise<OrderTracking> {
  const { data, error } = await supabase
    .from('order_tracking')
    .insert({
      order_id: params.order_id,
      status: params.status,
      tracking_number: params.tracking_number || null,
      carrier: params.carrier || null,
      notes: params.notes || null,
      photo_url: params.photo_url || null,
      updated_by: params.updated_by,
    })
    .select()
    .single();
  if (error) throw error;
  
  // Sync tracking info back to orders table
  const orderUpdates: any = {
    tracking_status: params.status,
    updated_at: new Date().toISOString(),
  };
  if (params.tracking_number) orderUpdates.tracking_number = params.tracking_number;
  if (params.carrier) orderUpdates.carrier = params.carrier;
  
  // Map tracking status to order status
  if (params.status === 'Shipped' || params.status === 'In Transit' || params.status === 'Out for Delivery') {
    orderUpdates.status = 'shipped';
  } else if (params.status === 'Delivered') {
    orderUpdates.status = 'delivered';
  } else if (params.status === 'Cancelled') {
    orderUpdates.status = 'cancelled';
  } else if (params.status === 'Processing') {
    // Keep current order status or set to paid
  }
  
  await supabase
    .from('orders')
    .update(orderUpdates)
    .eq('id', params.order_id);
  
  return data as OrderTracking;
}

// ============ DELIVERY PHOTO UPLOAD ============

export async function uploadDeliveryPhoto(file: File, orderId: string): Promise<string> {
  // Step 1: Verify auth
  const { userId, accessToken } = await ensureAuthForUpload();

  // Step 2: Compress image
  let compressedBlob: Blob;
  try {
    compressedBlob = await compressImageToBlob(file, 1200, 1200, 0.82);
  } catch (compressErr) {
    console.warn('Canvas compression failed for delivery photo, using original:', compressErr);
    compressedBlob = file;
  }

  // If still too large, try more aggressive compression
  if (compressedBlob.size > 5 * 1024 * 1024) {
    try {
      compressedBlob = await compressImageToBlob(file, 800, 800, 0.6);
    } catch {
      // Keep current blob
    }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const contentType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 40);
  const filePath = `${userId}/${orderId}/${timestamp}_${randomSuffix}_${safeName}.${ext}`;

  const sizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
  console.log(`Uploading delivery photo: ${file.name}, size: ${sizeMB}MB`);

  // Step 3: Try direct storage upload first
  try {
    const { error: uploadError } = await supabase.storage
      .from('delivery-photos')
      .upload(filePath, compressedBlob, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(filePath);
      console.log(`Direct delivery photo upload success: ${publicUrl}`);
      return publicUrl;
    }
    console.warn('Direct delivery photo upload failed:', uploadError.message);
  } catch (err: any) {
    console.warn('Direct delivery photo upload exception:', err.message);
  }

  // Step 4: Fallback to edge function
  console.log('Falling back to edge function for delivery photo upload...');
  let base64: string;
  try {
    base64 = await blobToBase64(compressedBlob);
  } catch {
    base64 = await fileToBase64(file);
  }

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('upload-delivery-photo', {
        body: {
          image_base64: base64,
          file_name: file.name.substring(0, 50),
          content_type: contentType,
          user_id: userId,
          order_id: orderId,
        },
      });

      if (error) {
        const errMsg = typeof error === 'object' && error !== null
          ? (error as any).message || JSON.stringify(error)
          : String(error);
        console.error(`Delivery photo edge fn attempt ${attempt + 1} error:`, errMsg);
        lastError = new Error(errMsg);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (data?.error) {
        console.error(`Delivery photo edge fn attempt ${attempt + 1} data error:`, data.error);
        lastError = new Error(data.error);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (!data?.url) {
        lastError = new Error('Server returned success but no image URL');
        continue;
      }

      console.log(`Delivery photo edge function upload success: ${data.url}`);
      return data.url;
    } catch (err: any) {
      lastError = err;
      console.error(`Delivery photo edge fn attempt ${attempt + 1} exception:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Delivery photo upload failed after multiple attempts.');
}





// ============ ACCOUNT DELETION (POPIA) ============
export async function deleteAccount(): Promise<{ success: boolean; message: string; deletion_summary?: string[] }> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirmation: 'DELETE_MY_ACCOUNT' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}


// ============ SELLER DASHBOARD ============

export async function getSellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
  try {
    const { data, error } = await supabase.rpc('get_seller_analytics', { p_seller_id: sellerId });
    if (error) throw error;
    // RPC returns JSON - may be nested or flat
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return result as SellerAnalytics;
  } catch (rpcError) {
    console.warn('get_seller_analytics RPC failed, using fallback:', rpcError);
    // Fallback: compute analytics manually
    try {
      const [listingsRes, ordersRes, ratingsRes] = await Promise.all([
        supabase.from('listings').select('id, status, view_count').eq('user_id', sellerId),
        supabase.from('orders').select('id, status, amount, service_fee').eq('seller_id', sellerId),
        supabase.from('seller_ratings').select('rating').eq('seller_id', sellerId),
      ]);
      const listings = listingsRes.data || [];
      const orders = ordersRes.data || [];
      const ratings = ratingsRes.data || [];
      
      const paidOrders = orders.filter((o: any) => ['paid', 'shipped', 'delivered'].includes(o.status));
      const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length) * 10) / 10 : 0;
      
      return {
        total_listings: listings.length,
        active_listings: listings.filter((l: any) => l.status === 'active').length,
        sold_listings: listings.filter((l: any) => l.status === 'sold').length,
        total_views: listings.reduce((s: number, l: any) => s + (l.view_count || 0), 0),
        total_orders: orders.length,
        total_revenue: paidOrders.reduce((s: number, o: any) => s + (parseFloat(o.amount) || 0), 0),
        total_fees: paidOrders.reduce((s: number, o: any) => s + (parseFloat(o.service_fee) || 0), 0),
        pending_orders: orders.filter((o: any) => ['pending', 'paid'].includes(o.status)).length,
        completed_orders: orders.filter((o: any) => o.status === 'delivered').length,
        avg_rating: avgRating,
        total_ratings: ratings.length,
      };
    } catch (fallbackError) {
      console.error('Fallback analytics also failed:', fallbackError);
      return {
        total_listings: 0, active_listings: 0, sold_listings: 0, total_views: 0,
        total_orders: 0, total_revenue: 0, total_fees: 0, pending_orders: 0,
        completed_orders: 0, avg_rating: 0, total_ratings: 0,
      };
    }
  }
}

export async function getSellerOrders(sellerId: string): Promise<SellerOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      listings!orders_listing_id_fkey(title, images, price),
      buyer:profiles!orders_buyer_id_fkey(full_name, province)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    listing_title: item.listings?.title,
    listing_image: item.listings?.images?.[0],
    listing_price: item.listings?.price,
    // POPIA: Anonymize buyer info
    buyer_name_masked: item.buyer?.full_name
      ? item.buyer.full_name.charAt(0) + '***'
      : 'Buyer',
    buyer_province_masked: item.buyer?.province
      ? item.buyer.province.substring(0, 3) + '...'
      : 'N/A',
  }));
}

export async function getSellerRatings(sellerId: string): Promise<SellerRating[]> {
  const { data, error } = await supabase
    .from('seller_ratings')
    .select(`
      *,
      buyer:profiles!seller_ratings_buyer_id_fkey(full_name)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    buyer_name: item.buyer?.full_name,
    buyer_name_masked: item.buyer?.full_name
      ? item.buyer.full_name.charAt(0) + '***'
      : 'Buyer',
    listing_title: 'Item',
  }));
}

export async function getSellerRatingSummary(sellerId: string) {
  try {
    const { data, error } = await supabase.rpc('get_seller_rating_summary', { p_seller_id: sellerId });
    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return result as { average: number; total: number; distribution: Record<string, number> };
  } catch (rpcError) {
    console.warn('get_seller_rating_summary RPC failed, using fallback:', rpcError);
    // Fallback
    const { data: ratings } = await supabase.from('seller_ratings').select('rating').eq('seller_id', sellerId);
    const ratingsList = ratings || [];
    const total = ratingsList.length;
    const average = total > 0 ? Math.round((ratingsList.reduce((s: number, r: any) => s + r.rating, 0) / total) * 10) / 10 : 0;
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    ratingsList.forEach((r: any) => { distribution[String(r.rating)] = (distribution[String(r.rating)] || 0) + 1; });
    return { average, total, distribution };
  }
}


export async function submitSellerRating(params: {
  seller_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  review?: string;
}): Promise<SellerRating> {
  const { data, error } = await supabase
    .from('seller_ratings')
    .insert({
      seller_id: params.seller_id,
      buyer_id: params.buyer_id,
      order_id: params.order_id,
      rating: params.rating,
      review: params.review || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSellerRating(ratingId: string, updates: { rating: number; review?: string }) {
  const { data, error } = await supabase
    .from('seller_ratings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', ratingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOrderRating(orderId: string, buyerId: string): Promise<SellerRating | null> {
  const { data, error } = await supabase
    .from('seller_ratings')
    .select('*')
    .eq('order_id', orderId)
    .eq('buyer_id', buyerId)
    .maybeSingle();
  if (error) return null;
  return data;
}

// ============ IMAGE UPLOAD ============

// Check if user has a valid session before uploading
async function ensureAuthForUpload(): Promise<{ userId: string; accessToken: string }> {
  let session = (await supabase.auth.getSession()).data.session;
  if (!session?.user?.id) {
    // Try refreshing the session
    const { data: refreshData } = await supabase.auth.refreshSession();
    session = refreshData?.session || null;
  }
  if (!session?.user?.id || !session?.access_token) {
    throw new Error('Please sign in to upload images. Your session may have expired.');
  }
  return { userId: session.user.id, accessToken: session.access_token };
}

// Compress image to Blob (for direct storage upload)
function compressImageToBlob(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Image compression timed out'));
    }, 15000);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Safety: limit canvas size for mobile
          const maxPixels = 4096 * 4096;
          if (width * height > maxPixels) {
            const scale = Math.sqrt(maxPixels / (width * height));
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            clearTimeout(timeout);
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              canvas.width = 0;
              canvas.height = 0;
              clearTimeout(timeout);
              if (!blob || blob.size < 100) {
                reject(new Error('Canvas produced empty output'));
                return;
              }
              resolve(blob);
            },
            mimeType,
            quality
          );
        } catch (canvasErr) {
          clearTimeout(timeout);
          reject(canvasErr);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadListingImage(file: File): Promise<string> {
  // Step 1: Verify auth and get user info
  const { userId, accessToken } = await ensureAuthForUpload();

  // Step 2: Compress image to Blob
  let compressedBlob: Blob;
  try {
    compressedBlob = await compressImageToBlob(file, 1200, 1200, 0.82);
  } catch (compressErr) {
    console.warn('Canvas compression failed, using original file:', compressErr);
    compressedBlob = file; // Use original file as fallback
  }

  // If still too large, try more aggressive compression
  if (compressedBlob.size > 5 * 1024 * 1024) {
    try {
      compressedBlob = await compressImageToBlob(file, 800, 800, 0.6);
    } catch {
      // Keep current blob
    }
  }

  const sizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
  console.log(`Uploading image: ${file.name}, size: ${sizeMB}MB`);

  // Step 3: Determine file path and extension
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 40);
  const filePath = `${userId}/${timestamp}_${randomSuffix}_${safeName}.${ext}`;
  const contentType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

  // Step 4: Try DIRECT storage upload first (fastest, no base64 overhead)
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Direct upload attempt ${attempt + 1}: ${filePath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, compressedBlob, {
          contentType,
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.warn(`Direct upload attempt ${attempt + 1} failed:`, uploadError.message);
        lastError = new Error(uploadError.message);
        
        // If it's a policy/auth error, skip to edge function fallback
        if (uploadError.message?.includes('policy') || 
            uploadError.message?.includes('Unauthorized') ||
            uploadError.message?.includes('row-level security') ||
            uploadError.message?.includes('403') ||
            uploadError.message?.includes('not allowed')) {
          console.log('Direct upload blocked by policy, trying edge function...');
          break; // Exit retry loop, fall through to edge function
        }
        
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        break; // Fall through to edge function
      }

      // Success! Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      console.log(`Direct upload success: ${publicUrl}`);
      return publicUrl;
    } catch (err: any) {
      console.warn(`Direct upload attempt ${attempt + 1} exception:`, err.message);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }

  // Step 5: FALLBACK - Edge function upload (handles auth via service role)
  console.log('Falling back to edge function upload...');
  
  // Convert blob to base64 for edge function
  let base64: string;
  try {
    base64 = await blobToBase64(compressedBlob);
  } catch {
    // Try from original file
    base64 = await fileToBase64(file);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Edge function upload attempt ${attempt + 1}`);
      const { data, error } = await supabase.functions.invoke('upload-listing-image', {
        body: {
          image_base64: base64,
          file_name: file.name.substring(0, 50),
          content_type: contentType,
          user_id: userId, // Fallback auth method
        },
      });

      if (error) {
        const errMsg = typeof error === 'object' && error !== null
          ? (error as any).message || JSON.stringify(error)
          : String(error);
        console.error(`Edge fn attempt ${attempt + 1} error:`, errMsg);
        lastError = new Error(errMsg);

        if (errMsg.includes('auth') || errMsg.includes('401') || errMsg.includes('sign in')) {
          throw new Error('Authentication error. Please sign in again.');
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (data?.error) {
        console.error(`Edge fn attempt ${attempt + 1} data error:`, data.error);
        lastError = new Error(data.error);
        if (data.details === 'base64_decode_failed') {
          throw new Error('Image data is corrupted. Please select the image again.');
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        break;
      }

      if (!data?.url) {
        lastError = new Error('Server returned success but no image URL');
        continue;
      }

      console.log(`Edge function upload success: ${data.url}`);
      return data.url;
    } catch (err: any) {
      if (err.message?.includes('Authentication') || err.message?.includes('sign in') || err.message?.includes('corrupted')) {
        throw err;
      }
      lastError = err;
      console.error(`Edge fn attempt ${attempt + 1} exception:`, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Upload failed after multiple attempts. Please check your connection and try again.');
}

// ============ AVATAR UPLOAD ============
export async function uploadAvatar(file: File): Promise<string> {
  const { userId } = await ensureAuthForUpload();

  // Compress avatar
  let compressedBlob: Blob;
  try {
    compressedBlob = await compressImageToBlob(file, 400, 400, 0.85);
  } catch {
    compressedBlob = file;
  }

  // Try direct upload first
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const filePath = `${userId}/${Date.now()}_avatar.${ext}`;
  const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressedBlob, { contentType, upsert: false, cacheControl: '3600' });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicUrl;
    }
    console.warn('Direct avatar upload failed, trying edge function:', uploadError.message);
  } catch (err: any) {
    console.warn('Direct avatar upload exception:', err.message);
  }

  // Fallback to edge function
  let base64: string;
  try {
    base64 = await blobToBase64(compressedBlob);
  } catch {
    base64 = await fileToBase64(file);
  }

  const { data, error } = await supabase.functions.invoke('upload-avatar', {
    body: {
      image_base64: base64,
      file_name: file.name,
      content_type: contentType,
      user_id: userId,
    },
  });
  if (error) throw new Error((error as any).message || 'Avatar upload failed');
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('No URL returned from avatar upload');
  return data.url;
}

// Convert Blob to base64 string (without data URL prefix)
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to convert blob to base64'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

// Convert File to base64 string (without data URL prefix) - fallback when canvas fails
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to convert file to base64'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Client-side image compression using canvas (returns base64 string)
export function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Image compression timed out. The image may be too large.'));
    }, 15000);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const maxPixels = 4096 * 4096;
          if (width * height > maxPixels) {
            const scale = Math.sqrt(maxPixels / (width * height));
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            clearTimeout(timeout);
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const base64 = dataUrl.split(',')[1];

          canvas.width = 0;
          canvas.height = 0;

          clearTimeout(timeout);

          if (!base64 || base64.length < 100) {
            reject(new Error('Canvas produced empty or invalid output'));
            return;
          }
          resolve(base64);
        } catch (canvasErr) {
          clearTimeout(timeout);
          reject(canvasErr);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image for compression'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

// Create a local preview URL for a file (for immediate display before upload completes)
export function createLocalPreview(file: File): string {
  return URL.createObjectURL(file);
}

// Revoke a local preview URL to free memory
export function revokeLocalPreview(url: string): void {
  try {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch {}
}







export async function getSellerEarnings(): Promise<SellerEarnings> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'get-earnings' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.earnings as SellerEarnings;
}

export async function getPayouts(): Promise<Payout[]> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'get-payouts' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data.payouts || []) as Payout[];
}

export async function requestPayout(amount: number): Promise<Payout> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'request-payout', amount },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.payout as Payout;
}

export async function updateBankDetails(details: {
  bank_name: string;
  bank_account_number: string;
  bank_branch_code: string;
  bank_account_holder?: string;
}): Promise<any> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated. Please sign in and try again.');

  console.log('[updateBankDetails] Saving via secure RPC for user:', user.id);

  // PRIMARY: Use secure RPC function (validates auth.uid() server-side, bypasses RLS safely)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_bank_details', {
      p_bank_name: details.bank_name,
      p_account_number: details.bank_account_number,
      p_branch_code: details.bank_branch_code,
      p_account_holder: details.bank_account_holder || '',
    });

    if (!rpcError) {
      console.log('[updateBankDetails] RPC SUCCESS');
      return { success: true, method: 'rpc', ...(typeof rpcData === 'object' ? rpcData : {}) };
    }
    console.warn('[updateBankDetails] RPC failed:', rpcError.message);
  } catch (rpcErr: any) {
    console.warn('[updateBankDetails] RPC exception:', rpcErr.message);
  }

  // FALLBACK: Direct database update (if RPC unavailable)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        bank_name: details.bank_name,
        bank_account_number: details.bank_account_number,
        bank_branch_code: details.bank_branch_code,
        bank_account_holder: details.bank_account_holder || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, bank_name, bank_account_number, bank_branch_code, bank_account_holder')
      .single();

    if (!error && data) {
      console.log('[updateBankDetails] Direct DB fallback SUCCESS');
      return { success: true, profile: data, method: 'direct' };
    }
    if (error) {
      console.warn('[updateBankDetails] Direct DB fallback failed:', error.message);
      throw new Error(error.message);
    }
  } catch (directErr: any) {
    if (directErr.message?.startsWith('Not authenticated')) throw directErr;
    console.warn('[updateBankDetails] Direct fallback exception:', directErr.message);
  }

  throw new Error('Failed to save bank details. Please check your connection and try again.');
}




// ============ PAYMENT GATEWAY (PLACEHOLDER) ============
// Payment gateway functions removed during cleanup phase.
// A South African payment gateway will be integrated later.



// ============ DISPUTES ============

export async function createDispute(params: {
  order_id: string;
  reason: DisputeReason;
  description: string;
  evidence_urls?: string[];
}): Promise<Dispute> {
  const { data, error } = await supabase.functions.invoke('manage-disputes', {
    body: { action: 'create-dispute', ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.dispute as Dispute;
}

export async function getDisputes(role: 'buyer' | 'seller'): Promise<Dispute[]> {
  const { data, error } = await supabase.functions.invoke('manage-disputes', {
    body: { action: 'get-disputes', role },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data.disputes || []).map((d: any) => ({
    ...d,
    order_listing_title: d.orders?.listings?.title,
    order_listing_image: d.orders?.listings?.images?.[0],
    order_amount: d.orders?.amount,
    order_total: d.orders?.total,
    order_status: d.orders?.status,
    buyer_name: d.orders?.buyer?.full_name,
    seller_name: d.orders?.seller?.full_name,
  }));
}

export async function getOrderDispute(orderId: string): Promise<Dispute | null> {
  const { data, error } = await supabase.functions.invoke('manage-disputes', {
    body: { action: 'get-order-dispute', order_id: orderId },
  });
  if (error) return null;
  return data?.dispute || null;
}

export async function respondToDispute(disputeId: string, responseText: string, acceptRefund: boolean): Promise<Dispute> {
  const { data, error } = await supabase.functions.invoke('manage-disputes', {
    body: { action: 'respond-dispute', dispute_id: disputeId, response_text: responseText, accept_refund: acceptRefund },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.dispute as Dispute;
}

export async function uploadDisputeEvidence(file: File): Promise<string> {
  const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
  const { data, error } = await supabase.functions.invoke('manage-disputes', {
    body: {
      action: 'upload-evidence',
      image_base64: compressedBase64,
      file_name: file.name,
      content_type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.url;
}


// ============ ADMIN API ============

export async function getAdminStats(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'get-stats' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.stats;
}

export async function getAdminUsers(params?: { search?: string; page?: number; limit?: number }): Promise<any> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'get-users', ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function adminUpdateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'update-user-status', user_id: userId, status },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function getAdminPayouts(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'get-pending-payouts' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.payouts || [];
}

export async function adminProcessPayout(payoutId: string, action: 'approve' | 'reject', notes?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'process-payout', payout_id: payoutId, payout_action: action, admin_notes: notes },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function getAdminDisputes(params?: { status?: string; page?: number }): Promise<any> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'get-disputes', ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function adminResolveDispute(disputeId: string, resolution: string, resolutionAmount?: number, adminNotes?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: {
      action: 'resolve-dispute',
      dispute_id: disputeId,
      resolution,
      resolution_amount: resolutionAmount,
      admin_notes: adminNotes,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function adminApproveVerification(userId: string, approved: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: { action: 'verify-seller', user_id: userId, approved },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function requestSellerVerification(file: File): Promise<void> {
  const compressedBase64 = await compressImage(file, 1200, 1200, 0.85);
  const { data, error } = await supabase.functions.invoke('admin-dashboard', {
    body: {
      action: 'submit-verification',
      image_base64: compressedBase64,
      file_name: file.name,
      content_type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}


// ============ FORMATTERS ============
export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString('en-ZA');
}


// ============ COURIER / SHIPPING ============

export async function createShipment(params: {
  order_id: string;
  courier_service: string;
  from_address?: any;
  to_address?: any;
  item_description?: string;
  weight_kg?: number;
}): Promise<ShipmentData> {
  const { data, error } = await supabase.functions.invoke('create-shipment', {
    body: { action: 'create-shipment', ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as ShipmentData;
}

export async function saveDeliveryAddress(orderId: string, address: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-shipment', {
    body: { action: 'save-delivery-address', order_id: orderId, delivery_address: address },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function getDeliveryAddress(orderId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('create-shipment', {
    body: { action: 'get-delivery-address', order_id: orderId },
  });
  if (error) return null;
  return data?.address || null;
}

export async function updateOrderCourierService(orderId: string, courierService: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ courier_service: courierService, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function pollCourierTracking(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('courier-tracking-poll', {
    body: { action: 'poll' },
  });
  if (error) throw error;
  return data;
}

export async function pollSingleOrderTracking(orderId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('courier-tracking-poll', {
    body: { action: 'poll-single', order_id: orderId },
  });
  if (error) throw error;
  return data;
}

export async function getCourierTrackingStatus(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('courier-tracking-poll', {
    body: { action: 'status' },
  });
  if (error) throw error;
  return data;
}


// ============ SHIPPING RATES ============

export interface ShippingRate {
  id: string;
  service: string;
  rate: number;
  delivery_days: string;
}

export interface ShippingRatesResult {
  rates: ShippingRate[];
  simulated: boolean;
}

/**
 * Get shipping rates from ShipLogic API via the create-shipment edge function.
 * Falls back to flat-rate estimates from src/lib/shipping.ts if the API is unavailable.
 */
export async function getShippingRates(params: {
  from_province: string;
  to_address: {
    street: string;
    city: string;
    postalCode: string;
    province: string;
  };
}): Promise<ShippingRatesResult> {
  try {
    const fromAddress = {
      type: 'business',
      company: 'SnapUp Seller',
      street_address: 'Seller Location',
      local_area: params.from_province,
      city: params.from_province,
      zone: params.from_province,
      country: 'ZA',
      code: '0000',
    };
    const toAddress = {
      type: 'residential',
      company: '',
      street_address: params.to_address.street,
      local_area: params.to_address.city,
      city: params.to_address.city,
      zone: params.to_address.province,
      country: 'ZA',
      code: params.to_address.postalCode,
    };

    const { data, error } = await supabase.functions.invoke('create-shipment', {
      body: {
        action: 'get-rates',
        from_address: fromAddress,
        to_address: toAddress,
        parcels: [{ submitted_length_cm: 30, submitted_width_cm: 20, submitted_height_cm: 15, submitted_weight_kg: 1 }],
      },
    });

    if (!error && data?.rates && data.rates.length > 0) {
      return {
        rates: data.rates.map((r: any) => ({
          id: r.id || 'sl_standard',
          service: r.service || 'ShipLogic',
          rate: Number(r.rate) || 0,
          delivery_days: r.delivery_days || '2-5',
        })),
        simulated: data.simulated || false,
      };
    }
    // If edge function returned error or no rates, fall through to flat-rate
    console.warn('[ShippingRates] Edge function returned no rates, using flat-rate fallback');
  } catch (err: any) {
    console.warn('[ShippingRates] API call failed, using flat-rate fallback:', err.message);
  }

  // Flat-rate fallback - return null to signal component should use local calculation
  return { rates: [], simulated: true };
}



// ============ PROMOS ============

export async function getSellerPromoStatus(sellerId: string): Promise<SellerPromoStatus> {
  try {
    const { data, error } = await supabase.rpc('get_seller_promo_status', { p_seller_id: sellerId });
    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return result as SellerPromoStatus;
  } catch (err) {
    console.warn('get_seller_promo_status RPC failed:', err);
    return {
      has_active_promo: false,
      delivered_count: 0,
      promo: null,
      usage_count: 0,
      remaining_free_sales: 0,
      commission_saved: 0,
      is_eligible: false,
    };
  }
}

export async function getActivePromos(): Promise<Promo[]> {
  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Promo[];
}

export async function getAllPromos(): Promise<Promo[]> {
  const { data, error } = await supabase
    .from('promos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Promo[];
}

export async function togglePromoActive(promoId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('promos')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', promoId);
  if (error) throw error;
}

export async function updatePromo(promoId: string, updates: Partial<Promo>): Promise<void> {
  const { error } = await supabase
    .from('promos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', promoId);
  if (error) throw error;
}

export async function createPromo(promo: {
  name: string;
  type: string;
  discount_percent?: number;
  max_sales?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
  description?: string;
  target_provinces?: string[];
}): Promise<Promo> {
  const { data, error } = await supabase
    .from('promos')
    .insert({
      ...promo,
      active: true,
      start_date: promo.start_date || new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Promo;
}

export async function getPromoImpactStats(): Promise<PromoImpactStats> {
  try {
    const { data, error } = await supabase.rpc('get_promo_impact_stats');
    if (error) throw error;
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return result as PromoImpactStats;
  } catch (err) {
    console.warn('get_promo_impact_stats failed:', err);
    return {
      total_promos: 0,
      active_promos: 0,
      total_promo_usage: 0,
      total_commission_forgone: 0,
      unique_sellers_using_promos: 0,
    };
  }
}


// ============ ESCROW ============

export async function getEscrowStatus(orderId: string): Promise<{ escrow: EscrowHold | null; has_active_dispute: boolean; dispute_ids?: string[] }> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'get-escrow-status', order_id: orderId },
  });
  if (error) {
    console.warn('getEscrowStatus error:', error);
    return { escrow: null, has_active_dispute: false };
  }
  if (data?.error) {
    console.warn('getEscrowStatus data error:', data.error);
    return { escrow: null, has_active_dispute: false };
  }
  return {
    escrow: data?.escrow || null,
    has_active_dispute: data?.has_active_dispute || false,
    dispute_ids: data?.dispute_ids,
  };
}

export async function createEscrowHold(orderId: string): Promise<EscrowHold | null> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'create-escrow-hold', order_id: orderId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.escrow || null;
}

export async function confirmDeliveryEscrow(orderId: string): Promise<{ escrow: EscrowHold; release_at: string }> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'confirm-delivery-escrow', order_id: orderId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { escrow: data.escrow, release_at: data.release_at };
}

export async function autoReleaseEscrow(orderId: string): Promise<EscrowHold | null> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'auto-release-escrow', order_id: orderId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.escrow || null;
}

export async function pauseEscrow(orderId: string, disputeId?: string): Promise<EscrowHold | null> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'pause-escrow', order_id: orderId, dispute_id: disputeId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.escrow || null;
}


// ============ SELLER ESCROW HOLDS ============

export async function getSellerEscrowHolds(): Promise<SellerEscrowData> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'get-seller-escrow-holds' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return {
    summary: data.summary || { total_in_escrow: 0, total_holding: 0, total_disputed: 0, total_released: 0 },
    holds: data.holds || [],
    payout_history: data.payout_history || [],
  };
}

// ============ ADMIN ESCROW ============

export async function getAdminEscrowStats(): Promise<AdminEscrowStats> {
  const { data, error } = await supabase.functions.invoke('process-payouts', {
    body: { action: 'get-admin-escrow-stats' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.stats as AdminEscrowStats;
}

export async function adminResolveDisputeWithEscrow(
  disputeId: string,
  escrowAction: EscrowResolutionAction,
  resolutionAmount?: number,
  adminNotes?: string
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('manage-disputes', {
    body: {
      action: 'resolve-dispute-escrow',
      dispute_id: disputeId,
      escrow_action: escrowAction,
      resolution_amount: resolutionAmount,
      admin_notes: adminNotes,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function triggerEscrowCron(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('escrow-cron', {
    body: {},
  });
  if (error) throw error;
  return data;
}


// ============ DELIVERY ADDRESS (ENCRYPTED) ============

export async function encryptDeliveryAddress(orderId: string, address: { street: string; city: string; postalCode: string; province: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const addressJson = JSON.stringify(address);
  const { error } = await supabase.rpc('encrypt_delivery_address', {
    p_order_id: orderId,
    p_address: addressJson,
    p_user_id: user.id,
  });
  if (error) throw error;
}

export async function decryptDeliveryAddress(orderId: string): Promise<{ street: string; city: string; postalCode: string; province: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.rpc('decrypt_delivery_address', {
    p_order_id: orderId,
    p_user_id: user.id,
  });
  if (error || !data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============ SELLER VERIFICATION (ADMIN) ============

export async function getAdminVerifications(status?: string): Promise<any[]> {
  let query = supabase
    .from('seller_verifications')
    .select('*, profiles:user_id(full_name, email, avatar_url, province, created_at)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((v: any) => ({
    ...v,
    user_name: v.profiles?.full_name || 'Unknown',
    user_email: v.profiles?.email || '',
    user_avatar: v.profiles?.avatar_url || '',
    user_province: v.profiles?.province || '',
    user_joined: v.profiles?.created_at || '',
  }));
}

export async function adminReviewVerification(verificationId: string, userId: string, approved: boolean, adminNotes?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Update verification record
  const { error: verError } = await supabase
    .from('seller_verifications')
    .update({
      status: approved ? 'approved' : 'rejected',
      admin_notes: adminNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);
  if (verError) throw verError;

  // Update profile
  const { error: profError } = await supabase
    .from('profiles')
    .update({
      verified_seller: approved,
      verification_status: approved ? 'approved' : 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (profError) throw profError;
}


// ============ SAVED SEARCHES ============

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  province: string | null;
  min_price: number | null;
  max_price: number | null;
  keywords: string | null;
  condition: string | null;
  email_alerts: boolean;
  last_notified_at: string | null;
  last_match_count: number;
  created_at: string;
  updated_at: string;
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as SavedSearch[];
}

export async function createSavedSearch(params: {
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  province?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  keywords?: string | null;
  condition?: string | null;
  email_alerts?: boolean;
}): Promise<SavedSearch> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name: params.name,
      category_id: params.category_id || null,
      category_name: params.category_name || null,
      province: params.province || null,
      min_price: params.min_price || null,
      max_price: params.max_price || null,
      keywords: params.keywords || null,
      condition: params.condition || null,
      email_alerts: params.email_alerts !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavedSearch;
}

export async function updateSavedSearch(id: string, updates: Partial<SavedSearch>): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function resendEmail(logId: string): Promise<void> {
  const { data: log, error: logError } = await supabase
    .from('email_logs')
    .select('*')
    .eq('id', logId)
    .single();
  if (logError || !log) throw new Error('Email log not found');
  if (!log.order_id) throw new Error('No order_id associated with this email');

  const { error } = await supabase.functions.invoke('send-tracking-email', {
    body: {
      order_id: log.order_id,
      event_type: log.event_type || 'tracking_update',
    },
  });
  if (error) throw error;
  if (error) throw error;
}


// ============ DATA CLEANUP / MAINTENANCE (POPIA) ============

export interface CleanupTaskResult {
  task: string;
  deleted: number;
  archived?: number;
  duration_ms: number;
  error?: string;
}

export interface CleanupSummary {
  triggered_by: string;
  dry_run: boolean;
  total_deleted: number;
  total_archived: number;
  total_errors: number;
  total_duration_ms: number;
  tasks: CleanupTaskResult[];
  completed_at: string;
}

export async function triggerDataCleanup(dryRun: boolean = false): Promise<CleanupSummary> {
  const { data, error } = await supabase.functions.invoke('data-cleanup-cron', {
    body: { dry_run: dryRun },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.summary as CleanupSummary;
}

export async function getCleanupHistory(): Promise<any[]> {
  const { data, error } = await supabase
    .from('cron_job_log')
    .select('*')
    .eq('job_name', 'data-cleanup-cron')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function getCronSchedules(): Promise<any[]> {
  const { data, error } = await supabase
    .from('cron_schedule_config')
    .select('*')
    .order('function_name');
  if (error) throw error;
  return data || [];
}

export async function toggleCronSchedule(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('cron_schedule_config')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}



// ============ OFFERS ============

export async function createOffer(params: {
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message?: string;
}): Promise<Offer> {
  // ── Step 0: Ensure fresh session before offer creation ──
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      await supabase.auth.refreshSession();
    } else {
      const expiresAt = sessionData.session.expires_at;
      if (expiresAt && (expiresAt - Math.floor(Date.now() / 1000)) < 60) {
        await supabase.auth.refreshSession();
      }
    }
  } catch (e) {
    console.warn('[createOffer] Session refresh failed:', e);
  }

  // ── Step 1: Validate & resolve seller_id ──
  let sellerId = params.seller_id;

  if (!sellerId) {
    console.warn('[createOffer] seller_id is null/undefined, fetching from listing:', params.listing_id);
    try {
      const { data: listingData, error: listingErr } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', params.listing_id)
        .single();
      if (listingErr || !listingData?.user_id) {
        console.error('[createOffer] Failed to fetch seller_id from listing:', listingErr?.message);
        throw new Error('This listing has an issue — the seller could not be identified. Please contact support.');
      }
      sellerId = listingData.user_id;
      console.log('[createOffer] Resolved seller_id from listing:', sellerId);
    } catch (fetchErr: any) {
      if (fetchErr.message?.includes('contact support')) throw fetchErr;
      console.error('[createOffer] Exception fetching seller_id:', fetchErr);
      throw new Error('This listing has an issue — the seller could not be identified. Please contact support.');
    }
  }

  // Final guard: seller_id must not be null
  if (!sellerId) {
    throw new Error('This listing has an issue — the seller could not be identified. Please contact support.');
  }

  // Prevent self-offers
  if (sellerId === params.buyer_id) {
    throw new Error('You cannot make an offer on your own listing.');
  }

  console.log('[createOffer] Creating offer:', {
    listing_id: params.listing_id,
    buyer_id: params.buyer_id,
    seller_id: sellerId,
    amount: params.amount,
  });

  // ── Step 2: Attempt insert with seller_id ──
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert({
        listing_id: params.listing_id,
        buyer_id: params.buyer_id,
        seller_id: sellerId,
        amount: params.amount,
        message: params.message || null,
        status: 'pending',
      })
      .select()
      .single();
    if (!error && data) return data as Offer;
    if (error) {
      const errMsg = error.message?.toLowerCase() || '';
      // Check if it's a "column does not exist" error for seller_id
      const isColumnError = (errMsg.includes('column') && errMsg.includes('does not exist')) || error.code === '42703';
      if (!isColumnError) {
        // Real error - throw with helpful message
        console.error('[createOffer] Insert error:', error.message, error.code);
        if (errMsg.includes('violates row-level security')) {
          throw new Error('Permission denied. Please sign out and sign back in, then try again.');
        }
        if (errMsg.includes('null value') && errMsg.includes('seller_id')) {
          throw new Error('This listing has an issue — the seller could not be identified. Please contact support.');
        }
        throw error;
      }
      console.warn('[createOffer] seller_id column error, retrying without seller_id:', error.message);
    }
  } catch (err: any) {
    const errMsg = err.message?.toLowerCase() || '';
    const isColumnError = (errMsg.includes('column') && errMsg.includes('does not exist')) || err.code === '42703';
    if (!isColumnError) throw err;
    console.warn('[createOffer] seller_id column error (catch), retrying without seller_id:', err.message);
  }

  // ── Step 3: Fallback insert WITHOUT seller_id (if column doesn't exist) ──
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert({
        listing_id: params.listing_id,
        buyer_id: params.buyer_id,
        amount: params.amount,
        message: params.message || null,
        status: 'pending',
      })
      .select()
      .single();
    if (error) {
      console.error('[createOffer] Attempt 2 failed:', error.message);
      if (error.message?.toLowerCase().includes('violates row-level security')) {
        throw new Error('Permission denied. Please sign out and sign back in, then try again.');
      }
      throw new Error('Failed to submit offer. Please try again.');
    }
    return data as Offer;
  } catch (err2: any) {
    if (err2.message?.includes('Permission denied') || err2.message?.includes('contact support')) throw err2;
    console.error('[createOffer] Attempt 2 exception:', err2.message);
    throw new Error('Failed to submit offer. Please try again.');
  }
}


export async function getOffersForListing(listingId: string, userId: string): Promise<Offer[]> {
  // Try with seller FK join first
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        buyer:profiles!offers_buyer_id_fkey(full_name),
        seller:profiles!offers_seller_id_fkey(full_name)
      `)
      .eq('listing_id', listingId)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (!error) {
      return (data || []).map((item: any) => ({
        ...item,
        buyer_name: item.buyer?.full_name,
        seller_name: item.seller?.full_name,
      }));
    }
    console.warn('[getOffersForListing] FK join failed, trying without seller join:', error.message);
  } catch (e: any) {
    console.warn('[getOffersForListing] FK join exception:', e.message);
  }

  // Fallback: query without seller FK join
  const { data, error } = await supabase
    .from('offers')
    .select(`*, buyer:profiles!offers_buyer_id_fkey(full_name)`)
    .eq('listing_id', listingId)
    .or(`buyer_id.eq.${userId}`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    buyer_name: item.buyer?.full_name,
    seller_name: null,
  }));
}

export async function getOffersForConversation(listingId: string, buyerId: string, sellerId: string): Promise<Offer[]> {
  // Try with both FK joins first
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        buyer:profiles!offers_buyer_id_fkey(full_name),
        seller:profiles!offers_seller_id_fkey(full_name)
      `)
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: true });
    if (!error) {
      return (data || []).map((item: any) => ({
        ...item,
        buyer_name: item.buyer?.full_name,
        seller_name: item.seller?.full_name,
      }));
    }
    console.warn('[getOffersForConversation] FK join failed, trying without seller join:', error.message);
  } catch (e: any) {
    console.warn('[getOffersForConversation] FK join exception:', e.message);
  }

  // Fallback: query without seller FK, match by listing + buyer only
  const { data, error } = await supabase
    .from('offers')
    .select(`*, buyer:profiles!offers_buyer_id_fkey(full_name)`)
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((item: any) => ({
    ...item,
    buyer_name: item.buyer?.full_name,
    seller_name: null,
  }));
}



export async function updateOfferStatus(offerId: string, status: OfferStatus, counterAmount?: number): Promise<Offer> {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (counterAmount !== undefined) updates.counter_amount = counterAmount;
  const { data, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', offerId)
    .select()
    .single();
  if (error) throw error;
  return data as Offer;
}



/**
 * Accept an offer and create a pending order in one step.
 * Called when seller accepts a buyer's offer or buyer accepts a counter.
 * Returns the accepted offer and the created pending order.
 */
export async function acceptOfferAndCreateOrder(
  offerId: string,
  listing: Listing,
  buyerId: string,
  sellerId: string,
  agreedAmount: number
): Promise<{ offer: Offer; order: Order }> {
  // Step 1: Update offer status to 'accepted'
  const updatedOffer = await updateOfferStatus(offerId, 'accepted');

  // Step 2: Cancel any existing pending orders for this listing+buyer
  await supabase
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('listing_id', listing.id)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending');

  // Step 3: Calculate service fee
  const serviceFee = Math.round(agreedAmount * 0.025);
  const total = agreedAmount + serviceFee;

  // Step 4: Create a pending order with the offer amount
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      listing_id: listing.id,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: agreedAmount,
      service_fee: serviceFee,
      total: total,
      payment_method: 'online',

      status: 'pending',
      offer_id: offerId,
    })
    .select()
    .single();

  if (orderError) {
    console.error('[acceptOfferAndCreateOrder] Order creation failed:', orderError);
    throw new Error('Offer accepted but failed to create order: ' + orderError.message);
  }

  // Step 5: Send notification to buyer
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        action: 'notify-offer-accepted',
        user_id: buyerId,
        offer_id: offerId,
        listing_id: listing.id,
        listing_title: listing.title,
        amount: agreedAmount,
        order_id: order.id,
      },
    });
  } catch (notifErr) {
    console.warn('[acceptOfferAndCreateOrder] Notification failed (non-fatal):', notifErr);
  }

  return { offer: updatedOffer, order: order as Order };
}

/**
 * Complete an offer after payment succeeds.
 * Updates offer to 'completed' and order to 'paid', marks listing as 'sold'.
 */
export async function completeOfferAfterPayment(
  offerId: string,
  orderId: string,
  listingId: string
): Promise<void> {
  // Update offer to completed
  await supabase
    .from('offers')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', offerId);

  // Update order to paid
  await supabase
    .from('orders')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  // Mark listing as sold
  await supabase
    .from('listings')
    .update({ status: 'sold', updated_at: new Date().toISOString() })
    .eq('id', listingId);
}

export async function getPendingOffersCount(listingId: string, buyerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending');
  if (error) return 0;
  return count || 0;
}

/**
 * Get the pending order associated with an accepted offer.
 */
export async function getOrderForOffer(offerId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('offer_id', offerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as Order;
}
