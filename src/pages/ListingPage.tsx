import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { getListing, toggleFavorite, getFavorites, incrementViewCount, formatZAR, sendMessage } from '@/lib/api';
import { calculateCommission } from '@/lib/commission';
import type { Listing } from '@/types';
import { CONDITION_LABELS, BUYER_PROTECTION_LIMIT } from '@/types';
import TrustBadge from '@/components/snapup/TrustBadge';
import TrustScoreWidget from '@/components/snapup/TrustScoreWidget';
import PriceAlertModal from '@/components/snapup/PriceAlertModal';
import ShareButton from '@/components/snapup/ShareButton';
import SEOHead from '@/components/snapup/SEOHead';
import ErrorBoundary from '@/components/snapup/ErrorBoundary';
import {
  Heart, MapPin, Clock, Eye, ChevronLeft, ChevronRight,
  MessageSquare, Shield, Send, Loader2, X,
  Wallet, ShoppingBag, ShoppingCart, ExternalLink, CheckCircle2,
  BellRing, Bookmark, AlertTriangle, ArrowLeft, Home
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
];

// ─── Inner component that uses hooks from providers ───
function ListingPageInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [priceAlertOpen, setPriceAlertOpen] = useState(false);

  // Fetch listing
  useEffect(() => {
    if (!id) {
      setError('No listing ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentImage(0);

    getListing(id)
      .then((data) => {
        if (!data) {
          setError('Listing not found. It may have been removed or the link is incorrect.');
        } else {
          setListing(data);
          incrementViewCount(id).catch(() => {});
        }
      })
      .catch((err) => {
        console.error('[ListingPage] Fetch error:', err);
        setError('Failed to load listing. Please check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch favorites
  useEffect(() => {
    if (!user) return;
    getFavorites(user.id)
      .then(setFavorites)
      .catch(() => {});
  }, [user]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user || !listing) return;
    const isFav = favorites.includes(listing.id);
    try {
      await toggleFavorite(user.id, listing.id, isFav);
      setFavorites(prev => isFav ? prev.filter(f => f !== listing.id) : [...prev, listing.id]);
      toast({ title: isFav ? 'Removed from Saved' : 'Saved!', description: isFav ? 'Listing removed from your saved items.' : 'Listing saved to your favorites.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [user, listing, favorites]);

  const handleSendMessage = async () => {
    if (!user || !listing || !message.trim()) return;
    setSendingMessage(true);
    try {
      await sendMessage(listing.id, user.id, listing.user_id, message.trim());
      toast({ title: 'Message sent!', description: 'The seller will be notified.' });
      setMessage('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send message', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageSeller = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to home with chat open for this listing
    navigate(`/?chat=${listing?.id}`);
  };

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleHeader />
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading listing...</p>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleHeader />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Item Not Found</h1>
          <p className="text-gray-500 mb-8">{error || 'This listing could not be found.'}</p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Browse Listings
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Listing loaded ───
  const images = listing.images && listing.images.length > 0 ? listing.images : PLACEHOLDER_IMAGES;
  const commission = calculateCommission(listing.price);
  const isOwnListing = user && user.id === listing.user_id;
  const isFavorited = favorites.includes(listing.id);

  const sellerInitials = listing.seller_name
    ? listing.seller_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'S';

  // SEO config
  const price = formatZAR(listing.price ?? 0);
  const conditionLabel = CONDITION_LABELS[listing.condition] || listing.condition || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={`${listing.title || 'Listing'} - ${price} | SnapUp`}
        description={`${price} · ${conditionLabel} · ${listing.province || 'South Africa'}`}
        ogTitle={`${listing.title || 'Listing'} - ${price} | SnapUp`}
        ogDescription={`${price} · ${conditionLabel} · ${listing.province || 'South Africa'}`}
        ogImage={listing.images?.[0] || ''}
        ogType="product"
        canonical={`/listing/${listing.id}`}
      />

      {/* Header */}
      <SimpleHeader />

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {listing.category_name && (
            <>
              <span className="text-gray-400">{listing.category_name}</span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{listing.title}</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Image Gallery */}
            <div className="relative aspect-square md:aspect-auto md:min-h-[500px] bg-gray-100">
              <img
                src={images[currentImage]}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGES[0]; }}
              />
              {listing.status === 'sold' && (
                <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow-lg">SOLD</div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setCurrentImage(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentImage ? 'bg-white w-6' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="absolute bottom-12 left-3 right-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        i === currentImage ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-6 md:p-8 flex flex-col">
              <div className="flex-1">
                {/* Tags */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {listing.category_name && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{listing.category_name}</span>}
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{conditionLabel}</span>
                  {listing.is_negotiable && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Negotiable</span>}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{listing.title}</h1>
                <p className="text-3xl md:text-4xl font-black text-blue-600 mt-2">{price}</p>

                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{listing.location}, {listing.province}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(listing.created_at).toLocaleDateString('en-ZA')}</span>
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{listing.view_count} views</span>
                </div>

                {/* Trust Badge */}
                <div className="mt-4">
                  <TrustBadge variant="compact" price={listing.price} showLink={true} />
                </div>

                {/* Description */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{listing.description || 'No description provided.'}</p>
                </div>

                {/* Seller Earnings (own listing) */}
                {isOwnListing && (
                  <div className="mt-6 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm"><Wallet className="w-4 h-4 text-emerald-600" />Seller Earnings Estimate</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Sale price</span><span className="font-medium">{formatZAR(listing.price)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Commission ({Math.round(commission.commissionRate * 100)}%)</span><span className="font-medium text-red-600">-{formatZAR(commission.commissionAmount)}</span></div>
                      <div className="border-t border-emerald-200 pt-1.5 mt-1.5 flex justify-between"><span className="font-bold text-gray-900 text-sm">Your net payout</span><span className="font-black text-emerald-600">{formatZAR(commission.netSellerAmount)}</span></div>
                    </div>
                  </div>
                )}

                {/* Seller Card */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {listing.seller_avatar ? (
                        <img src={listing.seller_avatar} alt={listing.seller_name || 'Seller'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="text-sm font-bold text-blue-600">{sellerInitials}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{listing.seller_name || 'Seller'}</p>
                        <TrustScoreWidget sellerId={listing.user_id} variant="badge" />
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.province}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                  <span>
                    Seller contact information is protected under POPIA.{' '}
                    <Link to="/buyer-protection" className="text-blue-500 hover:underline">Buyer Protection applies</Link>.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                {/* Message Seller - Primary CTA */}
                {user && !isOwnListing && listing.status === 'active' && (
                  <button onClick={handleMessageSeller} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2.5 text-base group">
                    <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Message Seller
                  </button>
                )}

                {/* Add to Cart */}
                {user && !isOwnListing && listing.status === 'active' && (
                  <button
                    onClick={() => cart.isInCart(listing.id) ? null : cart.addToCart(listing.id)}
                    className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                      cart.isInCart(listing.id)
                        ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
                    }`}
                  >
                    {cart.isInCart(listing.id) ? (
                      <><CheckCircle2 className="w-5 h-5" />In Cart</>
                    ) : (
                      <><ShoppingCart className="w-5 h-5" />Add to Cart</>
                    )}
                  </button>
                )}

                {/* Sign in to contact */}
                {!user && listing.status === 'active' && (
                  <Link to="/login" className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 text-base">
                    <MessageSquare className="w-5 h-5" />Sign in to Contact Seller
                  </Link>
                )}

                {isOwnListing && (
                  <div className="w-full py-3 bg-gray-100 text-gray-500 font-medium rounded-xl text-center text-sm flex items-center justify-center gap-2"><ShoppingBag className="w-4 h-4" />This is your listing</div>
                )}

                {/* Quick message */}
                {user && !isOwnListing && (
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, is this still available?" className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }} />
                      <button onClick={handleSendMessage} disabled={sendingMessage || !message.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-all">
                        {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Save / Wishlist / Share / Price Alert */}
                <div className="flex gap-2 flex-wrap">
                  {user && (
                    <button onClick={handleToggleFavorite} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${isFavorited ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />{isFavorited ? 'Saved' : 'Save'}
                    </button>
                  )}
                  {user && !isOwnListing && (
                    <button
                      onClick={() => cart.isInWishlist(listing.id) ? cart.removeFromWishlist(listing.id) : cart.addToWishlist(listing.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                        cart.isInWishlist(listing.id)
                          ? 'bg-purple-50 text-purple-600 border border-purple-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${cart.isInWishlist(listing.id) ? 'fill-current' : ''}`} />
                      {cart.isInWishlist(listing.id) ? 'Wishlisted' : 'Wishlist'}
                    </button>
                  )}
                  <ShareButton
                    url={`/listing/${listing.id}`}
                    title={listing.title}
                    price={formatZAR(listing.price)}
                    imageUrl={listing.images?.[0]}
                    contentType="listing"
                    contentId={listing.id}
                    variant="button"
                  />
                  {user && !isOwnListing && listing.status === 'active' && (
                    <button
                      onClick={() => setPriceAlertOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-all border border-indigo-200"
                    >
                      <BellRing className="w-4 h-4" />Price Alert
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Alert Modal */}
      {user && !isOwnListing && (
        <PriceAlertModal
          isOpen={priceAlertOpen}
          onClose={() => setPriceAlertOpen(false)}
          listingId={listing.id}
          listingTitle={listing.title}
          currentPrice={listing.price}
        />
      )}

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
            <svg className="w-7 h-7" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs><linearGradient id="fLogo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#2563EB" /><stop offset="1" stopColor="#1D4ED8" /></linearGradient></defs>
              <rect width="40" height="40" rx="10" fill="url(#fLogo)" />
              <path d="M24.5 13.5C24.5 13.5 22.5 12 19.5 12C16 12 13.5 14.2 13.5 17C13.5 19.8 16 21 19.5 22C23 23 25.5 24.2 25.5 27C25.5 29.8 23 32 19.5 32C16 32 14 30.5 14 30.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="19.5" y1="10" x2="19.5" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="19.5" y1="32" x2="19.5" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Snap<span className="text-blue-600">Up</span>
          </Link>
          <div className="flex gap-4">
            <Link to="/buyer-protection" className="hover:text-blue-600 transition-colors">Buyer Protection</Link>
            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Simple header for listing page ───
function SimpleHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs><linearGradient id="hLogo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#2563EB" /><stop offset="1" stopColor="#1D4ED8" /></linearGradient></defs>
              <rect width="40" height="40" rx="10" fill="url(#hLogo)" />
              <path d="M24.5 13.5C24.5 13.5 22.5 12 19.5 12C16 12 13.5 14.2 13.5 17C13.5 19.8 16 21 19.5 22C23 23 25.5 24.2 25.5 27C25.5 29.8 23 32 19.5 32C16 32 14 30.5 14 30.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="19.5" y1="10" x2="19.5" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="19.5" y1="32" x2="19.5" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">Snap<span className="text-blue-600">Up</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Link to="/" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Cart">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cart.cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {cart.cartCount > 99 ? '99+' : cart.cartCount}
                </span>
              )}
            </Link>
          )}
          {!user && (
            <Link to="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Outer wrapper with providers ───
export default function ListingPage() {
  return (
    <ErrorBoundary fallbackTitle="Failed to load listing" onReset={() => window.location.reload()}>
      <AuthProvider>
        <ChatProvider>
          <CartProvider>
            <ListingPageInner />
          </CartProvider>
        </ChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
