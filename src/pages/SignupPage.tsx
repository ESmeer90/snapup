import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { SA_PROVINCES, type SAProvince } from '@/types';
import {
  Eye, EyeOff, Mail, Lock, User, MapPin, Shield, ArrowRight,
  CheckCircle2, UserPlus, ArrowLeft
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import SEOHead from '@/components/snapup/SEOHead';


const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [province, setProvince] = useState<SAProvince>('Northern Cape');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: 'Full name required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    if (!email.trim()) {
      toast({ title: 'Email required', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure both passwords match.', variant: 'destructive' });
      return;
    }
    if (!popiaConsent) {
      toast({ title: 'POPIA Consent Required', description: 'You must consent to the processing of your personal information to create an account.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName, province);
      setSuccess(true);
      toast({ title: 'Account Created!', description: 'Welcome to SnapUp! Please check your email to verify your account.' });
    } catch (err: any) {
      toast({ title: 'Signup failed', description: err.message || 'Something went wrong. Please try again.', variant: 'destructive' });
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Account Created!</h1>
            <p className="text-gray-500 mb-2">
              Welcome to SnapUp, <span className="font-semibold text-gray-700">{fullName}</span>!
            </p>
            <p className="text-sm text-gray-400 mb-8">
              We've sent a verification email to <span className="font-medium text-gray-600">{email}</span>. 
              Please check your inbox and verify your email to get started.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                Start Browsing
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/login"
                className="block w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all text-center"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Didn't receive the email? Contact{' '}
            <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-500 hover:underline">
              snapmart.officialapp@gmail.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <SEOHead
        title="Create Account - Join Free"
        description="Create your free SnapUp account. Join South Africa's fastest growing marketplace. Buy and sell electronics, vehicles, fashion and more. POPIA compliant."
        canonical="/signup"
        ogUrl="/signup"
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
            to="/login"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-[520px]">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-8 pb-5 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Your Account</h1>
              <p className="text-gray-500 mt-2 text-sm sm:text-base">
                Join South Africa's fastest growing marketplace — it's free!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-8 space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="signup-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400"
                    placeholder="e.g. Thabo Mokoena"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder-gray-400"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
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
                <label htmlFor="signup-confirm-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-11 pr-11 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm placeholder-gray-400 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : confirmPassword && confirmPassword === password
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Re-enter your password"
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
                {confirmPassword && confirmPassword === password && (
                  <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Province */}
              <div>
                <label htmlFor="signup-province" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Province
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                  <select
                    id="signup-province"
                    value={province}
                    onChange={(e) => setProvince(e.target.value as SAProvince)}
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    {SA_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* POPIA Consent */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">POPIA Data Protection Notice</p>
                    <p className="text-xs text-blue-700/80 mt-1.5 leading-relaxed">
                      In compliance with South Africa's Protection of Personal Information Act (POPIA), 
                      your personal data will only be processed for SnapUp marketplace services. 
                      We will never share your information with third parties without your explicit consent. 
                      You may request access to, correction, or deletion of your personal data at any time 
                      by contacting{' '}
                      <a href="mailto:snapmart.officialapp@gmail.com" className="font-medium underline">
                        snapmart.officialapp@gmail.com
                      </a>.
                    </p>
                    <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={popiaConsent}
                        onChange={(e) => setPopiaConsent(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 transition-colors"
                      />
                      <span className="text-xs text-blue-800 font-medium leading-relaxed group-hover:text-blue-900">
                        I consent to the processing of my personal information as described above, 
                        in accordance with POPIA regulations.
                        <span className="text-red-500 ml-0.5">*</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !popiaConsent}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] text-sm sm:text-base flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                By creating an account, you agree to our{' '}
                <a href="/terms-of-service" className="text-blue-500 hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</a>.
              </p>



              {/* Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wider font-medium">or</span>
                </div>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                    Sign In
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
          <p className="text-center text-xs text-gray-400 mt-4 pb-6">
            Need help? Contact{' '}
            <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-500 hover:underline">
              snapmart.officialapp@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignupPage;
