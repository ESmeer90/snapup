import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/types';
import { toast } from '@/components/ui/use-toast';

const LOCAL_CART_KEY = 'snapup_local_cart';
const LOCAL_WISHLIST_KEY = 'snapup_local_wishlist';

export interface CartItem {
  id: string;
  listing_id: string;
  quantity: number;
  added_at: string;
  listing?: Listing & {
    seller_name?: string;
    seller_avatar?: string;
    category_name?: string;
  };
}

export interface WishlistItem {
  id: string;
  listing_id: string;
  notes?: string;
  added_at: string;
  listing?: Listing & {
    seller_name?: string;
    seller_avatar?: string;
    category_name?: string;
  };
}

interface CartContextType {
  cartItems: CartItem[];
  wishlistItems: WishlistItem[];
  cartCount: number;
  wishlistCount: number;
  cartTotal: number;
  cartLoading: boolean;
  wishlistLoading: boolean;
  addToCart: (listingId: string) => Promise<void>;
  removeFromCart: (listingId: string) => Promise<void>;
  updateCartQuantity: (listingId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (listingId: string) => boolean;
  addToWishlist: (listingId: string, notes?: string) => Promise<void>;
  removeFromWishlist: (listingId: string) => Promise<void>;
  isInWishlist: (listingId: string) => boolean;
  moveToCart: (listingId: string) => Promise<void>;
  moveToWishlist: (listingId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

// ─── Helper: ensure fresh session before DB operations ───
async function ensureFreshSession(): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      // No session at all — try refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData?.session) {
        return { valid: false, reason: 'no_session' };
      }
      return { valid: true };
    }

    // Check if token expires within 60 seconds
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (expiresAt - nowSec < 60) {
        console.log('[Cart] Token expiring soon, refreshing...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[Cart] Proactive refresh failed:', refreshError.message);
          // Token might still be valid for a few more seconds, continue
        }
      }
    }

    return { valid: true };
  } catch (err: any) {
    console.warn('[Cart] ensureFreshSession error:', err.message);
    return { valid: false, reason: 'error' };
  }
}

// ─── Helper: categorize Supabase errors ───
function categorizeError(err: any): { type: 'auth' | 'rls' | 'missing_table' | 'network' | 'unknown'; message: string } {
  const msg = (err?.message || err?.error_description || String(err)).toLowerCase();
  const code = err?.code || '';

  if (msg.includes('jwt') || msg.includes('token') || msg.includes('session') || msg.includes('expired') || msg.includes('unauthorized') || code === '401' || code === 'PGRST301') {
    return { type: 'auth', message: 'Your session has expired. Please sign in again.' };
  }
  if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy') || msg.includes('permission denied') || code === '42501') {
    return { type: 'rls', message: 'Permission denied. Please sign out and sign back in.' };
  }
  if (msg.includes('relation') && msg.includes('does not exist') || msg.includes('42P01') || code === '42P01') {
    return { type: 'missing_table', message: 'Cart service is temporarily unavailable. Your items are saved locally.' };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout')) {
    return { type: 'network', message: 'Network error. Your items are saved locally and will sync when you\'re back online.' };
  }
  return { type: 'unknown', message: 'Something went wrong. Please try again.' };
}

// ─── Helper: localStorage cart operations ───
function getLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setLocalCart(items: CartItem[]) {
  try { localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items)); } catch {}
}

function getLocalWishlist(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setLocalWishlist(items: WishlistItem[]) {
  try { localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items)); } catch {}
}

