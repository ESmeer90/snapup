/**
 * SnapUp — Supabase Client Configuration
 * ========================================
 * 
 * SECURITY MODEL (READ BEFORE MODIFYING):
 * 
 * The `supabaseKey` below is a Supabase **anon** (anonymous) key. This is NOT a secret.
 * It is intentionally included in client-side code — this is how Supabase is designed.
 * 
 * Why this is safe:
 * 1. The anon key can ONLY access data permitted by Row Level Security (RLS) policies.
 *    All 51 SnapUp tables have RLS enabled (verified 2026-02-25).
 * 2. The JWT payload contains `"role":"anon"` — it has no elevated privileges.
 * 3. Even if moved to environment variables (import.meta.env.VITE_*), the key would
 *    still be visible in the compiled JavaScript bundle. Env vars provide ZERO additional
 *    security for client-side keys — they are embedded at build time.
 * 4. No service_role key exists in this codebase. All privileged operations (payments,
 *    email, shipping, account deletion) go through Supabase Edge Functions which use
 *    server-side secrets that are NEVER exposed to the browser.
 * 
 * What actually protects the database:
 * - Row Level Security (RLS) on every table
 * - Edge Functions for sensitive operations (payments, ShipLogic, SendGrid, VAPID)

 * - Server-side secrets stored in Supabase Edge Function environment variables
 * - Auth policies that restrict data access to the authenticated user's own records
 * 
 * Reference: https://supabase.com/docs/guides/api/api-keys
 *   "The anon key is safe to use in a browser if you have enabled Row Level Security."
 * 
 * DO NOT:
 * - Add a service_role key to this file (it bypasses RLS — server-side only)
 * - Remove the runtime guard below (it prevents accidental service_role exposure)
 * - Replace with import.meta.env without configuring deployment env vars first
 * 
 * Last security audit: 2026-02-25
 *   ✅ 51/51 tables have RLS enabled
 *   ✅ No service_role key in codebase
 *   ✅ All sensitive ops go through edge functions
 *   ✅ Payment credentials stored as edge function secrets
 *   ✅ POPIA-compliant data handling

 */

import { createClient } from '@supabase/supabase-js';

// Database connection — SnapUp Production (anon key — safe for client-side, protected by RLS)
const supabaseUrl = 'https://utnljvoxdevwxownsznk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0bmxqdm94ZGV2d3hvd25zem5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzY0NDUsImV4cCI6MjA4NzcxMjQ0NX0.RrL2IiH0spMRZPwhTnvZQZCFHVD7njU-MJkFCLZamR4';


// ── Runtime Security Guard ──────────────────────────────────────────────
// Verify this is an anon key, not a service_role key (which should NEVER be in client code).
// The JWT payload is the second base64-encoded segment of the token.
try {
  const payload = JSON.parse(atob(supabaseKey.split('.')[1]));
  if (payload.role === 'service_role') {
    throw new Error(
      '[SECURITY] service_role key detected in client code! ' +
      'This key bypasses Row Level Security and must ONLY be used in server-side edge functions. ' +
      'Replace with the anon key immediately.'
    );
  }
  if (payload.role !== 'anon') {
    console.warn(
      `[Security] Unexpected Supabase key role: "${payload.role}". Expected "anon".`
    );
  }
} catch (e: any) {
  // Only re-throw if it's our security error, not a parsing error
  if (e.message?.includes('[SECURITY]')) {
    throw e;
  }
  // JWT parsing failed — non-standard token format, proceed with caution
  console.warn('[Security] Could not verify Supabase key role:', e.message);
}

// ── Create Client ───────────────────────────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
