# SnapUp — GitHub + Vercel Deployment Guide

> **For:** Elrico Smeer (elricosmeer25@gmail.com)  
> **Domain:** snapup.co.za (registered at Domains.co.za)  
> **Date:** 24 February 2026

---

## Overview

This guide walks you through 4 steps:
1. **Download** the SnapUp source code from Famous.ai
2. **Push** it to a new GitHub repository
3. **Deploy** to Vercel (free tier)
4. **Connect** snapup.co.za as custom domain

**Estimated time:** 15–20 minutes

---

## STEP 1: Download the Source Code

### Option A — Famous.ai "Export" / "Download" Button (Easiest)

1. In the Famous.ai workspace where you're reading this, look for a **"Download"**, **"Export"**, or **"Code"** button — usually in the top-right toolbar or sidebar
2. Click it to download a `.zip` file of the entire project
3. Save it to your computer (e.g., `~/Downloads/snapup.zip`)
4. Extract the ZIP to a folder: `~/Projects/snapup/`

### Option B — Copy Files Manually

If there's no download button, you can copy each file manually. The complete file structure is listed at the end of this guide in [Appendix: Complete File List](#appendix-complete-file-list).

---

## STEP 2: Create a GitHub Repository

### 2A. Create the Repo on GitHub

1. Go to **https://github.com** and sign in (or create a free account)
2. Click the **"+"** button (top-right) → **"New repository"**
3. Fill in:

| Field | Value |
|-------|-------|
| **Repository name** | `snapup` |
| **Visibility** | **Private** (recommended — keeps your Supabase project URL private) |

| **Add .gitignore** | **None** (we already have one) |
| **Add license** | **None** (add later if needed) |

4. Click **"Create repository"**
5. You'll see a page with push instructions — **keep this page open**, you'll need the URL

Your repo URL will be: `https://github.com/YOUR_USERNAME/snapup.git`

---

### 2B. Push Code to GitHub

Choose ONE of these three methods:

---

#### Method 1: Git CLI (Recommended — fastest)

**Prerequisites:** Install Git from https://git-scm.com/downloads

Open Terminal (Mac/Linux) or Git Bash (Windows) and run:

```bash
# 1. Navigate to your extracted project folder
cd ~/Projects/snapup

# 2. Initialize Git repository
git init

# 3. Add all files
git add .

# 4. Create first commit
git commit -m "Initial commit: SnapUp marketplace v1.0 - production ready"

# 5. Set the main branch
git branch -M main

# 6. Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/snapup.git

# 7. Push to GitHub
git push -u origin main
```

**If prompted for credentials:**
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (not your password!)
  - Go to: GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → Generate New Token
  - Select scopes: `repo` (full control)
  - Copy the token and use it as your password

**Verify:** Go to `https://github.com/YOUR_USERNAME/snapup` — you should see all files.

---

#### Method 2: GitHub Desktop (Easiest for beginners)

**Prerequisites:** Install GitHub Desktop from https://desktop.github.com/

1. Open **GitHub Desktop**
2. Sign in with your GitHub account
3. Click **File → Add Local Repository**
4. Browse to your extracted `snapup` folder
5. If it says "not a Git repository", click **"Create a Repository"**:
   - Name: `snapup`
   - Local Path: your extracted folder
   - Click **"Create Repository"**
6. You'll see all files listed as changes
7. In the bottom-left, type commit message: `Initial commit: SnapUp marketplace v1.0`
8. Click **"Commit to main"**
9. Click **"Publish repository"** (top bar)
   - Uncheck "Keep this code private" if you want it public (keep checked for private)
   - Click **"Publish Repository"**

**Verify:** Go to `https://github.com/YOUR_USERNAME/snapup` — you should see all files.

---

#### Method 3: GitHub Web Upload (No Git required — slowest)

⚠️ **Note:** GitHub web upload has a limit of ~100 files at a time, so you may need multiple uploads.

