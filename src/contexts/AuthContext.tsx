import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile, ensureProfile } from '@/lib/api';
import type { Profile } from '@/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileError: string | null;
  sessionExpired: boolean;
  refreshProfile: () => Promise<void>;
  refreshSessionNow: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  profileError: null,
  sessionExpired: false,
  refreshProfile: async () => {},
  refreshSessionNow: async () => false,
});

export const useAuth = () => useContext(AuthContext);

// Timeout wrapper: resolves with fallback after timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Build a minimal profile from auth user data
function buildMinimalProfile(authUser: User): Profile {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email || '',
    full_name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User',
    province: meta.province || 'Northern Cape',
    phone: meta.phone || '',
    bio: '',
    created_at: authUser.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Profile;
}

// ─── Session Watchdog Config ───
const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // Consider user inactive after 15 min
const SESSION_EXPIRY_BUFFER_S = 120; // Refresh if token expires within 2 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileLoadAttemptRef = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Safety timeout: force loading=false after 8 seconds no matter what
  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('[AuthProvider] Safety timeout: forcing loading=false after 8s');
        }
        return false;
      });
    }, 8000);
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  // ─── Track user activity (mouse, keyboard, touch, scroll) ───
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

    return () => {
      events.forEach(evt => window.removeEventListener(evt, updateActivity));
    };
  }, []);

  // ─── Session Watchdog: auto-refresh every 10 minutes while user is active ───
  useEffect(() => {
    const checkAndRefreshSession = async () => {
      // Only refresh if user is active (had activity within the timeout window)
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > ACTIVITY_TIMEOUT_MS) {
        console.log('[SessionWatchdog] User inactive for', Math.round(timeSinceActivity / 60000), 'min — skipping refresh');
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData?.session;

        if (!currentSession) {
          // No session — if we had a user before, mark as expired
          if (user) {
            console.warn('[SessionWatchdog] No session found but user exists — session expired');
            setSessionExpired(true);
          }
          return;
        }

        // Check if token is close to expiring
        const expiresAt = currentSession.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);

        if (expiresAt && (expiresAt - nowSec) < SESSION_EXPIRY_BUFFER_S) {
          console.log('[SessionWatchdog] Token expiring in', expiresAt - nowSec, 's — refreshing proactively');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn('[SessionWatchdog] Refresh failed:', refreshError.message);
            // If refresh fails and token is actually expired, mark as expired
            if (expiresAt < nowSec) {
              setSessionExpired(true);
            }
          } else if (refreshData?.session) {
            console.log('[SessionWatchdog] Session refreshed successfully, new expiry:', refreshData.session.expires_at);
            setSession(refreshData.session);
            setSessionExpired(false);
          }
        } else if (expiresAt && expiresAt < nowSec) {
          // Token already expired
          console.warn('[SessionWatchdog] Token already expired — attempting refresh');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            setSessionExpired(true);
          } else if (refreshData?.session) {
            setSession(refreshData.session);
            setSessionExpired(false);
          }
        } else {
          // Token is still fresh
          setSessionExpired(false);
        }
      } catch (err: any) {
        console.warn('[SessionWatchdog] Error:', err.message);
      }
    };

    // Start the watchdog interval
    watchdogIntervalRef.current = setInterval(checkAndRefreshSession, SESSION_REFRESH_INTERVAL_MS);

    // Also run once immediately after mount (after a short delay to let initial auth settle)
    const initialCheck = setTimeout(checkAndRefreshSession, 5000);

    return () => {
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
      clearTimeout(initialCheck);
    };
  }, [user]);

  // ─── Manual session refresh (exposed to components) ───
  const refreshSessionNow = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[AuthProvider] Manual session refresh requested');

      // First try getting current session
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session;

      if (currentSession) {
        const expiresAt = currentSession.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);

        // If session is still valid and not expiring soon, just clear the expired flag
        if (expiresAt && (expiresAt - nowSec) > SESSION_EXPIRY_BUFFER_S) {
          console.log('[AuthProvider] Session still valid, clearing expired flag');
          setSessionExpired(false);
          setSession(currentSession);
          return true;
        }
      }

      // Attempt refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.warn('[AuthProvider] Manual refresh failed:', refreshError.message);
        setSessionExpired(true);
        return false;
      }

      if (refreshData?.session) {
        console.log('[AuthProvider] Manual refresh succeeded');
        setSession(refreshData.session);
        setUser(refreshData.session.user);
        setSessionExpired(false);
        return true;
      }

      setSessionExpired(true);
      return false;
    } catch (err: any) {
      console.error('[AuthProvider] Manual refresh error:', err.message);
      setSessionExpired(true);
      return false;
    }
  }, []);

  const loadProfile = useCallback(async (authUser: User) => {
    const attemptId = ++profileLoadAttemptRef.current;
    setProfileError(null);
    console.log('[AuthProvider] loadProfile start for user:', authUser.id);

    try {
      // Attempt 1: Direct profile fetch (3s timeout)
      let p = await withTimeout(getProfile(authUser.id), 3000, null);
      if (attemptId !== profileLoadAttemptRef.current) return; // stale
      if (p) {
        console.log('[AuthProvider] Profile loaded from getProfile');
        setProfile(p);
        return;
      }

      // Attempt 2: ensureProfile RPC + edge function (4s timeout)
      p = await withTimeout(ensureProfile(), 4000, null);
      if (attemptId !== profileLoadAttemptRef.current) return;
      if (p) {
        console.log('[AuthProvider] Profile loaded from ensureProfile');
        setProfile(p);
        return;
      }

      // Attempt 3: Try direct insert via supabase client
      console.log('[AuthProvider] Attempting direct profile insert...');
      const minimalProfile = buildMinimalProfile(authUser);
      const { data: insertedData, error: insertError } = await withTimeout(
        supabase.from('profiles').upsert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: minimalProfile.full_name,
          province: minimalProfile.province,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' }).select().single(),
        3000,
        { data: null, error: { message: 'Timeout' } } as any
      );
      if (attemptId !== profileLoadAttemptRef.current) return;
      if (!insertError && insertedData) {
        console.log('[AuthProvider] Profile created via direct insert');
        setProfile(insertedData as Profile);
        return;
      }

      // Attempt 4: Last resort - build from auth metadata (no DB)
      console.warn('[AuthProvider] All DB attempts failed, using minimal profile from auth metadata');
      setProfile(minimalProfile);
      setProfileError('Profile loaded from cache. Some features may be limited.');
    } catch (err: any) {
      console.error('[AuthProvider] loadProfile error:', err);
      // Even on error, build a minimal profile so the UI doesn't get stuck
      const fallback = buildMinimalProfile(authUser);
      setProfile(fallback);
      setProfileError(err?.message || 'Failed to load profile from server');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = user;
    if (currentUser) {
      await loadProfile(currentUser);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      setSessionExpired(false);
      if (sess?.user) {
        loadProfile(sess.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[AuthProvider] getSession error:', err);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        if (!mounted) return;
        setSession(sess);
        setUser(sess?.user ?? null);

        // Clear expired flag on any auth state change with a valid session
        if (sess) {
          setSessionExpired(false);
        }

        if (sess?.user) {
          await loadProfile(sess.user);
        } else {
          setProfile(null);
          setProfileError(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, profileError,
      sessionExpired, refreshProfile, refreshSessionNow,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
