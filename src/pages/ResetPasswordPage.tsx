import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Eye, EyeOff, Lock, ArrowRight, Shield, CheckCircle2,
  KeyRound, AlertTriangle, ShoppingBag
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Password strength
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-blue-500' };
    return { score: 5, label: 'Very Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Listen for the PASSWORD_RECOVERY event from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[ResetPassword] Auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        // User might have been redirected with a valid session
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user might have clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // Check URL for recovery tokens (hash fragment)
        const hash = window.location.hash;
        if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
          // Supabase will handle this automatically via onAuthStateChange
          // Wait a moment for the event to fire
          setTimeout(() => {
            setSessionReady((prev) => {
              if (!prev) {
                setSessionError(true);
              }
              return prev;
            });
          }, 5000);
        } else {
          // No recovery token in URL - show error after a brief wait
          setTimeout(() => {
            setSessionReady((prev) => {
              if (!prev) {
                setSessionError(true);
              }
              return prev;
            });
          }, 3000);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (passwordStrength.score < 2) {
      setError('Please choose a stronger password. Add uppercase letters, numbers, or special characters.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (updateError.message?.includes('same as')) {
          setError('New password must be different from your current password.');
        } else if (updateError.message?.includes('weak')) {
          setError('Password is too weak. Please use a stronger password.');
        } else {
          setError(updateError.message || 'Failed to update password. Please try again.');
        }
      } else {
        setSuccess(true);
        toast({
          title: 'Password Updated!',
          description: 'Your password has been successfully changed. You can now sign in with your new password.',
        });
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 p-8 sm:p-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Password Updated!</h1>
            <p className="text-gray-500 mb-2">
              Your password has been successfully changed.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              You can now sign in with your new password.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                Go to Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
              >
                Go to Homepage
              </button>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Your password is encrypted and secure</span>
          </div>
        </div>
      </div>
    );
  }

  // Session error - invalid or expired link
  if (sessionError && !sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 p-8 sm:p-10">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Link Expired or Invalid</h1>
            <p className="text-gray-500 mb-2 text-sm">
              This password reset link has expired or is invalid.
            </p>
            <p className="text-xs text-gray-400 mb-8">
              Reset links expire after 1 hour for security. Please request a new one.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                Back to Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Need help? Contact{' '}
            <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-500 hover:underline">
              snapmart.officialapp@gmail.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Loading state while waiting for session
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 p-8 sm:p-10">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="animate-spin w-8 h-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Reset Link</h2>
            <p className="text-sm text-gray-500">Please wait while we verify your password reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Top Bar */}
      <header className="w-full px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-all">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Snap<span className="text-blue-600">Up</span></span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[460px]">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <KeyRound className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Set New Password</h1>
              <p className="text-gray-500 mt-2 text-sm sm:text-base">
                Choose a strong password for your SnapUp account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-8 space-y-5">
              {/* New Password */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {/* Password Strength */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${
                      passwordStrength.score <= 1 ? 'text-red-500' :
                      passwordStrength.score <= 2 ? 'text-orange-500' :
                      passwordStrength.score <= 3 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className={`w-full pl-11 pr-11 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm placeholder-gray-400 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : confirmPassword && confirmPassword === password
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Re-enter your new password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && password.length >= 6 && (
                  <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* Password Tips */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Password Tips:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Include uppercase letters
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Include numbers
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    Include special characters (!@#$%)
                  </li>
                </ul>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating Password...
                  </>
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>POPIA Compliant</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <span>256-bit Encryption</span>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            &copy; {new Date().getFullYear()} SnapUp Marketplace. Kimberley, Northern Cape, South Africa
          </p>
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