1. Go to your new empty repo: `https://github.com/YOUR_USERNAME/snapup`
2. Click **"uploading an existing file"** link
3. Drag and drop ALL files and folders from your extracted `snapup` folder
4. Scroll down, type commit message: `Initial commit: SnapUp marketplace v1.0`
5. Click **"Commit changes"**

**If you have too many files:** Use the Git CLI method instead, or upload in batches (root files first, then `src/`, then `public/`).

---

## STEP 3: Deploy to Vercel

### 3A. Import Project to Vercel

1. Go to **https://vercel.com** and sign in with `elricosmeer25@gmail.com`
2. Click **"Add New…"** → **"Project"**
3. Under "Import Git Repository":
   - If you haven't connected GitHub yet, click **"Connect GitHub"** and authorize Vercel
   - Find and select the **`snapup`** repository
   - Click **"Import"**

### 3B. Configure Build Settings

Vercel will auto-detect Vite. Confirm these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `./` (default) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 20.x |

### 3C. Environment Variables

**No environment variables needed!** ✅

The Supabase URL and **anon key** are hardcoded in `src/lib/supabase.ts`. This is safe — the anon key is a public client-side key protected by Row Level Security (RLS) on all 51 database tables. It is NOT a secret and provides no elevated access. Moving it to env vars would not improve security (Vite embeds env vars in the JS bundle at build time, making them equally visible). See `DEPLOYMENT.md` Section 7b for the full security architecture.

All backend secrets (GATEWAY_API_KEY, SHIPLOGIC_API_KEY, SENDGRID_API_KEY, SENTRY_DSN, VAPID keys, PayFast credentials) are stored as Supabase Edge Function secrets — they never touch Vercel or the browser.

### 3D. Deploy

1. Click **"Deploy"**
2. Wait 1–3 minutes for the build to complete
3. You'll see a success screen with a URL like: **`https://snapup-xxxxx.vercel.app`**
4. Click the URL to verify the app loads correctly

🎉 **Your app is now live on Vercel!**

---

## STEP 4: Connect Custom Domain (snapup.co.za)

### 4A. Add Domain in Vercel

1. In Vercel, go to your **SnapUp project** → **Settings** → **Domains**
2. Type `snapup.co.za` and click **"Add"**
3. Vercel will show you the required DNS records
4. Also add `www.snapup.co.za` — Vercel will auto-redirect www → apex

### 4B. Add DNS Records at Domains.co.za

1. Log in to **https://www.domains.co.za**
2. Go to **My Domains** → click **snapup.co.za** → **DNS Management** (or "Manage DNS")
3. **Delete any existing A or CNAME records** for `@` and `www` first!
4. Add these **exact** records:

#### Record 1 — Apex Domain (snapup.co.za)

| Field | Value |
|-------|-------|
| **Type** | `A` |
| **Name / Host** | `@` (or leave blank) |
| **Value / Points to** | `76.76.21.21` |
| **TTL** | `3600` (1 Hour) |

#### Record 2 — WWW Subdomain

| Field | Value |
|-------|-------|
| **Type** | `CNAME` |
| **Name / Host** | `www` |
| **Value / Points to** | `cname.vercel-dns.com` |
| **TTL** | `3600` (1 Hour) |

5. Click **Save** / **Update DNS**

### 4C. Wait for DNS Propagation

- Usually takes **5–30 minutes**, can take up to 48 hours
- Check progress at: **https://dnschecker.org/#A/snapup.co.za**
- When you see `76.76.21.21` appearing globally, you're good

### 4D. Verify HTTPS

Vercel automatically provisions a **free Let's Encrypt SSL certificate** once DNS resolves.

- Go to Vercel → Settings → Domains
- Both `snapup.co.za` and `www.snapup.co.za` should show ✅ **Valid Configuration**
- Visit **https://snapup.co.za** — should load with a padlock icon

---

## STEP 5: Post-Deployment Configuration

### 5A. Update Supabase Auth Redirect URLs (CRITICAL!)

Without this, password reset and email confirmation won't work on the live domain.

1. Go to your **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://snapup.co.za`
3. Add to **Redirect URLs**:
   ```
   https://snapup.co.za/**
   https://snapup.co.za/reset-password
   ```
