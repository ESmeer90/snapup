import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, ShoppingBag } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ForgotPasswordModal from '@/components/snapup/ForgotPasswordModal';
import SEOHead from '@/components/snapup/SEOHead';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Missing fields', description: 'Please enter your email and password.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
      navigate('/', { replace: true });
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message || 'Invalid email or password. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <SEOHead
        title="Sign In"
        description="Sign in to your SnapUp account. Access your listings, messages, orders, and seller dashboard on South Africa's trusted marketplace."
        canonical="/login"
        ogUrl="/login"
      />

      {/* Top Bar */}
      <header className="w-full px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-all">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Snap<span className="text-blue-600">Up</span></span>
          </Link>
          <Link
            to="/signup"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            Create Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[460px]">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 overflow-hidden">
            {/* Header Section */}
            <div className="px-6 sm:px-8 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-gray-500 mt-2 text-sm sm:text-base">
                Sign in to your SnapUp account to continue buying and selling
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-8 space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400"
                    placeholder="Enter your password"
                    minLength={6}
                    required
                    autoComplete="current-password"
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
              </div>

              {/* Remember Me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                />
                <span className="text-sm text-gray-600">Keep me signed in</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wider font-medium">or</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                    Create one for free
                  </Link>
                </p>
              </div>
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
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <span>SA Based</span>
          </div>

          {/* Contact */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Need help? Contact{' '}
            <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-500 hover:underline">
              snapmart.officialapp@gmail.com
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 text-center">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} SnapUp Marketplace. All rights reserved. | Kimberley, Northern Cape, South Africa
          {' | '}
          <a href="/privacy-policy" className="text-blue-400 hover:underline">Privacy Policy</a>
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={email}
      />
    </div>
  );
};

export default LoginPage;
