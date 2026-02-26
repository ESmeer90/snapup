import React, { useState, useCallback } from 'react';
import {
  Search, Loader2, AlertTriangle, CheckCircle2, ExternalLink, Globe,
  Image as ImageIcon, FileText, RefreshCw, Copy, Eye, Info, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const BASE_URL = 'https://snapup.co.za';

interface OgTags {
  'og:title'?: string;
  'og:description'?: string;
  'og:image'?: string;
  'og:url'?: string;
  'og:type'?: string;
  'og:site_name'?: string;
  'og:locale'?: string;
  'og:image:width'?: string;
  'og:image:height'?: string;
  'twitter:card'?: string;
  'twitter:title'?: string;
  'twitter:description'?: string;
  'twitter:image'?: string;
  title?: string;
  description?: string;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  tag?: string;
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function extractListingId(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.searchParams.get('listing');
  } catch {
    return null;
  }
}

const AdminSEOTab: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [ogTags, setOgTags] = useState<OgTags | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fetchOgTags = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setOgTags(null);
    setIssues([]);
    setImageLoaded(false);
    setImageError(false);

    try {
      const listingId = extractListingId(url);

      if (listingId) {
        // Fetch listing-specific OG data from edge function
        const { data, error } = await supabase.functions.invoke('generate-og-image', {
          body: { listingId }
        });

        if (error || !data) {
          throw new Error(error?.message || 'Failed to fetch OG data');
        }

        const tags: OgTags = {
          'og:title': data.ogTags?.['og:title'] || `${data.title} | SnapUp`,
          'og:description': data.ogTags?.['og:description'] || data.description,
          'og:image': data.ogTags?.['og:image'] || data.image,
          'og:url': data.ogTags?.['og:url'] || data.url,
          'og:type': data.ogTags?.['og:type'] || 'product',
          'og:site_name': 'SnapUp',
          'og:locale': 'en_ZA',
          'og:image:width': '1200',
          'og:image:height': '630',
          'twitter:card': data.ogTags?.['twitter:card'] || 'summary_large_image',
          'twitter:title': data.ogTags?.['twitter:title'] || data.title,
          'twitter:description': data.ogTags?.['twitter:description'] || data.description,
          'twitter:image': data.ogTags?.['twitter:image'] || data.image,
          title: data.title,
          description: data.description,
        };

        setOgTags(tags);
        validateTags(tags);
      } else {
        // Non-listing URL — use default site OG tags
        const tags: OgTags = {
          'og:title': 'SnapUp - Buy & Sell in South Africa | Trusted Online Marketplace',
          'og:description': "South Africa's trusted online marketplace. Buy and sell electronics, vehicles, fashion, furniture and more. Secure payments, buyer protection up to R5,000, and POPIA compliant.",
          'og:image': 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772033228455_a0d42141.jpg',
          'og:url': BASE_URL,
          'og:type': 'website',
          'og:site_name': 'SnapUp',
          'og:locale': 'en_ZA',
          'og:image:width': '1200',
          'og:image:height': '630',
          'twitter:card': 'summary_large_image',
          'twitter:title': 'SnapUp - Buy & Sell in South Africa',
          'twitter:description': "South Africa's trusted online marketplace. Secure payments, buyer protection, POPIA compliant.",
          'twitter:image': 'https://d64gsuwffb70l.cloudfront.net/699701f2f91939597c7a986c_1772033228455_a0d42141.jpg',
          title: 'SnapUp - Buy & Sell in South Africa',
          description: "South Africa's trusted online marketplace.",
        };
        setOgTags(tags);
        validateTags(tags);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to fetch OG tags', variant: 'destructive' });
      setIssues([{ type: 'error', message: `Failed to fetch: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [url]);

  const validateTags = (tags: OgTags) => {
    const newIssues: ValidationIssue[] = [];

    // Required tags
    if (!tags['og:title']) newIssues.push({ type: 'error', message: 'Missing og:title — required for all platforms', tag: 'og:title' });
    if (!tags['og:description']) newIssues.push({ type: 'error', message: 'Missing og:description — required for rich previews', tag: 'og:description' });
    if (!tags['og:image']) newIssues.push({ type: 'error', message: 'Missing og:image — no image will show in previews', tag: 'og:image' });
    if (!tags['og:url']) newIssues.push({ type: 'warning', message: 'Missing og:url — may cause canonical issues', tag: 'og:url' });

    // Length checks
    if (tags['og:title'] && tags['og:title'].length > 95) newIssues.push({ type: 'warning', message: `og:title is ${tags['og:title'].length} chars (recommended: under 95)`, tag: 'og:title' });
    if (tags['og:description'] && tags['og:description'].length > 300) newIssues.push({ type: 'warning', message: `og:description is ${tags['og:description'].length} chars (recommended: under 300)`, tag: 'og:description' });

    // Image checks
    if (tags['og:image'] && !tags['og:image'].startsWith('https://')) {
      newIssues.push({ type: 'error', message: 'og:image must use HTTPS — WhatsApp/Facebook will reject HTTP images', tag: 'og:image' });
    }

    // Twitter checks
    if (!tags['twitter:card']) newIssues.push({ type: 'warning', message: 'Missing twitter:card — Twitter will use fallback', tag: 'twitter:card' });

    // Good signs
    if (tags['og:title'] && tags['og:description'] && tags['og:image'] && tags['og:url']) {
      newIssues.push({ type: 'info', message: 'All required OG tags present — social previews should work correctly' });
    }
    if (tags['og:image:width'] && tags['og:image:height']) {
      newIssues.push({ type: 'info', message: `Image dimensions specified: ${tags['og:image:width']}x${tags['og:image:height']}` });
    }

    setIssues(newIssues);
  };

  const facebookDebuggerUrl = url
    ? `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url.startsWith('http') ? url : `https://${url}`)}`
    : '';

  const twitterValidatorUrl = url
    ? `https://cards-dev.twitter.com/validator`
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
        <Globe className="w-4 h-4 text-blue-600" />
        <p className="text-xs text-blue-700">
          Preview how SnapUp URLs appear when shared on social media. Paste any URL to see the OG tags and platform-specific previews.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">SnapUp URL to Preview</label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://snapup.co.za/?listing=abc123"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && fetchOgTags()}
            />
          </div>
          <button
            onClick={fetchOgTags}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-all text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Preview
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => { setUrl(`${BASE_URL}/`); }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            Homepage
          </button>
          <button
            onClick={() => { setUrl(`${BASE_URL}/buyer-protection`); }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            Buyer Protection
          </button>
          <button
            onClick={() => { setUrl(`${BASE_URL}/privacy-policy`); }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* Validation Issues */}
      {issues.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" />
            Validation Results
          </h3>
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs ${
                  issue.type === 'error' ? 'bg-red-50 text-red-700' :
                  issue.type === 'warning' ? 'bg-amber-50 text-amber-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}
              >
                {issue.type === 'error' ? <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
                 issue.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
                 <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                <span>{issue.message}</span>
                {issue.tag && <code className="ml-auto px-1.5 py-0.5 bg-white/50 rounded text-[10px] font-mono">{issue.tag}</code>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Preview Cards */}
      {ogTags && (
        <div className="space-y-6">
          {/* External Tools */}
          <div className="flex items-center gap-3 flex-wrap">
            {facebookDebuggerUrl && (
              <a
                href={facebookDebuggerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white font-semibold rounded-xl hover:bg-[#166FE5] transition-all text-sm shadow-lg shadow-blue-200"
              >
                <ExternalLink className="w-4 h-4" />
                Validate with Facebook Debugger
              </a>
            )}
            <a
              href={twitterValidatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Twitter Card Validator
            </a>
            <button
              onClick={() => {
                const tagsStr = Object.entries(ogTags).map(([k, v]) => `${k}: ${v}`).join('\n');
                navigator.clipboard.writeText(tagsStr);
                toast({ title: 'Copied', description: 'OG tags copied to clipboard' });
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy All Tags
            </button>
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-[#075E54] text-white flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span className="font-semibold text-sm">WhatsApp Preview</span>
              </div>
              <div className="p-4 bg-[#ECE5DD]">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-[340px]">
                  {ogTags['og:image'] && (
                    <div className="relative">
                      <img
                        src={ogTags['og:image']}
                        alt="Preview"
                        className="w-full h-[180px] object-cover"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                      />
                      {imageError && (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                            <p className="text-xs">Image failed to load</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">snapup.co.za</p>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{truncate(ogTags['og:title'] || '', 70)}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{truncate(ogTags['og:description'] || '', 120)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Facebook Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-[#1877F2] text-white flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span className="font-semibold text-sm">Facebook Preview</span>
              </div>
              <div className="p-4 bg-[#F0F2F5]">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 max-w-[500px]">
                  {ogTags['og:image'] && (
                    <img
                      src={ogTags['og:image']}
                      alt="Preview"
                      className="w-full h-[260px] object-cover"
                    />
                  )}
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">snapup.co.za</p>
                    <p className="text-base font-bold text-gray-900 mt-1 leading-tight">{truncate(ogTags['og:title'] || '', 80)}</p>
                    <p className="text-sm text-gray-500 mt-1">{truncate(ogTags['og:description'] || '', 150)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Twitter Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-black text-white flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="font-semibold text-sm">X (Twitter) Preview</span>
              </div>
              <div className="p-4 bg-black/5">
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 max-w-[500px]">
                  {(ogTags['twitter:image'] || ogTags['og:image']) && (
                    <img
                      src={ogTags['twitter:image'] || ogTags['og:image']}
                      alt="Preview"
                      className="w-full h-[250px] object-cover"
                    />
                  )}
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{truncate(ogTags['twitter:title'] || ogTags['og:title'] || '', 70)}</p>
                    <p className="text-sm text-gray-500 mt-1">{truncate(ogTags['twitter:description'] || ogTags['og:description'] || '', 125)}</p>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      snapup.co.za
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* LinkedIn Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-[#0A66C2] text-white flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <span className="font-semibold text-sm">LinkedIn Preview</span>
              </div>
              <div className="p-4 bg-[#F3F2EF]">
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200 max-w-[500px]">
                  {ogTags['og:image'] && (
                    <img
                      src={ogTags['og:image']}
                      alt="Preview"
                      className="w-full h-[250px] object-cover"
                    />
                  )}
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{truncate(ogTags['og:title'] || '', 80)}</p>
                    <p className="text-[11px] text-gray-500 mt-1.5">snapup.co.za</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Raw OG Tags */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              Raw OG Tags
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 pr-4 font-semibold text-gray-500 uppercase tracking-wider">Tag</th>
                    <th className="pb-2 font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(ogTags).filter(([_, v]) => v).map(([key, value]) => (
                    <tr key={key} className="hover:bg-gray-100">
                      <td className="py-2 pr-4 font-mono text-blue-600 whitespace-nowrap">{key}</td>
                      <td className="py-2 text-gray-700 break-all max-w-[400px]">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Crawler SSR Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Server-Side Rendering for Crawlers
            </h3>
            <div className="space-y-3 text-xs text-gray-600">
              <p>
                SnapUp uses a <strong>Vercel serverless function</strong> at <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono">/api/og</code> to serve
                proper HTML with OG meta tags to social media crawlers (WhatsApp, Facebook, Twitter, LinkedIn, Telegram, etc.).
              </p>
              <p>
                When a crawler visits <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono">snapup.co.za/?listing=UUID</code>,
                the request is intercepted and routed to the API endpoint which:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Detects the crawler user-agent</li>
                <li>Fetches listing data from Supabase</li>
                <li>Returns a minimal HTML page with correct og:title, og:image, og:description</li>
                <li>Includes Product JSON-LD structured data for Google rich results</li>
                <li>Non-crawlers are redirected to the SPA</li>
              </ol>
              <div className="flex items-center gap-2 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-emerald-700">
                  Crawler SSR is active. Listing URLs shared on social media will display rich previews with the listing's image, title, and price.
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Sitemap Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-600" />
              Dynamic Sitemap
            </h3>
            <div className="space-y-3 text-xs text-gray-600">
              <p>
                The sitemap at <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono">/sitemap.xml</code> is
                dynamically generated by a Supabase edge function that queries all active listings from the database.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium">Homepage</p>
                  <p className="text-sm font-bold text-purple-800 mt-0.5">Priority 1.0</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Categories</p>
                  <p className="text-sm font-bold text-blue-800 mt-0.5">Priority 0.7</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-medium">Provinces</p>
                  <p className="text-sm font-bold text-emerald-800 mt-0.5">Priority 0.6</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <p className="text-xs text-amber-600 font-medium">Listings</p>
                  <p className="text-sm font-bold text-amber-800 mt-0.5">Priority 0.5-0.8</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <a
                  href={`${BASE_URL}/sitemap.xml`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Live Sitemap
                </a>
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Google Search Console
                </a>
              </div>
              <div className="flex items-start gap-2 mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-blue-700">
                  <strong>No Google Indexing API.</strong> SnapUp uses standard sitemap.xml + robots.txt for indexing.
                  The Indexing API is only for JobPosting/LiveBroadcast structured data and is not applicable to marketplace listings.
                  Submit the sitemap URL manually in Google Search Console for best results.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSEOTab;