4. Keep existing localhost entries for development

### 5B. PayFast Configuration

PayFast defaults to **sandbox (test) mode** — safe for initial launch.

**To switch to live payments when ready:**
1. In the SnapUp app → **Settings** → **PayFast Credentials**
2. Enter your live PayFast Merchant ID, Merchant Key, and Passphrase
3. Toggle sandbox mode OFF

> ⚠️ **Keep sandbox ON until you've tested the full buy flow on production!**

### 5C. Test Key Flows

| Test | How | Expected Result |
|------|-----|-----------------|
| **Homepage** | Visit `https://snapup.co.za` | Hero, categories, listings load |
| **HTTPS** | Visit `http://snapup.co.za` | Redirects to `https://` |
| **WWW redirect** | Visit `https://www.snapup.co.za` | Redirects to `https://snapup.co.za` |
| **SPA routing** | Visit `https://snapup.co.za/login` | Login page (not 404) |
| **Sign up** | Create new account | Verification email sent |
| **Sign in** | Log in | Dashboard loads |
| **Browse** | Scroll homepage | Listings, categories, search work |
| **Post item** | Create a listing | Image upload + listing appears |
| **Buy (sandbox)** | Click Buy Now | PayFast sandbox checkout works |
| **Chat** | Message a seller | Real-time chat works |
| **Dashboard** | Check seller dashboard | Orders, earnings display |
| **Track order** | Visit `/track` | Tracking page loads |
| **PWA** | Mobile Chrome → "Add to Home Screen" | App installs |
| **Offline** | Turn off WiFi | Cached content loads |

---

## STEP 6: Ongoing Deployments

After the initial setup, every push to the `main` branch on GitHub will **automatically trigger a new deployment** on Vercel.

```bash
# Make changes to your code, then:
git add .
git commit -m "Update: description of changes"
git push origin main
# Vercel auto-deploys in ~1-2 minutes
```

---

## Quick Reference Card

