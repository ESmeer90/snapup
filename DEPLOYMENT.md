# SnapUp — Vercel Deployment & Domain Setup Guide

> **Domain:** snapup.co.za (registered at Domains.co.za)  
> **Hosting:** Vercel (Free / Hobby tier)  
> **Stack:** Vite + React + Tailwind CSS (SPA)  
> **Backend:** Supabase (edge functions, database, auth, storage)

---

## Table of Contents

1. [Pre-flight Checklist](#1-pre-flight-checklist)
2. [Create Vercel Project](#2-create-vercel-project)
3. [Deploy to Vercel](#3-deploy-to-vercel)
4. [Add Custom Domain](#4-add-custom-domain-snapupcoza)
5. [DNS Records at Domains.co.za](#5-dns-records-at-domainscoza)
6. [HTTPS / SSL](#6-https--ssl)
7. [Environment Variables](#7-environment-variables)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Ongoing Maintenance](#9-ongoing-maintenance)

---

## 1. Pre-flight Checklist

| Item | Status |
|------|--------|
| `vercel.json` configured (SPA rewrites, headers, caching) | ✅ Done |
| `robots.txt` points to `https://snapup.co.za/sitemap.xml` | ✅ Done |
| `sitemap.xml` uses `https://snapup.co.za` URLs | ✅ Done |
| `index.html` canonical is `https://snapup.co.za/` | ✅ Done |
| `manifest.json` configured for PWA | ✅ Done |
| `sw.js` service worker ready | ✅ Done |
| Open Graph / Twitter Card meta tags set | ✅ Done |
| JSON-LD structured data set | ✅ Done |
| Supabase anon key in `src/lib/supabase.ts` (safe — protected by RLS, see Security section) | ✅ Done |

| PayFast defaults to sandbox (safe for first deploy) | ✅ Done |

---

## 2. Create Vercel Project

### Option A — Via Vercel Dashboard (Recommended)

1. Go to **https://vercel.com** and sign in (or create a free account)
2. Click **"Add New…" → "Project"**
3. Choose **"Import Git Repository"**
   - Connect your GitHub / GitLab / Bitbucket account
   - Select the SnapUp repository
4. Vercel will auto-detect **Vite** as the framework
5. Confirm these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 18.x or 20.x |

6. Click **"Deploy"**

### Option B — Via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# From the project root directory
cd /path/to/snapup

# Login to Vercel
vercel login

# Link to a new project (first time)
vercel link

# Deploy to production
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your personal account
- **Link to existing project?** → No (create new)
- **Project name?** → `snapup` (or `snapup-marketplace`)
- **In which directory is your code located?** → `./`
- **Override settings?** → No (vercel.json handles everything)

---

## 3. Deploy to Vercel

After the initial setup, every push to your `main` branch will auto-deploy.

### Manual Production Deploy

```bash
vercel --prod
```

### Vercel Project URL

After deployment, Vercel assigns a URL like:
```
https://snapup-xxxxxx.vercel.app
```

This is your **preview URL**. The production URL will be `https://snapup.co.za` after DNS setup.

---

## 4. Add Custom Domain (snapup.co.za)

### In Vercel Dashboard:

1. Go to your SnapUp project → **Settings** → **Domains**
2. Type `snapup.co.za` and click **Add**
3. Vercel will show the required DNS records (see next section)
4. Also add `www.snapup.co.za` — Vercel will auto-redirect www → apex thanks to `vercel.json`

---

## 5. DNS Records at Domains.co.za

### ⚠️ IMPORTANT: Remove any existing A or CNAME records for @ and www first!

Log in to **https://www.domains.co.za** → **My Domains** → **snapup.co.za** → **DNS Management**

Add these **exact** records:
### Record 1 — Apex Domain (snapup.co.za)

| Field | Value |
|-------|-------|
| **Type** | `A` |
| **Name / Host** | `@` (or leave blank — Domains.co.za may use `@` or empty for apex) |
| **Value / Points to** | `76.76.21.21` |
| **TTL** | `3600` (or "1 Hour") |

### Record 2 — WWW Subdomain

| Field | Value |
|-------|-------|
| **Type** | `CNAME` |
| **Name / Host** | `www` |
| **Value / Points to** | `cname.vercel-dns.com` |
| **TTL** | `3600` (or "1 Hour") |



### Optional — Additional A Record (for redundancy)

Some DNS providers need a second A record for Vercel:

| Field | Value |
|-------|-------|
| **Type** | `A` |
| **Name / Host** | `@` |
| **Value / Points to** | `76.76.21.21` |
| **TTL** | `3600` |

> **Note:** Vercel uses a single IP `76.76.21.21` for all projects. This is their Anycast IP.

### Verify DNS Propagation

After adding records, check propagation (can take 5 min – 48 hours, usually under 30 min):

```bash
# Check A record
dig snapup.co.za A +short
# Should return: 76.76.21.21

# Check CNAME
dig www.snapup.co.za CNAME +short
# Should return: cname.vercel-dns.com.

# Or use online tools:
# https://dnschecker.org/#A/snapup.co.za
# https://www.whatsmydns.net/#A/snapup.co.za
```

---

## 6. HTTPS / SSL

Vercel automatically provisions a **free Let's Encrypt SSL certificate** once DNS is verified.

- **No action needed** — HTTPS is enabled automatically
- Certificate covers both `snapup.co.za` and `www.snapup.co.za`
- Auto-renews before expiry
- HTTP → HTTPS redirect is automatic
- HSTS header is set in `vercel.json` (`max-age=63072000; includeSubDomains; preload`)

### Verify SSL

After DNS propagates:
```bash
curl -I https://snapup.co.za
# Should show HTTP/2 200 with security headers
```

Or visit: **https://www.ssllabs.com/ssltest/analyze.html?d=snapup.co.za**

---

## 7. Environment Variables

### Frontend (Vercel) — None Required ✅

The Supabase URL and anon key are hardcoded in `src/lib/supabase.ts`. No Vercel environment variables are needed for the frontend build.

### Backend (Supabase Edge Functions) — Already Configured ✅

All backend secrets are set as Supabase Edge Function secrets (not Vercel env vars):

| Secret | Purpose | Status |
|--------|---------|--------|
| `GATEWAY_API_KEY` | AI Gateway, Email Gateway | ✅ Set |
| `SHIPLOGIC_API_KEY` | ShipLogic courier API | ✅ Set |
| `SENDGRID_API_KEY` | SendGrid email (legacy) | ✅ Set |
| `SENTRY_DSN` | Error tracking | ✅ Set |
| `VAPID_PUBLIC_KEY` | Web Push notifications | ✅ Set |
| `VAPID_PRIVATE_KEY` | Web Push notifications | ✅ Set |
| `PAYFAST_MERCHANT_ID` | PayFast live merchant ID | ✅ Set |
| `PAYFAST_MERCHANT_KEY` | PayFast live merchant key | ✅ Set |
| `PAYFAST_PASSPHRASE` | PayFast live passphrase | ✅ Set |


### PayFast Mode

PayFast defaults to **sandbox (test) mode**. To switch to live:

1. Set these Supabase Edge Function secrets:
   ```
   PAYFAST_MERCHANT_ID=<your live merchant ID>
   PAYFAST_MERCHANT_KEY=<your live merchant key>
   PAYFAST_PASSPHRASE=<your live passphrase>
   ```

2. In the SnapUp app, go to **Settings → PayFast Credentials** and toggle sandbox mode OFF

3. The `create-payfast-order` and `payfast-itn` edge functions will automatically use live credentials when available

> **⚠️ Keep sandbox ON until you've tested the full buy flow on production!**

### Supabase Auth Redirect URLs (CRITICAL)

You **must** add the production domain to Supabase's allowed redirect URLs, or password reset emails will fail:

1. Go to your **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://snapup.co.za`
3. Add these to **Redirect URLs**:
   ```
   https://snapup.co.za/**
   https://snapup.co.za/reset-password
   ```
4. Keep the existing localhost entries for development:
   ```
   http://localhost:8080/**
   ```

### PayFast ITN Webhook URL

The PayFast ITN (Instant Transaction Notification) callback URL is set dynamically by the `create-payfast-order` edge function using the `return_url_base` from the frontend (`window.location.origin`). Once live at `https://snapup.co.za`, the return/cancel URLs will automatically point to `https://snapup.co.za/payment/return` and `https://snapup.co.za/payment/cancel`.

The ITN notify URL points to the Supabase edge function directly:
```
https://iorzfbaxvpcklbyngtpi.databasepad.com/functions/v1/payfast-itn
```
This URL doesn't change with your frontend domain.

---

## 7b. Security Architecture

### Supabase Key in Client Code — Why This Is Safe

The `src/lib/supabase.ts` file contains a Supabase **anon** (anonymous) key. This is **not a security vulnerability**. Here's why:

| Concern | Reality |
|---------|---------|
| "The key is visible in the source code" | The anon key is **designed** to be public. Supabase's official docs state: *"The anon key is safe to use in a browser if you have enabled Row Level Security."* |
| "Moving to env vars would be more secure" | **No.** Vite's `import.meta.env.VITE_*` variables are embedded in the compiled JS bundle at build time. Anyone can see them in DevTools → Sources. Env vars provide **zero** additional security for client-side keys. |
| "Someone could use the key to access our database" | They can only access data that **RLS policies allow**. The anon key has no elevated privileges — it's equivalent to an unauthenticated user. |

### What Actually Protects SnapUp

| Layer | Protection | Status |
|-------|-----------|--------|
| **Row Level Security (RLS)** | Every table has RLS policies controlling who can read/write | ✅ 51/51 tables |
| **Edge Functions** | All sensitive operations (payments, emails, shipping) run server-side | ✅ 29 functions |
| **Server-side Secrets** | PayFast, ShipLogic, SendGrid, VAPID keys stored as edge function secrets | ✅ 9 secrets |
| **Runtime Guard** | `supabase.ts` includes a runtime check that throws an error if a service_role key is accidentally used | ✅ Active |
| **Auth Policies** | Users can only access their own profiles, orders, messages, etc. | ✅ Configured |
| **POPIA Compliance** | Consent banners, encrypted delivery addresses, data deletion, anonymized buyer info | ✅ Implemented |

### Key Types Explained

| Key | Location | Purpose | Security |
|-----|----------|---------|----------|
| **Anon key** | `src/lib/supabase.ts` (client) | Browser → Supabase queries | Safe — restricted by RLS |
| **Service role key** | ❌ NOT in codebase | Server-side admin access | Would bypass RLS — never expose |
| **GATEWAY_API_KEY** | Edge function secret | AI, Email, Payment gateways | Server-side only ✅ |
| **PAYFAST_MERCHANT_KEY** | Edge function secret | Live payment processing | Server-side only ✅ |

### Security Audit Checklist

Run this before each major release:

- [ ] `grep -r "service_role" src/` returns no results
- [ ] `grep -r "GATEWAY_API_KEY" src/` returns no results (should only be in edge functions)
- [ ] All tables in Supabase Dashboard → Database → Tables show RLS: ON
- [ ] Edge function secrets are set (Supabase Dashboard → Edge Functions → Secrets)
- [ ] GitHub repo is **Private** (contains Supabase URL which identifies the project)
- [ ] `supabase.ts` runtime guard is present (throws on service_role detection)

---


## 8. Post-Deployment Verification

### Quick Smoke Test

After `https://snapup.co.za` is live, verify these flows:

| Test | URL / Action | Expected |
|------|-------------|----------|
| **Homepage loads** | `https://snapup.co.za` | Hero, categories, listings grid |
| **HTTPS redirect** | `http://snapup.co.za` | Redirects to `https://` |
| **WWW redirect** | `https://www.snapup.co.za` | Redirects to `https://snapup.co.za` |
| **SPA routing** | `https://snapup.co.za/login` | Login page (not 404) |
| **SPA routing** | `https://snapup.co.za/buyer-protection` | Buyer protection page |
| **404 handling** | `https://snapup.co.za/nonexistent` | Custom 404 page |
| **PWA manifest** | `https://snapup.co.za/manifest.json` | Valid JSON manifest |
| **Service Worker** | DevTools → Application → Service Workers | SW registered and active |
| **robots.txt** | `https://snapup.co.za/robots.txt` | Correct robots file |
| **sitemap.xml** | `https://snapup.co.za/sitemap.xml` | Valid XML sitemap |
| **Security headers** | DevTools → Network → Response Headers | HSTS, CSP, X-Frame-Options |

### Key Flow Tests

1. **Browse** — Visit homepage, scroll listings, filter by category, search
2. **Sign Up** — Create new account, verify email
3. **Sign In** — Log in with existing account
4. **Post Item** — Create a new listing with images
5. **Buy (Sandbox)** — Click "Buy Now" on a listing, complete PayFast sandbox checkout
   - Use test card: `4000 0000 0000 0002` / CVV `123` / any future expiry
6. **Chat** — Send a message to a seller
7. **Dashboard** — Check seller dashboard, orders, earnings
8. **Track Order** — Use public tracking page
9. **PWA Install** — On mobile Chrome, check "Add to Home Screen" prompt
10. **Offline Mode** — Turn off WiFi, verify cached content loads

### Performance Check

Run Lighthouse audit:
```
Chrome DevTools → Lighthouse → Generate Report
```

Target scores:
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: ✅ Installable

---

## 9. Ongoing Maintenance

### Auto-Deployments

Every push to `main` branch triggers a new production deployment on Vercel.

### Monitoring

- **Vercel Analytics:** Enable in Vercel Dashboard → Analytics (free tier includes basic analytics)
- **Sentry:** Already configured via `SENTRY_DSN` for error tracking
- **Supabase Dashboard:** Monitor database, auth, edge function logs

### Cache Invalidation

Vercel handles cache invalidation automatically on each deploy. Static assets in `/assets/` use content-hash filenames (Vite default), so they're cache-busted automatically.

### Service Worker Updates

When you deploy a new version:
1. Vite generates new hashed asset filenames
2. `sw.js` is served with `Cache-Control: no-cache` (configured in `vercel.json`)
3. The SW update flow in `sw-register.ts` detects the new version
4. Users see an "Update Available" prompt

### Domain Renewal

- **snapup.co.za** registered at Domains.co.za
- Set auto-renewal ON to prevent accidental expiry
- Typical .co.za renewal: ~R50-80/year

---

## Quick Reference

| Item | Value |
|------|-------|
| **Production URL** | `https://snapup.co.za` |
| **Vercel Dashboard** | `https://vercel.com/dashboard` |
| **Supabase Dashboard** | `https://iorzfbaxvpcklbyngtpi.databasepad.com` |
| **DNS Provider** | Domains.co.za |
| **A Record** | `76.76.21.21` |
| **CNAME (www)** | `cname.vercel-dns.com` |
| **SSL** | Auto (Let's Encrypt via Vercel) |
| **PayFast Mode** | Sandbox (default) — toggle in Settings |
| **Framework** | Vite 5 + React 18 |
| **Node.js** | 18.x or 20.x |

---

## Troubleshooting

### "Page Not Found" on direct URL access
→ Check that `vercel.json` rewrites are working. The SPA rewrite sends all non-asset routes to `/index.html`.

### DNS not resolving
→ Wait up to 48 hours. Check with `dig snapup.co.za A +short`. Ensure no conflicting records at Domains.co.za.

### SSL certificate not provisioning
→ Vercel needs DNS to resolve to their IP first. Check Vercel Dashboard → Domains for status. May take a few minutes after DNS propagates.

### PayFast ITN (Instant Transaction Notification) not working
→ Ensure the `payfast-itn` edge function URL is accessible. PayFast sends POST requests to your notify_url. The edge function handles this server-side.

### Service Worker not updating
→ Hard refresh (Ctrl+Shift+R) or clear site data in DevTools → Application → Clear Storage.

---

*Last updated: 24 February 2026*
