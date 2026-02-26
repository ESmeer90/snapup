import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { SA_PROVINCE_COORDS } from '@/types';
import type { SAProvince } from '@/types';
import ShareButton from '@/components/snapup/ShareButton';
import {
  Search, Package, Truck, MapPin, CheckCircle2, Clock, Shield,
  ArrowLeft, Loader2, AlertTriangle, Copy, Share2, ExternalLink,
  Calendar, User, ChevronRight, RefreshCw, Navigation, Camera,
  XCircle, RotateCcw, Settings, CircleDot, Zap, Globe, Box,
  ArrowRight, Info, Link as LinkIcon, X, ZoomIn, ImageIcon
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';


// ============ Types ============
interface TrackingOrder {
  id: string;
  short_id: string;
  status: string;
  total: number;
  tracking_number: string | null;
  carrier: string | null;
  tracking_status: string | null;
  courier_service: string | null;
  shipment_id: string | null;
  created_at: string;
  updated_at: string;
  delivery_confirmed_at: string | null;
  item_title: string;
  item_image: string | null;
  item_price: number;
  item_province: string;
  item_location: string;
  item_condition: string;
  seller_name: string;
  seller_province: string;
  seller_avatar: string | null;
  buyer_province: string;
  estimated_delivery: string | null;
}

interface TrackingEntry {
  id: string;
  status: string;
  tracking_number: string | null;
  carrier: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

interface TrackingData {
  order: TrackingOrder;
  tracking: TrackingEntry[];
  escrow: { status: string; delivery_confirmed_at: string | null; release_at: string | null } | null;
  route: { from_province: string | null; to_province: string | null };
}

// ============ Status Config ============
const STATUS_CONFIG: Record<string, { color: string; bgColor: string; textColor: string; description: string }> = {
  'Pending': { color: 'border-amber-400', bgColor: 'bg-amber-50', textColor: 'text-amber-700', description: 'Order received, awaiting processing' },
  'Processing': { color: 'border-blue-400', bgColor: 'bg-blue-50', textColor: 'text-blue-700', description: 'Seller is preparing your order' },
  'Shipped': { color: 'border-indigo-400', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', description: 'Package has been shipped' },
  'In Transit': { color: 'border-purple-400', bgColor: 'bg-purple-50', textColor: 'text-purple-700', description: 'Package is on its way to you' },
  'Out for Delivery': { color: 'border-cyan-400', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', description: 'Package is out for delivery today' },
  'Delivered': { color: 'border-emerald-400', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', description: 'Package has been delivered' },
  'Cancelled': { color: 'border-red-400', bgColor: 'bg-red-50', textColor: 'text-red-700', description: 'This order has been cancelled' },
  'Returned': { color: 'border-orange-400', bgColor: 'bg-orange-50', textColor: 'text-orange-700', description: 'Package is being returned' },
};

const ORDER_STATUS_MAP: Record<string, string> = {
  'pending': 'Pending',
  'paid': 'Processing',
  'shipped': 'Shipped',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
  'refunded': 'Cancelled',
};

const statusIcons: Record<string, React.ReactNode> = {
  'Pending': <Clock className="w-4 h-4" />,
  'Processing': <Settings className="w-4 h-4" />,
  'Shipped': <Package className="w-4 h-4" />,
  'In Transit': <Truck className="w-4 h-4" />,
  'Out for Delivery': <MapPin className="w-4 h-4" />,
  'Delivered': <CheckCircle2 className="w-4 h-4" />,
  'Cancelled': <XCircle className="w-4 h-4" />,
  'Returned': <RotateCcw className="w-4 h-4" />,
};

// ============ Helpers ============
function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
}

function latLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - 16) / (33 - 16)) * 600 + 50;
  const y = ((lat - (-22)) / (-35 - (-22))) * 500 + 50;
  return { x, y };
}

// ============ Photo Lightbox ============
const PhotoLightbox: React.FC<{ photoUrl: string; onClose: () => void }> = ({ photoUrl, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute -top-3 -right-3 z-10 p-2 bg-white text-gray-600 rounded-full shadow-xl hover:bg-gray-100 transition-colors">
        <X className="w-5 h-5" />
      </button>
      <div className="rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
        <img src={photoUrl} alt="Delivery photo" className="w-full max-h-[80vh] object-contain" />
        <div className="p-3 bg-gray-900/90 flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span className="text-white text-sm font-medium">Delivery Photo Proof</span>
        </div>
      </div>
    </div>
  </div>
);

// ============ Route Map Component ============
const RouteMap: React.FC<{ fromProvince: string | null; toProvince: string | null; currentStatus: string }> = ({ fromProvince, toProvince, currentStatus }) => {
  if (!fromProvince && !toProvince) return null;

  const fromCoords = fromProvince ? SA_PROVINCE_COORDS[fromProvince as SAProvince] : null;
  const toCoords = toProvince ? SA_PROVINCE_COORDS[toProvince as SAProvince] : null;
  const fromSvg = fromCoords ? latLngToSvg(fromCoords.lat, fromCoords.lng) : null;
  const toSvg = toCoords ? latLngToSvg(toCoords.lat, toCoords.lng) : null;

  // Determine progress along route
  const statusOrder = ['Pending', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const progress = currentIdx >= 0 ? currentIdx / (statusOrder.length - 1) : 0;

  // Calculate midpoint for the package icon
  let packagePos = fromSvg || { x: 350, y: 300 };
  if (fromSvg && toSvg) {
    packagePos = {
      x: fromSvg.x + (toSvg.x - fromSvg.x) * progress,
      y: fromSvg.y + (toSvg.y - fromSvg.y) * progress,
    };
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <Globe className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">Shipping Route</h3>
        {fromProvince && toProvince && fromProvince === toProvince && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Same Province</span>
        )}
      </div>
      <div className="relative" style={{ height: '320px' }}>
        <svg viewBox="0 0 700 600" className="w-full h-full">
          {/* Background */}
          <rect x="0" y="0" width="700" height="600" fill="#f0f9ff" />
          {/* SA outline */}
          <path
            d="M 280 120 L 540 120 L 580 180 L 600 250 L 580 350 L 560 420 L 520 470 L 450 520 L 380 540 L 300 530 L 240 500 L 200 450 L 180 380 L 160 300 L 180 220 L 220 160 Z"
            fill="#e0f2fe"
            stroke="#93c5fd"
            strokeWidth="2"
          />

          {/* Province dots */}
          {Object.entries(SA_PROVINCE_COORDS).map(([prov, coords]) => {
            const pos = latLngToSvg(coords.lat, coords.lng);
            const isFrom = prov === fromProvince;
            const isTo = prov === toProvince;
            return (
              <g key={prov}>
                <circle cx={pos.x} cy={pos.y} r={isFrom || isTo ? 0 : 4} fill="#93c5fd" opacity={0.4} />
                <text x={pos.x} y={pos.y - 8} textAnchor="middle" className="text-[8px] fill-gray-400 select-none pointer-events-none">
                  {!(isFrom || isTo) ? prov.split(' ').map(w => w[0]).join('') : ''}
                </text>
              </g>
            );
          })}

          {/* Route line */}
          {fromSvg && toSvg && (
            <>
              {/* Background line */}
              <line x1={fromSvg.x} y1={fromSvg.y} x2={toSvg.x} y2={toSvg.y} stroke="#cbd5e1" strokeWidth="3" strokeDasharray="8 4" />
              {/* Progress line */}
              <line
                x1={fromSvg.x} y1={fromSvg.y}
                x2={fromSvg.x + (toSvg.x - fromSvg.x) * progress}
                y2={fromSvg.y + (toSvg.y - fromSvg.y) * progress}
                stroke="#3b82f6" strokeWidth="3"
              />
            </>
          )}

          {/* From marker */}
          {fromSvg && (
            <g>
              <circle cx={fromSvg.x} cy={fromSvg.y} r="14" fill="#3b82f6" stroke="white" strokeWidth="3" />
              <text x={fromSvg.x} y={fromSvg.y + 1} textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-bold fill-white select-none pointer-events-none">
                FROM
              </text>
              <text x={fromSvg.x} y={fromSvg.y + 28} textAnchor="middle" className="text-[11px] font-semibold fill-blue-700 select-none pointer-events-none">
                {fromProvince}
              </text>
            </g>
          )}

          {/* To marker */}
          {toSvg && (
            <g>
              <circle cx={toSvg.x} cy={toSvg.y} r="14" fill="#10b981" stroke="white" strokeWidth="3" />
              <text x={toSvg.x} y={toSvg.y + 1} textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-bold fill-white select-none pointer-events-none">
                TO
              </text>
              <text x={toSvg.x} y={toSvg.y + 28} textAnchor="middle" className="text-[11px] font-semibold fill-emerald-700 select-none pointer-events-none">
                {toProvince}
              </text>
            </g>
          )}

          {/* Package icon on route */}
          {currentStatus !== 'Delivered' && currentStatus !== 'Cancelled' && currentStatus !== 'Pending' && fromSvg && toSvg && (
            <g>
              <circle cx={packagePos.x} cy={packagePos.y} r="18" fill="#f59e0b" stroke="white" strokeWidth="3" />
              <circle cx={packagePos.x} cy={packagePos.y} r="24" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.4">
                <animate attributeName="r" from="18" to="30" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Package icon (simplified) */}
              <rect x={packagePos.x - 7} y={packagePos.y - 7} width="14" height="14" rx="2" fill="white" />
              <line x1={packagePos.x - 7} y1={packagePos.y - 2} x2={packagePos.x + 7} y2={packagePos.y - 2} stroke="#f59e0b" strokeWidth="1.5" />
              <line x1={packagePos.x} y1={packagePos.y - 2} x2={packagePos.x} y2={packagePos.y + 7} stroke="#f59e0b" strokeWidth="1.5" />
            </g>
          )}

          {/* Delivered checkmark */}
          {currentStatus === 'Delivered' && toSvg && (
            <g>
              <circle cx={toSvg.x} cy={toSvg.y - 30} r="12" fill="#10b981" stroke="white" strokeWidth="2" />
              <path d={`M ${toSvg.x - 4} ${toSvg.y - 30} L ${toSvg.x - 1} ${toSvg.y - 27} L ${toSvg.x + 5} ${toSvg.y - 34}`} stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">Origin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">Destination</span>
          </div>
          {currentStatus !== 'Delivered' && currentStatus !== 'Cancelled' && currentStatus !== 'Pending' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-600">Package</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ Progress Steps ============
const ProgressSteps: React.FC<{ currentStatus: string }> = ({ currentStatus }) => {
  const stages = [
    { status: 'Pending', label: 'Ordered', icon: <Clock className="w-4 h-4" /> },
    { status: 'Processing', label: 'Processing', icon: <Settings className="w-4 h-4" /> },
    { status: 'Shipped', label: 'Shipped', icon: <Package className="w-4 h-4" /> },
    { status: 'In Transit', label: 'In Transit', icon: <Truck className="w-4 h-4" /> },
    { status: 'Delivered', label: 'Delivered', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const statusOrder = ['Pending', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
  const currentIdx = statusOrder.indexOf(currentStatus);

  if (currentStatus === 'Cancelled' || currentStatus === 'Returned') {
    const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['Cancelled'];
    return (
      <div className={`flex items-center gap-3 px-5 py-4 rounded-xl ${cfg.bgColor} border ${cfg.color}`}>
        {statusIcons[currentStatus]}
        <div>
          <span className={`font-semibold ${cfg.textColor}`}>{currentStatus}</span>
          <p className={`text-sm ${cfg.textColor} opacity-80`}>{cfg.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-2 py-4">
      {/* Background line */}
      <div className="absolute top-[38px] left-8 right-8 h-1 bg-gray-200 rounded-full" />
      {/* Progress line */}
      <div
        className="absolute top-[38px] left-8 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, (currentIdx / (stages.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 64px)' }}
      />

      <div className="flex items-start justify-between relative z-10">
        {stages.map((stage, idx) => {
          const stageIdx = statusOrder.indexOf(stage.status);
          const isComplete = currentIdx >= stageIdx;
          const isCurrent = currentIdx === stageIdx || (stage.status === 'In Transit' && currentStatus === 'Out for Delivery');

          return (
            <div key={stage.status} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isComplete
                  ? isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg shadow-blue-200'
                    : 'bg-blue-500 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-400'
              }`}>
                {isComplete ? stage.icon : <span className="text-xs font-bold">{idx + 1}</span>}
              </div>
              <span className={`text-[11px] sm:text-xs mt-2 font-medium text-center ${isComplete ? 'text-blue-600' : 'text-gray-400'}`}>
                {stage.label}
              </span>
              {isCurrent && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mt-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ Timeline Component ============
const TrackingTimelinePublic: React.FC<{ tracking: TrackingEntry[] }> = ({ tracking }) => {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  if (!tracking || tracking.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium">No tracking updates yet</p>
        <p className="text-xs mt-1">Updates will appear here once the seller ships your order</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gray-200" />

        <div className="space-y-0">
          {tracking.map((entry, idx) => {
            const isLatest = idx === tracking.length - 1;
            const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG['Pending'];
            const icon = statusIcons[entry.status] || <CircleDot className="w-4 h-4" />;

            return (
              <div key={entry.id} className="relative pb-5 last:pb-0">
                {/* Dot */}
                <div className={`absolute -left-8 top-0.5 w-[26px] h-[26px] rounded-full flex items-center justify-center z-10 ${
                  isLatest
                    ? `${cfg.bgColor} ${cfg.textColor} ring-2 ring-white shadow-md`
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {icon}
                </div>

                {/* Content */}
                <div className={`ml-3 ${isLatest ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${isLatest ? cfg.textColor : 'text-gray-600'}`}>
                      {entry.status}
                    </span>
                    {isLatest && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
                        CURRENT
                      </span>
                    )}
                    {entry.photo_url && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                        <Camera className="w-2.5 h-2.5" /> PHOTO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-2 inline-block">
                      {entry.notes}
                    </p>
                  )}
                  {entry.tracking_number && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tracking: <span className="font-mono text-blue-600">{entry.tracking_number}</span>
                    </p>
                  )}
                  {entry.carrier && (
                    <p className="text-xs text-gray-500">via {entry.carrier}</p>
                  )}
                  {/* Delivery Photo */}
                  {entry.photo_url && (
                    <div className="mt-2.5">
                      <div
                        className="relative group cursor-pointer rounded-xl overflow-hidden border-2 border-emerald-200 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md max-w-xs"
                        onClick={() => setLightboxPhoto(entry.photo_url!)}
                      >
                        <img src={entry.photo_url} alt="Delivery photo" className="w-full h-32 sm:h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
                            <ZoomIn className="w-4 h-4 text-gray-700" />
                            <span className="text-sm font-medium text-gray-700">View full size</span>
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
                          <Camera className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Proof of Delivery</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {lightboxPhoto && <PhotoLightbox photoUrl={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />}
    </>
  );
};

// ============ Main Tracking Page ============
const TrackingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ id?: string }>();

  const initialQuery = params.id || searchParams.get('q') || searchParams.get('id') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTracking = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const isTrackingNumber = !searchQuery.includes('-') && searchQuery.length < 30;
      const body: any = {};
      if (isTrackingNumber && !searchQuery.match(/^[0-9a-f]{8}-/i)) {
        body.tracking_number = searchQuery.trim();
      } else {
        body.order_id = searchQuery.trim();
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('public-order-tracking', { body });

      if (fnError) {
        const errMsg = typeof fnError === 'object' ? (fnError as any).message || JSON.stringify(fnError) : String(fnError);
        // Try to parse error from response
        if (errMsg.includes('non-2xx')) {
          setError('Order not found. Please check your order ID or tracking number and try again.');
        } else {
          setError(errMsg);
        }
        return;
      }

      if (result?.error) {
        setError(result.message || result.error);
        return;
      }

      setData(result as TrackingData);
      // Update URL without reload
      if (result?.order?.id) {
        setSearchParams({ q: result.order.id }, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tracking information');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Auto-fetch on mount if query present
  useEffect(() => {
    if (initialQuery) {
      fetchTracking(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
    fetchTracking(searchInput);
  };

  const handleRefresh = async () => {
    if (!data?.order?.id) return;
    setRefreshing(true);
    await fetchTracking(data.order.id);
    setRefreshing(false);
    toast({ title: 'Refreshed', description: 'Tracking data has been updated.' });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/track?q=${data?.order?.id || query}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link Copied', description: 'Tracking link copied to clipboard.' });
    }).catch(() => {
      toast({ title: 'Copy Failed', description: 'Could not copy link.', variant: 'destructive' });
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/track?q=${data?.order?.id || query}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Track Order ${data?.order?.short_id || ''}`,
          text: `Track your SnapUp order delivery status`,
          url,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  // Determine the effective tracking status
  const currentStatus = useMemo(() => {
    if (!data) return 'Pending';
    if (data.tracking.length > 0) {
      return data.tracking[data.tracking.length - 1].status;
    }
    return ORDER_STATUS_MAP[data.order.status] || 'Pending';
  }, [data]);

  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['Pending'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-all">
              <span className="text-white font-black text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">Snap<span className="text-blue-600">Up</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to SnapUp
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-200 mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Enter your order ID or tracking number to see real-time delivery status
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Enter order ID or tracking number..."
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-base shadow-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="px-6 sm:px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span className="hidden sm:inline">Track</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Example: paste your full order ID (UUID) or courier tracking number
          </p>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Looking up your order...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Order Not Found</h3>
            <p className="text-gray-500 mb-6 text-sm">{error}</p>
            <button
              onClick={() => { setError(null); setSearchInput(''); }}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`rounded-2xl border-2 ${statusCfg.color} ${statusCfg.bgColor} p-5 sm:p-6`}>
              <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusCfg.textColor} bg-white/60`}>
                    {statusIcons[currentStatus] || <Package className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-lg font-bold ${statusCfg.textColor}`}>{currentStatus}</h2>
                      {currentStatus === 'Delivered' && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-200 text-emerald-800 rounded-full">COMPLETE</span>
                      )}
                    </div>
                    <p className={`text-sm ${statusCfg.textColor} opacity-80`}>{statusCfg.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/70 hover:bg-white text-gray-700 font-medium rounded-xl text-sm transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <ShareButton
                    url={`/track?q=${data.order.id}`}
                    title={`Track Order #${data.order.short_id} — ${data.order.item_title}`}
                    contentType="tracking"
                    contentId={data.order.id}
                    variant="compact"
                    className="bg-white/70 hover:bg-white text-gray-700 px-3 py-2 rounded-xl text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/70 hover:bg-white text-gray-700 font-medium rounded-xl text-sm transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>

              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={data.order.item_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop'}
                      alt={data.order.item_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{data.order.item_title}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-lg font-bold text-blue-600">{formatZAR(data.order.total)}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusCfg.bgColor} ${statusCfg.textColor}`}>
                        {currentStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 py-1 rounded-lg">
                        <Box className="w-3 h-3" />
                        #{data.order.short_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(data.order.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {data.order.seller_name}
                      </span>
                      {data.order.item_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {data.order.item_location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Progress Steps */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" /> Delivery Progress
                  </h3>
                  <ProgressSteps currentStatus={currentStatus} />

                  {/* Estimated Delivery */}
                  {data.order.estimated_delivery && currentStatus !== 'Delivered' && currentStatus !== 'Cancelled' && (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-800">
                          Estimated Delivery: {formatDate(data.order.estimated_delivery)}
                        </p>
                        <p className="text-xs text-blue-600">
                          This is an estimate based on the courier service and route
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivery confirmed */}
                  {data.order.delivery_confirmed_at && (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          Delivery Confirmed
                        </p>
                        <p className="text-xs text-emerald-600">
                          Buyer confirmed delivery on {formatDateTime(data.order.delivery_confirmed_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tracking Timeline */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-purple-600" /> Tracking History
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {data.tracking.length} update{data.tracking.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <TrackingTimelinePublic tracking={data.tracking} />
                </div>

                {/* Route Map */}
                {(data.route.from_province || data.route.to_province) && (
                  <RouteMap
                    fromProvince={data.route.from_province}
                    toProvince={data.route.to_province}
                    currentStatus={currentStatus}
                  />
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Courier Information */}
                {(data.order.carrier || data.order.tracking_number || data.order.courier_service) && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600" /> Courier Details
                    </h3>
                    <div className="space-y-3">
                      {data.order.courier_service && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Service</p>
                          <p className="text-sm font-bold text-gray-900">{data.order.courier_service}</p>
                        </div>
                      )}
                      {data.order.carrier && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Carrier</p>
                          <p className="text-sm font-bold text-gray-900">{data.order.carrier}</p>
                        </div>
                      )}
                      {data.order.tracking_number && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Tracking Number</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-mono font-bold text-blue-600 break-all">{data.order.tracking_number}</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(data.order.tracking_number!);
                                toast({ title: 'Copied', description: 'Tracking number copied.' });
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                      {data.order.shipment_id && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Shipment ID</p>
                          <p className="text-xs font-mono text-gray-600 break-all">{data.order.shipment_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Shipping Route Info */}
                {data.route.from_province && data.route.to_province && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" /> Shipping Route
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900">{data.route.from_province}</p>
                        <p className="text-[10px] text-gray-400">Origin</p>
                      </div>
                      <div className="flex-shrink-0">
                        <ArrowRight className="w-5 h-5 text-gray-300" />
                      </div>
                      <div className="flex-1 text-center">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-1">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900">{data.route.to_province}</p>
                        <p className="text-[10px] text-gray-400">Destination</p>
                      </div>
                    </div>
                    {data.route.from_province === data.route.to_province && (
                      <p className="text-xs text-center text-green-600 mt-3 bg-green-50 rounded-lg py-1.5">
                        Same province delivery - faster transit time
                      </p>
                    )}
                  </div>
                )}

                {/* Escrow Status */}
                {data.escrow && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" /> Buyer Protection
                    </h3>
                    <div className={`p-3 rounded-xl ${
                      data.escrow.status === 'holding' ? 'bg-blue-50 border border-blue-100' :
                      data.escrow.status === 'released' ? 'bg-emerald-50 border border-emerald-100' :
                      data.escrow.status === 'disputed' ? 'bg-amber-50 border border-amber-100' :
                      'bg-gray-50 border border-gray-100'
                    }`}>
                      <p className={`text-sm font-semibold ${
                        data.escrow.status === 'holding' ? 'text-blue-700' :
                        data.escrow.status === 'released' ? 'text-emerald-700' :
                        data.escrow.status === 'disputed' ? 'text-amber-700' :
                        'text-gray-700'
                      }`}>
                        {data.escrow.status === 'holding' ? 'Payment Held in Escrow' :
                         data.escrow.status === 'released' ? 'Payment Released to Seller' :
                         data.escrow.status === 'disputed' ? 'Under Dispute Review' :
                         `Escrow: ${data.escrow.status}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {data.escrow.status === 'holding'
                          ? 'Your payment is securely held until delivery is confirmed'
                          : data.escrow.status === 'released'
                          ? 'Delivery confirmed and payment has been released'
                          : 'A dispute is being reviewed by our team'}
                      </p>
                      {data.escrow.release_at && data.escrow.status === 'holding' && (
                        <p className="text-xs text-blue-600 mt-2 font-medium">
                          Auto-release: {formatDate(data.escrow.release_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Share This Tracking */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-blue-600" /> Share Tracking Link
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Share this link with anyone to let them track this order
                  </p>
                  <div className="bg-white rounded-xl p-2.5 border border-blue-100 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/track?q=${data.order.id}`}
                      className="flex-1 text-xs font-mono text-gray-600 bg-transparent outline-none truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Help */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" /> Need Help?
                  </h3>
                  <div className="space-y-2 text-xs text-gray-500">
                    <p>If your order hasn't been updated in a while, the seller may still be processing it.</p>
                    <p>For issues with your order, please contact the seller through SnapUp messages.</p>
                    <Link to="/buyer-protection" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                      Learn about Buyer Protection <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* POPIA Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Privacy Protected</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  This tracking page shows limited order information in compliance with POPIA. Personal delivery addresses and buyer details are not displayed. Tracking data is used solely for delivery purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - No search yet */}
        {!data && !loading && !error && !initialQuery && (
          <div className="max-w-lg mx-auto text-center py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Enter ID</h4>
                <p className="text-xs text-gray-500">Paste your order ID or tracking number</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Navigation className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Track Live</h4>
                <p className="text-xs text-gray-500">See real-time status and location</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Share2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Share Link</h4>
                <p className="text-xs text-gray-500">Share tracking with anyone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 text-left">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Where to find your order ID?</h4>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Check your order confirmation email from SnapUp</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Go to "My Orders" in your SnapUp account</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Use the tracking number from your shipping notification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Ask the seller for the tracking link</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-sm font-bold text-gray-900">Snap<span className="text-blue-600">Up</span></span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/buyer-protection" className="hover:text-blue-600 transition-colors">Buyer Protection</Link>
            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-xs text-gray-400">Secure order tracking powered by SnapUp</p>
        </div>
      </footer>
    </div>
  );
};

export default TrackingPage;