| Item | Value |
|------|-------|
| **Production URL** | `https://snapup.co.za` |
| **Vercel Dashboard** | `https://vercel.com/dashboard` (sign in as elricosmeer25@gmail.com) |
| **GitHub Repo** | `https://github.com/YOUR_USERNAME/snapup` |
| **Supabase Dashboard** | Check your Supabase project settings |
| **DNS Provider** | Domains.co.za |
| **A Record** | `@` → `76.76.21.21` |
| **CNAME (www)** | `www` → `cname.vercel-dns.com` |
| **SSL** | Automatic (Let's Encrypt via Vercel) |
| **PayFast Mode** | Sandbox (default) — toggle in Settings |
| **Framework** | Vite 5 + React 18 + TypeScript |
| **Node.js** | 20.x |

---

## Troubleshooting

### Build fails on Vercel
- Check the build logs in Vercel dashboard
- Most common: TypeScript errors. Try setting "Ignore Build Errors" in Vercel → Settings → General → Build & Development Settings

### "Page Not Found" on direct URL access
- The `vercel.json` file handles SPA rewrites. Make sure it was uploaded to the repo root.

### DNS not resolving
- Wait up to 48 hours (usually 5-30 min)
- Check with: https://dnschecker.org/#A/snapup.co.za
- Ensure no conflicting records at Domains.co.za

### SSL certificate not provisioning
- Vercel needs DNS to resolve first. Check Vercel → Settings → Domains for status.

### PayFast ITN not working
- The ITN (webhook) URL points to Supabase edge functions directly — it doesn't change with your frontend domain.

### Service Worker not updating
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or: DevTools → Application → Clear Storage

---

## Appendix: Complete File List

These are ALL the files in your SnapUp project. If you downloaded the ZIP, verify these exist:

```
snapup/
├── .gitignore
├── DEPLOYMENT.md
├── GITHUB_DEPLOY_GUIDE.md
├── README.md
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json                    ← CRITICAL for Vercel deployment
├── vite.config.ts
│
├── public/
│   ├── favicon.svg
│   ├── manifest.json              ← PWA manifest
│   ├── placeholder.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── sw.js                      ← Service worker
│
└── src/
    ├── App.css
    ├── App.tsx                     ← Main app with routes
    ├── index.css
    ├── main.tsx                    ← Entry point
    │
    ├── components/
    │   ├── AppLayout.tsx           ← Main layout component
    │   ├── theme-provider.tsx
    │   │
    │   ├── snapup/                 ← All SnapUp components (70+ files)
    │   │   ├── AdminEmailLogsTab.tsx
    │   │   ├── AdminMaintenanceTab.tsx
    │   │   ├── AdminVerificationsTab.tsx
    │   │   ├── AuthModal.tsx
    │   │   ├── AvatarCropModal.tsx
    │   │   ├── BottomNav.tsx
    │   │   ├── BulkCSVImport.tsx
    │   │   ├── BuyerDeliveryConfirmModal.tsx
    │   │   ├── CTABanner.tsx
    │   │   ├── CartCheckoutModal.tsx
    │   │   ├── CartView.tsx
    │   │   ├── CategoryGrid.tsx
    │   │   ├── ChatListingCard.tsx
    │   │   ├── CheckoutModal.tsx
    │   │   ├── CommissionDisclosure.tsx
    │   │   ├── CreateListingModal.tsx
    │   │   ├── DashboardMessages.tsx
    │   │   ├── DeliveryAddressForm.tsx
    │   │   ├── DeliveryPhotoConfirmation.tsx
    │   │   ├── DeliveryReminderBanner.tsx
    │   │   ├── DisputeModal.tsx
    │   │   ├── DisputesList.tsx
    │   │   ├── EarningsPayouts.tsx
    │   │   ├── EditListingModal.tsx
    │   │   ├── EmailPreferencesSection.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── EscrowCountdownTimer.tsx
    │   │   ├── ExportOrdersModal.tsx
    │   │   ├── FavoritesView.tsx
    │   │   ├── FeaturesSection.tsx
    │   │   ├── Footer.tsx
    │   │   ├── ForgotPasswordModal.tsx
    │   │   ├── Header.tsx
    │   │   ├── Hero.tsx
    │   │   ├── ImageLightbox.tsx
    │   │   ├── ListingCard.tsx
    │   │   ├── ListingDetail.tsx
    │   │   ├── ListingsGrid.tsx
    │   │   ├── LiveTrackingView.tsx
    │   │   ├── MakeOfferModal.tsx
    │   │   ├── MapView.tsx
    │   │   ├── MessageInfoModal.tsx
    │   │   ├── MessagesView.tsx
    │   │   ├── MyListings.tsx
    │   │   ├── NotificationBell.tsx
    │   │   ├── NotificationPreferences.tsx
    │   │   ├── NotificationsView.tsx
    │   │   ├── OfferCard.tsx
    │   │   ├── OfflineIndicator.tsx
    │   │   ├── OrderDetailView.tsx
    │   │   ├── OrderLifecycleTimeline.tsx
    │   │   ├── OrderStatusNotifier.tsx
    │   │   ├── OrdersView.tsx
    │   │   ├── POPIAConsentBanner.tsx
    │   │   ├── PWAInstallBanner.tsx
    │   │   ├── PayFastCheckout.tsx
    │   │   ├── PayFastCredentialsTab.tsx
    │   │   ├── PriceAlertModal.tsx
    │   │   ├── PriceAlertsView.tsx
    │   │   ├── PromoBanner.tsx
    │   │   ├── ProvinceShowcase.tsx
    │   │   ├── PullToRefresh.tsx
    │   │   ├── RateSellerModal.tsx
    │   │   ├── RecentlyViewedSection.tsx
    │   │   ├── ReviewAnalytics.tsx
    │   │   ├── SEOHead.tsx
    │   │   ├── SalesReportExport.tsx
    │   │   ├── SavedSearchesView.tsx
    │   │   ├── SellerDashboard.tsx
    │   │   ├── SellerOrdersCSVExport.tsx
    │   │   ├── SellerReviewsView.tsx
    │   │   ├── SellerShippingDashboard.tsx
    │   │   ├── SellerVerificationForm.tsx
    │   │   ├── ShareButton.tsx
    │   │   ├── ShippingLabel.tsx
    │   │   ├── ShippingRateCalculator.tsx
    │   │   ├── TrackingTimeline.tsx
    │   │   ├── TrackingUpdateModal.tsx
    │   │   ├── TransactionsView.tsx
    │   │   ├── TrustBadge.tsx
    │   │   ├── TrustScoreWidget.tsx
    │   │   ├── UserProfileView.tsx
    │   │   └── WishlistView.tsx
    │   │
    │   └── ui/                     ← shadcn/ui components (50+ files)
    │       ├── accordion.tsx
    │       ├── alert-dialog.tsx
    │       ├── alert.tsx
    │       ├── aspect-ratio.tsx
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── breadcrumb.tsx
    │       ├── button.tsx
    │       ├── calendar.tsx
    │       ├── card.tsx
    │       ├── carousel.tsx
    │       ├── chart.tsx
    │       ├── checkbox.tsx
    │       ├── collapsible.tsx
    │       ├── command.tsx
    │       ├── context-menu.tsx
    │       ├── dialog.tsx
    │       ├── drawer.tsx
    │       ├── dropdown-menu.tsx
    │       ├── form.tsx
    │       ├── hover-card.tsx
    │       ├── input-otp.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── menubar.tsx
    │       ├── navigation-menu.tsx
    │       ├── pagination.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── resizable.tsx
    │       ├── scroll-area.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── slider.tsx
    │       ├── sonner.tsx
    │       ├── switch.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       ├── toast.tsx
    │       ├── toaster.tsx
    │       ├── toggle-group.tsx
    │       ├── toggle.tsx
    │       ├── tooltip.tsx
    │       └── use-toast.ts
    │
    ├── contexts/
    │   ├── AppContext.tsx
    │   ├── AuthContext.tsx
    │   ├── CartContext.tsx
    │   └── ChatContext.tsx
    │
    ├── hooks/
    │   ├── use-mobile.tsx
    │   ├── use-toast.ts
    │   └── useSwipeToClose.ts
    │
    ├── lib/
    │   ├── api.ts
    │   ├── commission.ts
    │   ├── export.ts
    │   ├── notification-sound.ts
    │   ├── offline-db.ts
    │   ├── payfast.ts
    │   ├── push-notifications.ts
    │   ├── sentry.ts
    │   ├── shipping.ts
    │   ├── spam-filter.ts
    │   ├── supabase.ts              ← Database client (URL + key hardcoded)
    │   ├── sw-register.ts
    │   └── utils.ts
    │
    ├── pages/
    │   ├── AdminPage.tsx
    │   ├── BuyerProtectionPage.tsx
    │   ├── Index.tsx
    │   ├── LoginPage.tsx
    │   ├── NotFound.tsx
    │   ├── PaymentReturn.tsx
    │   ├── PostItemPage.tsx
    │   ├── PrivacyPolicyPage.tsx
    │   ├── ResetPasswordPage.tsx
    │   ├── SettingsPage.tsx
    │   ├── SignupPage.tsx
    │   ├── TermsOfServicePage.tsx
    │   └── TrackingPage.tsx
    │
    └── types/
        └── index.ts
```

**Total: ~150+ files** across components, pages, contexts, hooks, libs, and config.

---

## Appendix: Key Configuration Files

### vercel.json (already in your project)
This file configures:
- SPA rewrites (all routes → index.html)
- www → apex redirect (301)
- Security headers (HSTS, CSP, X-Frame-Options)
- Static asset caching (1 year for /assets/)
- Service worker headers

### .gitignore (already in your project)
Excludes `node_modules/`, `dist/`, and editor files from Git.

### package.json
- Build command: `npm run build` (runs `vite build`)
- All 60+ dependencies listed

---

*Guide created: 24 February 2026*
*For support: Reference this guide when contacting Vercel or GitHub support.*
