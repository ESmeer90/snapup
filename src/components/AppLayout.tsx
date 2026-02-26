import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getListings, getCategories, getFavorites, toggleFavorite, formatZAR, timeAgo } from '@/lib/api';
import type { Listing, Category } from '@/types';
import { toast } from '@/components/ui/use-toast';
import ErrorBoundary from '@/components/snapup/ErrorBoundary';
import SEOHead from '@/components/snapup/SEOHead';
import PWAInstallBanner from '@/components/snapup/PWAInstallBanner';
import OfflineIndicator from '@/components/snapup/OfflineIndicator';
import AppUpdateBanner from '@/components/snapup/AppUpdateBanner';
import SessionExpiredBanner from '@/components/snapup/SessionExpiredBanner';
import { cacheListing } from '@/lib/offline-db';


import PullToRefresh from '@/components/snapup/PullToRefresh';



import Header from '@/components/snapup/Header';
import Hero from '@/components/snapup/Hero';
import ListingsGrid from '@/components/snapup/ListingsGrid';
import ListingDetail from '@/components/snapup/ListingDetail';
import AuthModal from '@/components/snapup/AuthModal';
import CreateListingModal from '@/components/snapup/CreateListingModal';

import CTABanner from '@/components/snapup/CTABanner';
import Footer from '@/components/snapup/Footer';

import MyListings from '@/components/snapup/MyListings';
import MessagesView from '@/components/snapup/MessagesView';
import FavoritesView from '@/components/snapup/FavoritesView';
import OrdersView from '@/components/snapup/OrdersView';
import TransactionsView from '@/components/snapup/TransactionsView';
import SellerDashboard from '@/components/snapup/SellerDashboard';
import UserProfileView from '@/components/snapup/UserProfileView';
import PriceAlertsView from '@/components/snapup/PriceAlertsView';
import SellerReviewsView from '@/components/snapup/SellerReviewsView';
import SavedSearchesView from '@/components/snapup/SavedSearchesView';
import NotificationsView from '@/components/snapup/NotificationsView';
import WishlistView from '@/components/snapup/WishlistView';
import CartView from '@/components/snapup/CartView';
import BottomNav from '@/components/snapup/BottomNav';


import POPIAConsentBanner from '@/components/snapup/POPIAConsentBanner';
import OrderStatusNotifier from '@/components/snapup/OrderStatusNotifier';
import {
  ShoppingBag, Filter, Receipt, Package as PackageIcon, BarChart3, MessageSquare, User, Heart, Loader2, BellRing, Bookmark, Star, ShoppingCart
} from 'lucide-react';

// ============ URL QUERY PARAMS HELPERS ============
function getQueryParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function setQueryParams(params: Record<string, string>) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.replaceState({}, '', url.toString());
}

function readInitialParam(key: string, fallback: string = ''): string {
  return getQueryParams().get(key) || fallback;
}

// ============ VIEW TYPE ============
type AppView = 'home' | 'favorites' | 'my-listings' | 'messages' | 'transactions' | 'orders' | 'dashboard' | 'profile' | 'price-alerts' | 'seller-reviews' | 'saved-searches' | 'notifications' | 'wishlist' | 'cart';