// ─── Helper: enrich local cart items with listing data ───
async function enrichLocalItems<T extends { listing_id: string }>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const ids = items.map(i => i.listing_id);
  try {
    const { data } = await supabase
      .from('listings')
      .select('id, user_id, title, description, price, condition, location, province, images, status, view_count, is_negotiable, created_at, updated_at, category_id, profiles!listings_user_id_fkey(full_name, avatar_url), categories!listings_category_id_fkey(name, slug, icon)')
      .in('id', ids);
    if (!data) return items;
    const listingMap = new Map(data.map((l: any) => [l.id, {
      ...l,
      seller_name: l.profiles?.full_name,
      seller_avatar: l.profiles?.avatar_url,
      category_name: l.categories?.name,
    }]));
    return items.map(item => ({ ...item, listing: listingMap.get(item.listing_id) }));
  } catch {
    return items;
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load cart items (DB-first, localStorage fallback) ───
  const refreshCart = useCallback(async () => {
    if (!user) {
      // Load from localStorage for non-authenticated browsing
      const local = getLocalCart();
      if (local.length > 0) {
        const enriched = await enrichLocalItems(local);
        if (mountedRef.current) setCartItems(enriched);
      } else {
        setCartItems([]);
      }
      return;
    }

    setCartLoading(true);
    try {
      // Ensure session is fresh before querying
      await ensureFreshSession();

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id, listing_id, quantity, added_at,
          listings!cart_items_listing_id_fkey(
            id, user_id, title, description, price, condition, location, province,
            images, status, view_count, is_negotiable, created_at, updated_at, category_id,
            profiles!listings_user_id_fkey(full_name, avatar_url),
            categories!listings_category_id_fkey(name, slug, icon)
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        const cat = categorizeError(error);
        console.warn('[Cart] DB load failed:', cat.type, error.message);

        if (cat.type === 'missing_table' || cat.type === 'network') {
          setUseLocalFallback(true);
          const local = getLocalCart();
          const enriched = await enrichLocalItems(local);
          if (mountedRef.current) setCartItems(enriched);
          return;
        }
        // For auth/rls errors, try localStorage too
        if (cat.type === 'auth' || cat.type === 'rls') {
          const local = getLocalCart();
          if (local.length > 0) {
            const enriched = await enrichLocalItems(local);
            if (mountedRef.current) setCartItems(enriched);
          }
          return;
        }
        throw error;
      }

      if (!mountedRef.current) return;
      setUseLocalFallback(false);

      const mapped: CartItem[] = (data || []).map((item: any) => {
        const l = item.listings;
        return {
          id: item.id,
          listing_id: item.listing_id,
          quantity: item.quantity,
          added_at: item.added_at,
          listing: l ? {
            ...l,
            seller_name: l.profiles?.full_name,
            seller_avatar: l.profiles?.avatar_url,
            category_name: l.categories?.name,
          } : undefined,
        };
      });
      setCartItems(mapped);
      // Sync to localStorage as backup
      setLocalCart(mapped);
    } catch (err: any) {
      console.error('[Cart] Failed to load cart:', err);
      // Fall back to localStorage
      const local = getLocalCart();
      if (local.length > 0) {
        const enriched = await enrichLocalItems(local);
        if (mountedRef.current) setCartItems(enriched);
      }
    } finally {
      if (mountedRef.current) setCartLoading(false);
    }
  }, [user]);

  // ─── Load wishlist items ───
  const refreshWishlist = useCallback(async () => {
    if (!user) { setWishlistItems([]); return; }
    setWishlistLoading(true);
    try {
      await ensureFreshSession();

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id, listing_id, notes, added_at,
          listings!wishlists_listing_id_fkey(
            id, user_id, title, description, price, condition, location, province,
            images, status, view_count, is_negotiable, created_at, updated_at, category_id,
            profiles!listings_user_id_fkey(full_name, avatar_url),
            categories!listings_category_id_fkey(name, slug, icon)
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.warn('[Wishlist] DB load failed:', error.message);
        // Fall back to local
        const local = getLocalWishlist();
        if (local.length > 0) {
          const enriched = await enrichLocalItems(local);
          if (mountedRef.current) setWishlistItems(enriched);
        }
        return;
      }
      if (!mountedRef.current) return;

      const mapped: WishlistItem[] = (data || []).map((item: any) => {
        const l = item.listings;
        return {
          id: item.id,
          listing_id: item.listing_id,
          notes: item.notes,
          added_at: item.added_at,
          listing: l ? {
            ...l,
            seller_name: l.profiles?.full_name,
            seller_avatar: l.profiles?.avatar_url,
            category_name: l.categories?.name,
          } : undefined,
        };
      });
      setWishlistItems(mapped);
      setLocalWishlist(mapped);
    } catch (err: any) {
      console.error('[Wishlist] Failed to load:', err);
      const local = getLocalWishlist();
      if (local.length > 0) {
        const enriched = await enrichLocalItems(local);
        if (mountedRef.current) setWishlistItems(enriched);
      }
    } finally {
      if (mountedRef.current) setWishlistLoading(false);
    }
  }, [user]);

  // Load on user change
  useEffect(() => {
    refreshCart();
    refreshWishlist();
  }, [user, refreshCart, refreshWishlist]);

  // Realtime subscription for cart
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('cart-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` }, () => {
        refreshCart();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refreshCart]);

  // Realtime subscription for wishlist
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wishlist-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists', filter: `user_id=eq.${user.id}` }, () => {
        refreshWishlist();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refreshWishlist]);

  // ─── Add to Cart ───
  const addToCart = useCallback(async (listingId: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to add items to your cart.', variant: 'destructive' });
      return;
    }

    try {
      // Step 1: Refresh session proactively
      const sessionCheck = await ensureFreshSession();
      if (!sessionCheck.valid) {
        // Try localStorage fallback
        addToLocalCart(listingId);
        toast({ title: 'Added to Cart (offline)', description: 'Item saved locally. Sign in again to sync.' });
        return;
      }

      // Step 2: Validate listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, status, user_id, title')
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        toast({ title: 'Error', description: 'Listing not found or unavailable.', variant: 'destructive' });
        return;
      }
      if (listing.status !== 'active') {
        toast({ title: 'Unavailable', description: 'This listing is no longer available.', variant: 'destructive' });
        return;
      }
      if (listing.user_id === user.id) {
        toast({ title: 'Error', description: 'You cannot add your own listing to cart.', variant: 'destructive' });
        return;
      }

      // Step 3: Try DB upsert
      let dbSuccess = false;
      try {
        const { error: upsertError } = await supabase
          .from('cart_items')
          .upsert(
            { user_id: user.id, listing_id: listingId, quantity: 1 },
            { onConflict: 'user_id,listing_id' }
          );

        if (upsertError) {
          console.warn('[Cart] Upsert failed:', upsertError.message, '| Code:', upsertError.code);

          // Fallback: check-then-insert/update
          const { data: existing } = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('user_id', user.id)
            .eq('listing_id', listingId)
            .maybeSingle();

          if (existing) {
            const { error: updateError } = await supabase
              .from('cart_items')
              .update({ quantity: existing.quantity + 1 })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('cart_items')
              .insert({ user_id: user.id, listing_id: listingId, quantity: 1 });
            if (insertError) throw insertError;
          }
        }
        dbSuccess = true;
      } catch (dbErr: any) {
        const cat = categorizeError(dbErr);
        console.warn('[Cart] DB add failed:', cat.type, dbErr.message);

        if (cat.type === 'auth') {
          // Try one more session refresh
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr) {
            // Retry once
            try {
              const { error: retryErr } = await supabase
                .from('cart_items')
                .insert({ user_id: user.id, listing_id: listingId, quantity: 1 });
              if (!retryErr) {
                dbSuccess = true;
              }
            } catch {}
          }
        }

        if (!dbSuccess) {
          // Fall back to localStorage
          addToLocalCart(listingId, listing.title);
          toast({
            title: 'Added to Cart',
            description: cat.type === 'auth'
              ? `"${listing.title}" saved locally. Please sign in again to sync.`
              : cat.type === 'rls'
              ? `"${listing.title}" saved locally. Try signing out and back in.`
              : cat.type === 'missing_table'
              ? `"${listing.title}" saved locally. Cart service is being set up.`
              : `"${listing.title}" saved locally.`,
          });
          refreshCart();
          return;
        }
      }

      if (dbSuccess) {
        // Also save to localStorage as backup
        addToLocalCart(listingId, listing.title);
        toast({ title: 'Added to Cart', description: `"${listing.title}" added to your cart` });
        refreshCart();
      }
    } catch (err: any) {
      console.error('[Cart] addToCart error:', err);
      const cat = categorizeError(err);
      toast({ title: 'Error', description: cat.message, variant: 'destructive' });
    }
  }, [user, refreshCart]);

  // ─── Local cart helper ───
  function addToLocalCart(listingId: string, title?: string) {
    const local = getLocalCart();
    const existing = local.find(i => i.listing_id === listingId);
    if (existing) {
      existing.quantity += 1;
    } else {
      local.push({
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        listing_id: listingId,
        quantity: 1,
        added_at: new Date().toISOString(),
      });
    }
    setLocalCart(local);
  }

  const removeFromCart = useCallback(async (listingId: string) => {
    if (!user) return;
    try {
      await ensureFreshSession();
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);
      if (error) {
        console.warn('[Cart] DB remove failed:', error.message);
      }
    } catch (err: any) {
      console.warn('[Cart] Remove error:', err.message);
    }
    // Always update local state + localStorage
    setCartItems(prev => prev.filter(i => i.listing_id !== listingId));
    const local = getLocalCart().filter(i => i.listing_id !== listingId);
    setLocalCart(local);
  }, [user]);

  const updateCartQuantity = useCallback(async (listingId: string, quantity: number) => {
    if (!user || quantity < 1) return;
    try {
      await ensureFreshSession();
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', user.id)
        .eq('listing_id', listingId);
      if (error) console.warn('[Cart] DB update qty failed:', error.message);
    } catch (err: any) {
      console.warn('[Cart] Update qty error:', err.message);
    }
    // Always update local state
    setCartItems(prev => prev.map(i => i.listing_id === listingId ? { ...i, quantity } : i));
    const local = getLocalCart();
    const localItem = local.find(i => i.listing_id === listingId);
    if (localItem) { localItem.quantity = quantity; setLocalCart(local); }
  }, [user]);

  const clearCart = useCallback(async () => {
    if (!user) return;
    try {
      await ensureFreshSession();
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
      if (error) console.warn('[Cart] DB clear failed:', error.message);
    } catch (err: any) {
      console.warn('[Cart] Clear error:', err.message);
    }
    setCartItems([]);
    setLocalCart([]);
  }, [user]);

  const isInCart = useCallback((listingId: string) => {
    return cartItems.some(i => i.listing_id === listingId);
  }, [cartItems]);

  // ─── Wishlist operations ───
  const addToWishlist = useCallback(async (listingId: string, notes?: string) => {
    if (!user) return;
    try {
      await ensureFreshSession();

      const { data: listing } = await supabase
        .from('listings')
        .select('id, title, user_id')
        .eq('id', listingId)
        .single();

      if (!listing) { toast({ title: 'Error', description: 'Listing not found', variant: 'destructive' }); return; }
      if (listing.user_id === user.id) { toast({ title: 'Error', description: 'You cannot wishlist your own listing', variant: 'destructive' }); return; }

      const { error } = await supabase
        .from('wishlists')
        .upsert({ user_id: user.id, listing_id: listingId, notes }, { onConflict: 'user_id,listing_id' });

      if (error) {
        console.warn('[Wishlist] Upsert failed:', error.message);
        // Try plain insert
        const { error: insertErr } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id, listing_id: listingId, notes });
        if (insertErr && !insertErr.message?.includes('duplicate')) {
          throw insertErr;
        }
      }

      toast({ title: 'Added to Wishlist', description: `"${listing.title}" saved to your wishlist` });
      refreshWishlist();
    } catch (err: any) {
      console.error('[Wishlist] Add error:', err);
      const cat = categorizeError(err);
      toast({ title: 'Error', description: cat.message, variant: 'destructive' });
    }
  }, [user, refreshWishlist]);

  const removeFromWishlist = useCallback(async (listingId: string) => {
    if (!user) return;
    try {
      await ensureFreshSession();
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);
      if (error) console.warn('[Wishlist] Remove error:', error.message);
    } catch (err: any) {
      console.warn('[Wishlist] Remove error:', err.message);
    }
    setWishlistItems(prev => prev.filter(i => i.listing_id !== listingId));
    const local = getLocalWishlist().filter(i => i.listing_id !== listingId);
    setLocalWishlist(local);
  }, [user]);

  const isInWishlist = useCallback((listingId: string) => {
    return wishlistItems.some(i => i.listing_id === listingId);
  }, [wishlistItems]);

  const moveToCart = useCallback(async (listingId: string) => {
    if (!user) return;
    await addToCart(listingId);
    await removeFromWishlist(listingId);
    toast({ title: 'Moved to Cart', description: 'Item moved from wishlist to cart' });
  }, [user, addToCart, removeFromWishlist]);

  const moveToWishlist = useCallback(async (listingId: string) => {
    if (!user) return;
    await addToWishlist(listingId);
    await removeFromCart(listingId);
    toast({ title: 'Saved for Later', description: 'Item moved to wishlist' });
  }, [user, addToWishlist, removeFromCart]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlistItems.length;
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = typeof item.listing?.price === 'number' ? item.listing.price : 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems, wishlistItems, cartCount, wishlistCount, cartTotal,
      cartLoading, wishlistLoading,
      addToCart, removeFromCart, updateCartQuantity, clearCart, isInCart,
      addToWishlist, removeFromWishlist, isInWishlist,
      moveToCart, moveToWishlist, refreshCart, refreshWishlist,
    }}>
      {children}
    </CartContext.Provider>
  );
};
