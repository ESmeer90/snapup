import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import EmailPreferencesSection from '@/components/snapup/EmailPreferencesSection';
import SellerVerificationForm from '@/components/snapup/SellerVerificationForm';
import NotificationPreferences from '@/components/snapup/NotificationPreferences';
import { updateProfile, deleteAccount, signOut, updateBankDetails } from '@/lib/api';

import { getStorageEstimate } from '@/lib/offline-db';

import { SA_PROVINCES, SA_BANKS, type SAProvince } from '@/types';

import {
  ArrowLeft, User, MapPin, Shield, Loader2, CheckCircle2, Save,
  AlertTriangle, Trash2, Mail, Calendar, Lock, ExternalLink,
  CreditCard, Building2, Eye, EyeOff, Edit3, Banknote,
  RefreshCw, HardDrive, Database, WifiOff
} from 'lucide-react';



import { toast } from '@/components/ui/use-toast';

// ============ STORAGE & DATA SECTION ============
const StorageDataSection: React.FC = () => {
  const [storageUsage, setStorageUsage] = useState<{ used: number; quota: number; percent: number } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [loadingStorage, setLoadingStorage] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    setLoadingStorage(true);
    try {
      const estimate = await getStorageEstimate();
      setStorageUsage(estimate);
    } catch {
      setStorageUsage(null);
    } finally {
      setLoadingStorage(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleClearCache = async () => {
    setClearing(true);
    try {
      // Clear IndexedDB stores
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('snapup-offline', 2);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      
      const storeNames = ['messages', 'message_queue', 'listings'];
      for (const storeName of storeNames) {
        if (db.objectStoreNames.contains(storeName)) {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).clear();
          await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
        }
      }
      db.close();

      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      toast({ title: 'Cache cleared', description: 'All offline data, cached listings, and messages have been cleared.' });
      await loadStorageInfo();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to clear cache', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <HardDrive className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Storage & Data</h2>
          <p className="text-sm text-gray-500">Manage offline cache and local storage</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Storage Usage */}
        {loadingStorage ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            <span className="text-sm text-gray-500">Calculating storage usage...</span>
          </div>
        ) : storageUsage ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Device Storage Used</span>
              <span className="text-sm font-bold text-indigo-600">
                {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.quota)}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storageUsage.percent > 80 ? 'bg-red-500' :
                  storageUsage.percent > 50 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(storageUsage.percent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {storageUsage.percent.toFixed(1)}% of available storage used by SnapUp
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Storage estimate not available in this browser</span>
            </div>
          </div>
        )}

        {/* What's cached */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Chat Messages', icon: '💬', desc: 'Offline conversations' },
            { label: 'Listings', icon: '📦', desc: 'Recently viewed items' },
            { label: 'App Shell', icon: '⚡', desc: 'UI & static assets' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <span className="text-lg">{item.icon}</span>
              <p className="text-xs font-semibold text-gray-700 mt-1">{item.label}</p>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Offline info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <WifiOff className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p><strong>Offline data</strong> lets you browse recently viewed listings and read chat messages even without internet — great for areas with spotty 3G/4G coverage.</p>
            <p className="mt-1">Clearing the cache will remove all offline data. It will be rebuilt as you use the app.</p>
          </div>
        </div>

        {/* Clear cache button */}
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all disabled:opacity-50"
        >
          {clearing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Clearing...</>
          ) : (
            <><Trash2 className="w-4 h-4" />Clear All Cached Data</>
          )}
        </button>
      </div>
    </div>
  );
};



const SettingsContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileError, refreshProfile } = useAuth();

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [province, setProvince] = useState<SAProvince>('Northern Cape');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Bank details state
  const [bankEditing, setBankEditing] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});



  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  // Profile recovery state
  const [recovering, setRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const recoveryAttempted = React.useRef(false);

  // Initialize form from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setProvince((profile.province as SAProvince) || 'Northern Cape');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setBankName(profile.bank_name || '');
      setAccountHolder(profile.bank_account_holder || profile.full_name || '');
      setAccountNumber(profile.bank_account_number || '');
      setBranchCode(profile.bank_branch_code || '');
    }
  }, [profile]);

  // Computed values
  const hasBankDetails = !!(profile?.bank_name && profile?.bank_account_number && profile?.bank_branch_code);

  const maskAccountNumber = (num: string): string => {
    if (!num || num.length < 4) return '****';
    return '****' + num.slice(-4);
  };

  // Profile retry handler
  const handleRetryProfile = async () => {
    setRecovering(true);
    setRecoveryFailed(false);
    try {
      await refreshProfile();
      // Give it a moment
      await new Promise(r => setTimeout(r, 2000));
      if (!profile) {
        setRecoveryFailed(true);
      }
    } catch {
      setRecoveryFailed(true);
    } finally {
      setRecovering(false);
    }
  };

  // Save profile handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setProfileSaved(false);
    try {
      await updateProfile(user.id, {
        full_name: fullName.trim(),
        province,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      } as any);
      setProfileSaved(true);
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
      await refreshProfile();
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Save bank details handler
  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!bankName) errors.bankName = 'Please select a bank';
    if (!accountHolder.trim()) errors.accountHolder = 'Account holder name is required';
    if (!accountNumber || accountNumber.length < 5) errors.accountNumber = 'Valid account number required (min 5 digits)';
    if (!branchCode || branchCode.length < 5) errors.branchCode = 'Valid branch code required (5-7 digits)';
    if (Object.keys(errors).length > 0) {
      setBankErrors(errors);
      return;
    }
    setBankSaving(true);
    setBankSaved(false);
    try {
      await updateBankDetails({
        bank_name: bankName,
        bank_account_number: accountNumber,
        bank_branch_code: branchCode,
        bank_account_holder: accountHolder.trim(),
      });
      setBankSaved(true);
      setBankEditing(false);
      toast({ title: 'Bank details saved', description: 'Your banking information has been updated securely.' });
      await refreshProfile();
      setTimeout(() => setBankSaved(false), 5000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save bank details', variant: 'destructive' });
    } finally {
      setBankSaving(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      toast({ title: 'Account deleted', description: 'Your account and all data have been permanently removed.' });
      await signOut();
      window.location.href = '/';
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete account', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };


  // Loading state - auth still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Handle not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center h-16 gap-4">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-white font-black text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Snap<span className="text-blue-600">Up</span></span>
              </Link>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-500 mb-6">
              You need to be signed in to access your account settings. Your session may have expired.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/login"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                Sign In
              </Link>
              <Link to="/"
                className="px-6 py-3 text-gray-700 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle profile recovery / loading state - with timeout and retry
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <span className="text-white font-black text-lg">S</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 hidden sm:block">Snap<span className="text-blue-600">Up</span></span>
                </Link>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            {recovering ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Your Profile</h2>
                <p className="text-gray-500 mb-4 text-sm">
                  Setting up your account settings. This should only take a few seconds.
                </p>
                <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </>
            ) : recoveryFailed ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Load Failed</h2>
                <p className="text-gray-500 mb-2 text-sm">
                  We couldn't load your profile. This could be due to a slow connection or a server issue.
                </p>
                {profileError && (
                  <p className="text-xs text-red-500 mb-4 bg-red-50 rounded-lg px-3 py-2 inline-block">
                    {profileError}
                  </p>
                )}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={handleRetryProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Reload Page
                  </button>
                  <Link to="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-all"
                  >
                    Go Home
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Preparing Settings</h2>
                <p className="text-gray-500 mb-6 text-sm">
                  Just a moment...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }



  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-white font-black text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Snap<span className="text-blue-600">Up</span></span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/privacy-policy" className="hidden sm:flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Privacy Policy</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-500 mt-2">Manage your profile, bank details, payment mode, and account. Your data is protected under POPIA.</p>
        </div>

        {/* Account Overview Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{profile.full_name || 'User'}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.province || 'Northern Cape'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {memberSince}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500">Update your name and contact details</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="settings-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input id="settings-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Thabo Mokoena"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input type="email" value={user.email || ''} disabled className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Lock className="w-3 h-3" />Email cannot be changed.</p>
              </div>

              <div>
                <label htmlFor="settings-province" className="block text-sm font-semibold text-gray-700 mb-1.5">Province <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                  <select id="settings-province" value={province} onChange={(e) => setProvince(e.target.value as SAProvince)}
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer">
                    {SA_PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                  <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <div>
                <label htmlFor="settings-phone" className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
                <input id="settings-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 072 123 4567"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" />
              </div>

              <div>
                <label htmlFor="settings-bio" className="block text-sm font-semibold text-gray-700 mb-1.5">Bio <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
                <textarea id="settings-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell buyers a bit about yourself..." rows={3} maxLength={300}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all text-sm" />
                <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/300</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] text-sm">
                {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : profileSaved ? (<><CheckCircle2 className="w-4 h-4" />Saved!</>) : (<><Save className="w-4 h-4" />Save Changes</>)}
              </button>
              {profileSaved && <span className="text-sm text-green-600 font-medium">Profile updated successfully</span>}
            </div>
          </div>
        </form>

        {/* ============ BANK DETAILS SECTION ============ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bank Details</h2>
                <p className="text-sm text-gray-500">Required for receiving payouts from sales</p>
              </div>
            </div>
            {hasBankDetails && !bankEditing && (
              <button onClick={() => setBankEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {hasBankDetails && !bankEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bank</p>
                  <p className="text-sm font-semibold text-gray-900">{profile.bank_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Account Holder</p>
                  <p className="text-sm font-semibold text-gray-900">{profile.bank_account_holder || profile.full_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Account Number</p>
                      <p className="text-sm font-semibold text-gray-900 font-mono">
                        {showAccountNumber ? profile.bank_account_number : maskAccountNumber(profile.bank_account_number || '')}
                      </p>
                    </div>
                    <button onClick={() => setShowAccountNumber(!showAccountNumber)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all" title={showAccountNumber ? 'Hide' : 'Show'}>
                      {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Branch Code</p>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{profile.bank_branch_code}</p>
                </div>
              </div>
              {bankSaved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 font-medium">Bank details saved securely</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveBankDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bank Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                  <select value={bankName} onChange={(e) => { setBankName(e.target.value); setBankErrors(prev => ({ ...prev, bankName: '' })); }}
                    className={`w-full pl-11 pr-10 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer ${bankErrors.bankName ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <option value="">Select your bank...</option>
                    {SA_BANKS.map((b) => (<option key={b} value={b}>{b}</option>))}
                  </select>
                  <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                {bankErrors.bankName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{bankErrors.bankName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Holder Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input type="text" value={accountHolder} onChange={(e) => { setAccountHolder(e.target.value); setBankErrors(prev => ({ ...prev, accountHolder: '' })); }}
                    placeholder="e.g. Thabo Mokoena" className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm ${bankErrors.accountHolder ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                </div>
                {bankErrors.accountHolder && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{bankErrors.accountHolder}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input type="text" value={accountNumber} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setAccountNumber(val); setBankErrors(prev => ({ ...prev, accountNumber: '' })); }}
                    placeholder="e.g. 1234567890" maxLength={20}
                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-mono ${bankErrors.accountNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                </div>
                {bankErrors.accountNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{bankErrors.accountNumber}</p>}
                <p className="text-xs text-gray-400 mt-1">Your account number is encrypted and stored securely</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Branch Code <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                  <input type="text" value={branchCode} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setBranchCode(val); setBankErrors(prev => ({ ...prev, branchCode: '' })); }}
                    placeholder="e.g. 632005" maxLength={7}
                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-mono ${bankErrors.branchCode ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                </div>
                {bankErrors.branchCode && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{bankErrors.branchCode}</p>}
                <p className="text-xs text-gray-400 mt-1">5-7 digit branch/universal code</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>POPIA Secure Storage:</strong> Your banking information is encrypted at rest and in transit. It is only used for processing payouts and is never shared with third parties.</p>
                    <p>You can update or remove your bank details at any time. Account numbers are masked in all displays and logs.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {hasBankDetails && (
                  <button type="button" onClick={() => { setBankEditing(false); setBankErrors({}); }}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={bankSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 text-sm">
                  {bankSaving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : (<><Save className="w-4 h-4" />Save Bank Details</>)}
                </button>
              </div>
            </form>
          )}
        </div>



        {/* ============ PUSH NOTIFICATIONS ============ */}
        <div className="mt-6">
          <NotificationPreferences />
        </div>




        {/* ============ EMAIL NOTIFICATIONS ============ */}
        <div className="mt-6">
          <EmailPreferencesSection />
        </div>

        {/* ============ SELLER VERIFICATION ============ */}
        <div className="mt-6">
          <SellerVerificationForm onVerificationSubmitted={() => refreshProfile()} />
        </div>

        {/* ============ STORAGE & DATA ============ */}
        <StorageDataSection />





        {/* POPIA Data Rights Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-base font-bold text-blue-900">Your POPIA Data Rights</h3>
              <p className="text-sm text-blue-800/80 mt-2 leading-relaxed">Under South Africa's Protection of Personal Information Act (POPIA), you have the right to:</p>
              <ul className="mt-3 space-y-2 text-sm text-blue-800/80">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /><span><strong>Access</strong> — Request a copy of all personal data we hold about you</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /><span><strong>Correction</strong> — Update or correct inaccurate personal information</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /><span><strong>Deletion</strong> — Request permanent erasure of all your personal data</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" /><span><strong>Object</strong> — Object to the processing of your personal information</span></li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/privacy-policy" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />Read Full Privacy Policy
                </Link>
                <a href="mailto:snapmart.officialapp@gmail.com?subject=POPIA%20Data%20Request" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline transition-colors">
                  <Mail className="w-3.5 h-3.5" />Submit Data Request
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border-2 border-red-200 p-6 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-600/80">Irreversible actions — proceed with caution</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <div>
                <h3 className="text-sm font-semibold text-red-900">Delete Account & All Data</h3>
                <p className="text-xs text-red-700/70 mt-1 max-w-md">Permanently delete your account and all associated data. Complies with POPIA Section 24.</p>
              </div>
              <button onClick={() => { setShowDeleteConfirm(true); setDeleteStep(1); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm whitespace-nowrap">
                <Trash2 className="w-4 h-4" />Delete Account
              </button>
            </div>
          ) : deleteStep === 1 ? (
            <div className="p-5 bg-red-50 rounded-xl border border-red-200 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-red-900">Are you absolutely sure?</h3>
                  <p className="text-sm text-red-800/80 mt-2">This will permanently delete:</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-red-800/80">
                    {['Your profile and personal information', 'All listings and uploaded images', 'All messages', 'All orders and transaction history', 'Bank details and payout records', 'Your authentication account'].map((item) => (
                      <li key={item} className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full" />{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={() => setDeleteStep(2)} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all">I Understand, Continue</button>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-red-50 rounded-xl border border-red-200 space-y-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-900">Final Confirmation</h3>
                  <p className="text-sm text-red-800/80 mt-2">Type <strong className="text-red-900 font-mono bg-red-100 px-1.5 py-0.5 rounded">DELETE</strong> to permanently delete your account.</p>
                  <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE to confirm"
                    className="w-full mt-3 px-4 py-3 bg-white border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm font-mono text-red-900 placeholder-red-300" autoFocus />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteStep(1); }} className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {deleting ? (<><Loader2 className="w-4 h-4 animate-spin" />Deleting...</>) : (<><Trash2 className="w-4 h-4" />Delete My Account Forever</>)}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8" />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>POPIA Compliant | Your data is protected under South Africa's Protection of Personal Information Act</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/privacy-policy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link>
            <span>|</span>
            <a href="mailto:snapmart.officialapp@gmail.com" className="hover:text-blue-500 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsContent />
    </AuthProvider>
  );
};

export default SettingsPage;