// ============ MAIN APP LAYOUT ============
const AppLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(true);

  const PAGE_SIZE = 24;

  // Initialize filter state from URL query params
  const [searchQuery, setSearchQuery] = useState(() => readInitialParam('q'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => readInitialParam('cat') || null);
  const [selectedProvince, setSelectedProvince] = useState(() => readInitialParam('province', 'Northern Cape'));
  const [sortBy, setSortBy] = useState(() => readInitialParam('sort', 'newest'));
  const [minPrice, setMinPrice] = useState(() => readInitialParam('min_price'));
  const [maxPrice, setMaxPrice] = useState(() => readInitialParam('max_price'));
  const [selectedCondition, setSelectedCondition] = useState(() => readInitialParam('condition'));

  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({ open: false, mode: 'signin' });
  const [createListingOpen, setCreateListingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialChat, setInitialChat] = useState<{ listingId: string; sellerId: string; sellerName: string; listingTitle: string; listingImage?: string } | null>(null);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | undefined>(undefined);



  // Seller reviews state
  const [reviewsSellerId, setReviewsSellerId] = useState<string>('');
  const [reviewsSellerName, setReviewsSellerName] = useState<string>('');

  // Debounce ref for price filters

  const priceDebounceRef = useRef<NodeJS.Timeout | null>(null);






  // Hide hero when filters are active
  useEffect(() => {
    const hasFilters = searchQuery || selectedCategory || minPrice || maxPrice || selectedCondition;
    setShowHero(!hasFilters);
  }, [searchQuery, selectedCategory, minPrice, maxPrice, selectedCondition]);

  // Persist filter state to URL query params whenever they change
  useEffect(() => {
    setQueryParams({
      q: searchQuery,
      cat: selectedCategory || '',
      province: selectedProvince === 'Northern Cape' ? '' : selectedProvince,
      sort: sortBy === 'newest' ? '' : sortBy,
      min_price: minPrice,
      max_price: maxPrice,
      condition: selectedCondition,
    });
  }, [searchQuery, selectedCategory, selectedProvince, sortBy, minPrice, maxPrice, selectedCondition]);

  // Load categories
  useEffect(() => {
    getCategories().then(setCategories).catch((err) => {
      console.error('Failed to load categories:', err);
    });
  }, []);

  // Load favorites
  useEffect(() => {
    if (user) {
      getFavorites(user.id).then(setFavorites).catch((err) => {
        console.error('Failed to load favorites:', err);
      });
    } else {
      setFavorites([]);
    }
  }, [user]);

  // Load listings with filters (debounced for price) - reset on filter change
  useEffect(() => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      loadListings(true);
    }, minPrice || maxPrice ? 500 : 0);
    return () => { if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current); };
  }, [searchQuery, selectedCategory, selectedProvince, sortBy, refreshTrigger, minPrice, maxPrice, selectedCondition]);

  const loadListings = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setListingsError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const offset = reset ? 0 : listings.length;
      const data = await getListings({
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        province: selectedProvince || undefined,
        sortBy: sortBy,
        limit: PAGE_SIZE,
        offset: offset,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        condition: selectedCondition || undefined,
      });
      if (reset) {
        setListings(data);
      } else {
        setListings(prev => [...prev, ...data]);
      }
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err: any) {
      if (reset) {
        setListingsError(err.message || 'Failed to load listings. Please try again.');
        setListings([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadListings(false);
    }
  };

  // Pull-to-refresh handler - returns a Promise for the PullToRefresh component
  const handlePullRefresh = useCallback(async () => {
    setListingsError(null);
    try {
      const data = await getListings({
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        province: selectedProvince || undefined,
        sortBy: sortBy,
        limit: PAGE_SIZE,
        offset: 0,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        condition: selectedCondition || undefined,
      });
      setListings(data);
      setHasMore(data.length >= PAGE_SIZE);
      toast({ title: 'Refreshed', description: 'Listings updated with the latest results.' });
    } catch (err: any) {
      setListingsError(err.message || 'Failed to refresh listings.');
      toast({ title: 'Refresh failed', description: 'Could not refresh listings. Please try again.', variant: 'destructive' });
    }
  }, [searchQuery, selectedCategory, selectedProvince, sortBy, minPrice, maxPrice, selectedCondition]);



  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (currentView !== 'home') setCurrentView('home');
  };

  const handleSelectCategory = (catId: string | null) => {
    setSelectedCategory(catId);
    setCurrentView('home');
  };

  const handleSelectProvince = (province: string) => {
    setSelectedProvince(province);
    setCurrentView('home');
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedProvince('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCondition('');
    setSortBy('newest');
  };

  const handleToggleFavorite = async (listingId: string) => {
    if (!user) {
      setAuthModal({ open: true, mode: 'signin' });
      return;
    }
    const isFav = favorites.includes(listingId);
    setFavorites((prev) => isFav ? prev.filter((id) => id !== listingId) : [...prev, listingId]);
    try {
      await toggleFavorite(user.id, listingId, isFav);
    } catch {
      setFavorites((prev) => isFav ? [...prev, listingId] : prev.filter((id) => id !== listingId));
      toast({ title: 'Error', description: 'Failed to update favorites. Please try again.', variant: 'destructive' });
    }
  };

  const handleOpenCreateListing = () => {
    if (!user) {
      setAuthModal({ open: true, mode: 'signin' });
      return;
    }
    setCreateListingOpen(true);
  };



  const handleStartChat = (listing: Listing) => {
    if (!user) {
      setAuthModal({ open: true, mode: 'signin' });
      return;
    }
    if (user.id === listing.user_id) {
      toast({ title: 'Info', description: 'This is your own listing' });
      return;
    }
    setInitialChat({
      listingId: listing.id,
      sellerId: listing.user_id,
      sellerName: listing.seller_name || 'Seller',
      listingTitle: listing.title,
      listingImage: listing.images?.[0],
    });
    setSelectedListing(null);
    setCurrentView('messages');
  };

  const handleViewChange = (view: string) => {
    if (view === 'profile') {
      setViewProfileUserId(undefined);
    }
    setCurrentView(view as AppView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewSellerProfile = (userId: string) => {
    setViewProfileUserId(userId);
    setCurrentView('profile');
    setSelectedListing(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewSellerReviews = (sellerId: string, sellerName: string) => {
    setReviewsSellerId(sellerId);
    setReviewsSellerName(sellerName);
    setCurrentView('seller-reviews');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplySavedSearch = (params: { query?: string; category?: string; province?: string; minPrice?: string; maxPrice?: string; condition?: string }) => {
    if (params.query !== undefined) setSearchQuery(params.query || '');
    if (params.category !== undefined) setSelectedCategory(params.category || null);
    if (params.province !== undefined) setSelectedProvince(params.province || '');
    if (params.minPrice !== undefined) setMinPrice(params.minPrice || '');
    if (params.maxPrice !== undefined) setMaxPrice(params.maxPrice || '');
    if (params.condition !== undefined) setSelectedCondition(params.condition || '');
    setCurrentView('home');
  };

  const getCategoryName = () => selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name || '' : '';
  const isHome = currentView === 'home';

  const requiresAuth = currentView !== 'home';
  const showAuthPrompt = requiresAuth && !user && !authLoading;

  // Dynamic SEO based on current view + selected listing
  const seoConfig = useMemo(() => {
    // If a listing is selected, use listing-specific OG data
    if (selectedListing) {
      try {
        const conditionLabel = selectedListing.condition === 'new' ? 'Brand New' :
                                selectedListing.condition === 'like_new' ? 'Like New' :
                                selectedListing.condition === 'good' ? 'Good' :
                                selectedListing.condition === 'fair' ? 'Fair' : 'Used';
        const price = formatZAR(selectedListing.price ?? 0);
        const listingImage = selectedListing.images?.[0] || '';
        const desc = selectedListing.description
          ? selectedListing.description.substring(0, 150) + (selectedListing.description.length > 150 ? '...' : '')
          : '';

        // Safely get price for JSON-LD (avoid .toFixed on null/undefined)
        const numericPrice = typeof selectedListing.price === 'number' ? selectedListing.price : 0;

        return {
          title: `${selectedListing.title || 'Listing'} - ${price}`,
          description: `${price} · ${conditionLabel}${selectedListing.category_name ? ' · ' + selectedListing.category_name : ''} · ${selectedListing.province || selectedListing.location || 'South Africa'}${desc ? ' — ' + desc : ''}`,
          canonical: `/?listing=${selectedListing.id}`,
          ogTitle: `${selectedListing.title || 'Listing'} - ${price} | SnapUp`,
          ogDescription: `${price} · ${conditionLabel} · ${selectedListing.province || 'South Africa'}${desc ? ' — ' + desc : ''}`,
          ogImage: listingImage,
          ogType: 'product',
          ogUrl: `/?listing=${selectedListing.id}`,
          noIndex: false,
          jsonLd: {
            '@type': 'Product',
            name: selectedListing.title || 'Listing',
            description: selectedListing.description || '',
            image: listingImage,
            url: `https://snapup.co.za/?listing=${selectedListing.id}`,
            ...(selectedListing.category_name ? { category: selectedListing.category_name } : {}),
            itemCondition: selectedListing.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
            offers: {
              '@type': 'Offer',
              price: numericPrice.toFixed(2),
              priceCurrency: 'ZAR',
              availability: selectedListing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              seller: {
                '@type': 'Person',
                name: selectedListing.seller_name || 'Seller',
              },
            },
          },
        };
      } catch (seoErr) {
        console.error('[AppLayout] SEO config error for listing:', seoErr, selectedListing?.id);
        // Return safe fallback instead of crashing
        return {
          title: selectedListing.title || 'Listing',
          description: 'View listing on SnapUp marketplace',
          canonical: `/?listing=${selectedListing.id}`,
          ogTitle: undefined, ogDescription: undefined, ogImage: undefined,
          ogType: undefined, ogUrl: undefined, noIndex: false, jsonLd: undefined,
        };
      }
    }

    const viewSEO: Record<string, { title: string; description: string; canonical: string }> = {
      home: {
        title: 'Buy & Sell in South Africa',
        description: "South Africa's trusted online marketplace. Browse electronics, vehicles, fashion, furniture and more. Buyer protection up to R5,000, POPIA compliant.",
        canonical: '/',

      },
      favorites: {
        title: 'My Saved Items',
        description: 'View your saved and favourited listings on SnapUp marketplace.',
        canonical: '/',
      },
      'my-listings': {
        title: 'My Listings',
        description: 'Manage your listings on SnapUp marketplace. Edit, promote, or remove your items for sale.',
        canonical: '/',
      },
      messages: {
        title: 'Messages',
        description: 'Chat with buyers and sellers on SnapUp. Negotiate deals and arrange deliveries securely.',
        canonical: '/',
      },
      transactions: {
        title: 'Transactions',
        description: 'View your transaction history on SnapUp. Track payments, refunds, and earnings.',
        canonical: '/',
      },
      orders: {
        title: 'My Orders',
        description: 'Track your orders on SnapUp. View order status, shipping updates, and delivery confirmations.',
        canonical: '/',
      },
      dashboard: {
        title: 'Seller Dashboard',
        description: 'Your SnapUp seller dashboard. View sales analytics, earnings, and performance metrics.',
        canonical: '/',
      },
      profile: {
        title: 'My Profile',
        description: 'View and manage your SnapUp profile. Update your details and view your seller reputation.',
        canonical: '/',
      },
      'price-alerts': {
        title: 'Price Alerts',
        description: 'Manage your price alerts on SnapUp. Get notified when items drop to your target price.',
        canonical: '/',
      },
      'seller-reviews': {
        title: 'Seller Reviews',
        description: 'View seller reviews and ratings on SnapUp marketplace.',
        canonical: '/',
      },
      'saved-searches': {
        title: 'Saved Searches',
        description: 'Manage your saved searches on SnapUp. Quickly re-run your favourite search filters.',
        canonical: '/',
      },
      notifications: {
        title: 'Notifications',
        description: 'View all your notifications on SnapUp. Messages, order updates, price drops, and offers.',
        canonical: '/',
      },
    };


    const config = viewSEO[currentView] || viewSEO.home;

    // Add search query context to home page SEO
    if (currentView === 'home' && searchQuery) {
      config.title = `Search: "${searchQuery}" - SnapUp`;
      config.description = `Search results for "${searchQuery}" on SnapUp marketplace. Find the best deals in South Africa.`;
    }
    if (currentView === 'home' && selectedCategory) {
      const catName = getCategoryName();
      if (catName) {
        config.title = `${catName} for Sale in South Africa`;
        config.description = `Browse ${catName.toLowerCase()} for sale on SnapUp. Find great deals from sellers across South Africa.`;
      }
    }

    return { ...config, ogTitle: undefined, ogDescription: undefined, ogImage: undefined, ogType: undefined, ogUrl: undefined, noIndex: currentView !== 'home', jsonLd: undefined };
  }, [currentView, searchQuery, selectedCategory, getCategoryName, selectedListing]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEOHead
        title={seoConfig.title}
        description={seoConfig.description}
        canonical={seoConfig.canonical}
        ogTitle={(seoConfig as any).ogTitle}
        ogDescription={(seoConfig as any).ogDescription}
        ogImage={(seoConfig as any).ogImage}
        ogType={(seoConfig as any).ogType}
        ogUrl={(seoConfig as any).ogUrl || seoConfig.canonical}
        noIndex={(seoConfig as any).noIndex ?? (currentView !== 'home')}
        jsonLd={(seoConfig as any).jsonLd}
      />


      <Header
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenCreateListing={handleOpenCreateListing}
        onSearch={handleSearch}
        onViewChange={handleViewChange}
        currentView={currentView}
        searchQuery={searchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Global Session Expired Banner - shows at top when session expires */}
      <SessionExpiredBanner variant="global" />


      {/* Secondary Nav for logged-in users (desktop) */}
      {user && (
        <div className="bg-white border-b border-gray-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-1 overflow-x-auto py-2 -mx-1">
              {[
                { id: 'home', label: 'Browse', icon: <ShoppingBag className="w-4 h-4" /> },
                { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
                { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'my-listings', label: 'My Listings', icon: <Filter className="w-4 h-4" /> },
                { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
                { id: 'cart', label: 'Cart', icon: <ShoppingCart className="w-4 h-4" /> },
                { id: 'wishlist', label: 'Wishlist', icon: <Heart className="w-4 h-4" /> },
                { id: 'favorites', label: 'Saved', icon: <Heart className="w-4 h-4" /> },
                { id: 'saved-searches', label: 'Saved Searches', icon: <Bookmark className="w-4 h-4" /> },
                { id: 'price-alerts', label: 'Price Alerts', icon: <BellRing className="w-4 h-4" /> },
                { id: 'orders', label: 'Orders', icon: <PackageIcon className="w-4 h-4" /> },
                { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleViewChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    currentView === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


      <main className="flex-1 pb-20 md:pb-0">
        {authLoading && currentView !== 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading...</p>
          </div>
        )}

        {/* Home View - Marketplace-first layout with pull-to-refresh */}
        {isHome && (
          <PullToRefresh onRefresh={handlePullRefresh} disabled={loading}>
            {/* Slim Hero Banner - only when no active filters */}
            {showHero && (
              <Hero
                onSearch={handleSearch}
                onOpenAuth={() => setAuthModal({ open: true, mode: 'signup' })}
                isLoggedIn={!!user}
                onOpenCreateListing={handleOpenCreateListing}
              />
            )}

            {/* Full Product Grid - the main content, immediately visible */}
            <ListingsGrid
              listings={listings}
              loading={loading}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onViewDetail={setSelectedListing}
              isLoggedIn={!!user}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              sortBy={sortBy}
              onSortChange={setSortBy}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              categoryName={getCategoryName()}
              onCategoryChange={handleSelectCategory}
              error={listingsError}
              onRetry={loadListings}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              selectedCondition={selectedCondition}
              onConditionChange={setSelectedCondition}
              onClearAllFilters={handleClearAllFilters}
              onSearchChange={handleSearch}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMore}
              categories={categories}
            />

            {/* CTA at bottom of listings - only when not filtering */}
            {showHero && (
              <CTABanner isLoggedIn={!!user} onOpenAuth={() => setAuthModal({ open: true, mode: 'signup' })} onOpenCreateListing={handleOpenCreateListing} />
            )}
          </PullToRefresh>
        )}




        {/* Authenticated Views */}
        {!authLoading && user && (
          <>
            {currentView === 'dashboard' && <SellerDashboard onViewChange={handleViewChange} />}
            {currentView === 'profile' && (
              <UserProfileView
                profileUserId={viewProfileUserId}
                onViewDetail={setSelectedListing}
                onViewChange={handleViewChange}
                onStartChat={handleStartChat}
                onViewSellerReviews={handleViewSellerReviews}
              />
            )}
            {currentView === 'my-listings' && <MyListings onOpenCreateListing={handleOpenCreateListing} refreshTrigger={refreshTrigger} />}
            {currentView === 'favorites' && <FavoritesView favorites={favorites} onToggleFavorite={handleToggleFavorite} onViewDetail={setSelectedListing} />}
            {currentView === 'messages' && (
              <MessagesView
                initialChat={initialChat}
                onClearInitialChat={() => setInitialChat(null)}
                onViewListing={setSelectedListing}
              />
            )}

            {currentView === 'price-alerts' && (
              <PriceAlertsView onViewListing={setSelectedListing} />
            )}
            {currentView === 'seller-reviews' && reviewsSellerId && (
              <SellerReviewsView
                sellerId={reviewsSellerId}
                sellerName={reviewsSellerName}
                onBack={() => {
                  setCurrentView('profile');
                  setViewProfileUserId(reviewsSellerId);
                }}
              />
            )}
            {currentView === 'saved-searches' && (
              <SavedSearchesView
                onApplySearch={handleApplySavedSearch}
                currentFilters={{
                  searchQuery,
                  selectedCategory,
                  selectedProvince,
                  minPrice,
                  maxPrice,
                  selectedCondition,
                  categoryName: getCategoryName(),
                }}
              />
            )}
            {currentView === 'orders' && <OrdersView />}
            {currentView === 'transactions' && <TransactionsView />}
            {currentView === 'notifications' && <NotificationsView onViewChange={handleViewChange} />}
            {currentView === 'wishlist' && (
              <WishlistView onViewDetail={setSelectedListing} onViewChange={handleViewChange} />
            )}
            {currentView === 'cart' && (
              <CartView
                onViewDetail={setSelectedListing}
                onViewChange={handleViewChange}
                onCheckoutCart={() => {}}
              />
            )}
          </>
        )}

        {/* Auth Required Prompt */}
        {showAuthPrompt && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Sign in to continue</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              You need to be signed in to access this section.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/login" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Sign In</a>
              <a href="/signup" className="px-6 py-3 text-blue-600 font-semibold border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-all">Create Account</a>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <BottomNav
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenCreateListing={handleOpenCreateListing}
      />
      <POPIAConsentBanner />
      <OrderStatusNotifier />
      <OfflineIndicator />
      <PWAInstallBanner />
      <AppUpdateBanner />

      <AuthModal isOpen={authModal.open} onClose={() => setAuthModal({ open: false, mode: 'signin' })} initialMode={authModal.mode} />
      <CreateListingModal isOpen={createListingOpen} onClose={() => setCreateListingOpen(false)} categories={categories} onListingCreated={() => setRefreshTrigger((p) => p + 1)} />

      {/* Listing Detail Modal */}
      <ErrorBoundary fallbackTitle="Listing detail failed to load" onReset={() => setSelectedListing(null)}>
        {selectedListing && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedListing(null)}>
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl my-4 sm:my-8 mx-4" onClick={(e) => e.stopPropagation()}>
              <ListingDetail
                listing={selectedListing}
                onClose={() => setSelectedListing(null)}
                isFavorited={favorites.includes(selectedListing.id)}
                onToggleFavorite={handleToggleFavorite}
                onStartChat={handleStartChat}
                onViewSellerProfile={handleViewSellerProfile}
              />
            </div>
          </div>
        )}
      </ErrorBoundary>

    </div>
  );
};

export default AppLayout;
