import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import {
  getAdminStats, getAdminUsers, adminUpdateUserStatus, getAdminPayouts,
  adminProcessPayout, getAdminDisputes, adminResolveDispute, adminApproveVerification,
  getAllPromos, togglePromoActive, createPromo, getPromoImpactStats,
  formatZAR, timeAgo
} from '@/lib/api';
import { fetchCommissionTiers, updateCommissionTiers, invalidateCommissionCache, type CommissionTiers } from '@/lib/commission';
import { PAYOUT_STATUS_CONFIG, DISPUTE_STATUS_CONFIG, DISPUTE_REASON_LABELS, SA_PROVINCES } from '@/types';
import type { PayoutStatus, DisputeStatus, DisputeReason, Promo, PromoImpactStats } from '@/types';
import {
  BarChart3, Users, Wallet, Flag, Shield, ShoppingBag, Package, Banknote,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Search,
  ArrowLeft, Eye, Ban, UserCheck, Clock, TrendingUp, Activity,
  ChevronRight, FileText, BadgeCheck, Gift, Plus, ToggleLeft, ToggleRight,
  Calendar, Tag, Percent, MapPin, Zap, Settings, CreditCard, Mail, Wrench,
  Radio, Globe
} from 'lucide-react';


import { toast } from '@/components/ui/use-toast';
import AdminVerificationsTab from '@/components/snapup/AdminVerificationsTab';
import AdminEmailLogsTab from '@/components/snapup/AdminEmailLogsTab';

import AdminMaintenanceTab from '@/components/snapup/AdminMaintenanceTab';
import AdminSEOTab from '@/components/snapup/AdminSEOTab';

type AdminTab = 'overview' | 'users' | 'payouts' | 'disputes' | 'verifications' | 'promos' | 'commission' | 'emails' | 'maintenance' | 'seo';






const AdminContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [disputeFilter, setDisputeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{ open: boolean; disputeId: string; resolution: string; amount: string; notes: string }>({ open: false, disputeId: '', resolution: '', amount: '', notes: '' });

  // Promos state
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promoImpact, setPromoImpact] = useState<PromoImpactStats | null>(null);
  const [promosLoading, setPromosLoading] = useState(false);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    type: 'first_sales_free' as string,
    discount_percent: 0,
    max_sales: 10,
    description: '',
    end_date: '',
    target_provinces: [] as string[],
  });
  const [creatingPromo, setCreatingPromo] = useState(false);

  // Commission tiers state (must be before early returns for hooks rules)
  const [commissionTiers, setCommissionTiers] = useState<CommissionTiers | null>(null);
  const [commissionForm, setCommissionForm] = useState({ low_threshold: 500, low_rate: 0.12, mid_threshold: 2000, mid_rate: 0.10, high_rate: 0.05 });
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionSaving, setCommissionSaving] = useState(false);

  const isAdmin = profile?.role === 'admin';


  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      toast({ title: 'Access Denied', description: 'Admin privileges required.', variant: 'destructive' });
      navigate('/', { replace: true });
    }
  }, [user, profile, authLoading, navigate, isAdmin]);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, payoutsRes, disputesRes] = await Promise.allSettled([
        getAdminStats(),
        getAdminUsers({ search: userSearch, limit: 50 }),
        getAdminPayouts(),
        getAdminDisputes({ status: disputeFilter !== 'all' ? disputeFilter : undefined }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value?.users || []);
      if (payoutsRes.status === 'fulfilled') setPayouts(payoutsRes.value || []);
      if (disputesRes.status === 'fulfilled') setDisputes(disputesRes.value?.disputes || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load admin data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userSearch, disputeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load promos when tab is active
  const loadPromos = useCallback(async () => {
    if (!isAdmin) return;
    setPromosLoading(true);
    try {
      const [promosRes, impactRes] = await Promise.allSettled([
        getAllPromos(),
        getPromoImpactStats(),
      ]);
      if (promosRes.status === 'fulfilled') setPromos(promosRes.value);
      if (impactRes.status === 'fulfilled') setPromoImpact(impactRes.value);
    } catch (err: any) {
      console.error('Failed to load promos:', err);
    } finally {
      setPromosLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'promos') loadPromos();
  }, [activeTab, loadPromos]);

  const handleUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    setProcessingId(userId);
    try {
      await adminUpdateUserStatus(userId, status);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
      toast({ title: 'User updated', description: `User status set to ${status}.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setProcessingId(null); }
  };

  const handleProcessPayout = async (payoutId: string, action: 'approve' | 'reject') => {
    setProcessingId(payoutId);
    try {
      await adminProcessPayout(payoutId, action);
      setPayouts(prev => prev.filter(p => p.id !== payoutId));
      toast({ title: action === 'approve' ? 'Payout Approved' : 'Payout Rejected', description: `Payout has been ${action}d.` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setProcessingId(null); }
  };

  const handleResolveDispute = async () => {
    const { disputeId, resolution, amount, notes } = resolveModal;
    if (!resolution) { toast({ title: 'Select resolution', variant: 'destructive' }); return; }
    setProcessingId(disputeId);
    try {
      await adminResolveDispute(disputeId, resolution, amount ? parseFloat(amount) : undefined, notes || undefined);
      toast({ title: 'Dispute Resolved', description: `Dispute resolved as ${resolution}.` });
      setResolveModal({ open: false, disputeId: '', resolution: '', amount: '', notes: '' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setProcessingId(null); }
  };

  const handleVerification = async (userId: string, approved: boolean) => {
    setProcessingId(userId);
    try {
      await adminApproveVerification(userId, approved);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verified_seller: approved, verification_status: approved ? 'approved' : 'rejected' } : u));
      toast({ title: approved ? 'Seller Verified' : 'Verification Rejected' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setProcessingId(null); }
  };

  const handleTogglePromo = async (promoId: string, currentActive: boolean) => {
    setProcessingId(promoId);
    try {
      await togglePromoActive(promoId, !currentActive);
      setPromos(prev => prev.map(p => p.id === promoId ? { ...p, active: !currentActive } : p));
      toast({ title: !currentActive ? 'Promo Activated' : 'Promo Deactivated' });
      loadPromos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setProcessingId(null); }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setCreatingPromo(true);
    try {
      const created = await createPromo({
        name: newPromo.name.trim(),
        type: newPromo.type,
        discount_percent: newPromo.type === 'percent_off' ? newPromo.discount_percent : 0,
        max_sales: newPromo.max_sales || null,
        end_date: newPromo.end_date || undefined,
        description: newPromo.description.trim(),
        target_provinces: newPromo.target_provinces.length > 0 ? newPromo.target_provinces : undefined,
      });
      setPromos(prev => [created, ...prev]);
      setShowCreatePromo(false);
      setNewPromo({ name: '', type: 'first_sales_free', discount_percent: 0, max_sales: 10, description: '', end_date: '', target_provinces: [] });
      toast({ title: 'Promo Created', description: `"${created.name}" is now active.` });
      loadPromos();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCreatingPromo(false); }
  };

  const toggleTargetProvince = (province: string) => {
    setNewPromo(prev => ({
      ...prev,
      target_provinces: prev.target_provinces.includes(province)
        ? prev.target_provinces.filter(p => p !== province)
        : [...prev.target_provinces, province],
    }));
  };

  // Load commission tiers when tab is active
  useEffect(() => {
    if (activeTab === 'commission' && isAdmin) {
      setCommissionLoading(true);
      fetchCommissionTiers().then(tiers => {
        setCommissionTiers(tiers);
        setCommissionForm({
          low_threshold: tiers.low_threshold,
          low_rate: tiers.low_rate,
          mid_threshold: tiers.mid_threshold,
          mid_rate: tiers.mid_rate,
          high_rate: tiers.high_rate,
        });
      }).catch(err => {
        console.error('Failed to load commission tiers:', err);
      }).finally(() => setCommissionLoading(false));
    }
  }, [activeTab, isAdmin]);

  const handleSaveCommissionTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commissionForm.low_threshold <= 0 || commissionForm.mid_threshold <= commissionForm.low_threshold) {
      toast({ title: 'Invalid thresholds', description: 'Mid threshold must be greater than low threshold.', variant: 'destructive' });
      return;
    }
    if (commissionForm.low_rate <= 0 || commissionForm.mid_rate <= 0 || commissionForm.high_rate <= 0) {
      toast({ title: 'Invalid rates', description: 'All rates must be greater than 0.', variant: 'destructive' });
      return;
    }
    setCommissionSaving(true);
    try {
      await updateCommissionTiers(commissionForm);
      invalidateCommissionCache();
      setCommissionTiers(commissionForm);
      toast({ title: 'Commission Tiers Updated', description: 'New rates are now active across the platform.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save commission tiers', variant: 'destructive' });
    } finally {
      setCommissionSaving(false);
    }
  };

  if (authLoading) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>);
  }
  if (!user || !isAdmin) return null;

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, count: stats?.total_users },
    { id: 'payouts', label: 'Payouts', icon: <Wallet className="w-4 h-4" />, count: payouts.length },
    { id: 'disputes', label: 'Disputes', icon: <Flag className="w-4 h-4" />, count: stats?.open_disputes },
    { id: 'verifications', label: 'Verifications', icon: <BadgeCheck className="w-4 h-4" />, count: stats?.pending_verifications },
    { id: 'emails', label: 'Email Logs', icon: <Mail className="w-4 h-4" /> },
    { id: 'promos', label: 'Promos', icon: <Gift className="w-4 h-4" />, count: promos.filter(p => p.active).length },
    { id: 'commission', label: 'Commission', icon: <Settings className="w-4 h-4" /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench className="w-4 h-4" /> },
  ];





  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="p-2 text-gray-400 hover:text-white rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
                <div>
                  <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
                  <p className="text-xs text-gray-400">SnapUp Platform Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-xs text-gray-400">Live</span></div>
              <button onClick={() => { loadData(); if (activeTab === 'promos') loadPromos(); }} disabled={loading} className="p-2 text-gray-400 hover:text-white rounded-xl transition-all"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tab Nav */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.icon}{tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading && activeTab === 'overview' && (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
        )}

        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Platform Status Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">SnapUp Marketplace</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-white/20 text-white rounded-full">LIVE</span>
                    </div>
                    <p className="text-xs text-emerald-100 mt-0.5">South Africa | ZAR Currency | SA Bank Payouts | Contact-Only Mode</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white">ZAR (R)</span>
                  <span className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 32 24" fill="none"><rect width="32" height="24" rx="2" fill="#007749"/><path d="M0 12h32" stroke="#FFB81C" strokeWidth="4"/><path d="M0 4h32" stroke="#DE3831" strokeWidth="4"/><path d="M0 20h32" stroke="#002395" strokeWidth="4"/><path d="M0 0L16 12L0 24V0Z" fill="#007749"/><path d="M0 2L14 12L0 22V2Z" fill="#FFB81C"/><path d="M0 4L12 12L0 20V4Z" fill="#fff"/><path d="M0 6L10 12L0 18V6Z" fill="#007749"/></svg>
                    South Africa
                  </span>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.total_users || 0, icon: <Users className="w-5 h-5" />, bg: 'bg-blue-100 text-blue-600' },
                { label: 'Active Listings', value: stats.active_listings || 0, icon: <Package className="w-5 h-5" />, bg: 'bg-emerald-100 text-emerald-600' },
                { label: 'Total Orders', value: stats.total_orders || 0, icon: <ShoppingBag className="w-5 h-5" />, bg: 'bg-purple-100 text-purple-600' },
                { label: 'Total Revenue (ZAR)', value: formatZAR(stats.total_revenue || 0), icon: <Banknote className="w-5 h-5" />, bg: 'bg-amber-100 text-amber-600' },
                { label: 'Commission (ZAR)', value: formatZAR(stats.total_commission || 0), icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-emerald-100 text-emerald-600' },
                { label: 'Open Disputes', value: stats.open_disputes || 0, icon: <Flag className="w-5 h-5" />, bg: 'bg-red-100 text-red-600' },
                { label: 'Pending Payouts', value: stats.pending_payouts || 0, icon: <Clock className="w-5 h-5" />, bg: 'bg-amber-100 text-amber-600' },
                { label: 'Pending Verifications', value: stats.pending_verifications || 0, icon: <BadgeCheck className="w-5 h-5" />, bg: 'bg-indigo-100 text-indigo-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>{s.icon}</div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-emerald-600" />Commission Revenue (ZAR)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-2xl font-bold text-emerald-700">{formatZAR(stats.total_commission || 0)}</p><p className="text-xs text-emerald-600 mt-1">Total Commission</p></div>
                <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-2xl font-bold text-blue-700">{formatZAR(stats.total_revenue || 0)}</p><p className="text-xs text-blue-600 mt-1">Gross Revenue</p></div>
                <div className="text-center p-4 bg-purple-50 rounded-xl"><p className="text-2xl font-bold text-purple-700">{stats.total_orders || 0}</p><p className="text-xs text-purple-600 mt-1">Total Transactions</p></div>
              </div>
            </div>
          </div>
        )}


        {/* ===== USERS ===== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by email or name..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Province</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Verified</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{u.full_name}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                        <td className="px-4 py-3 text-sm text-gray-700">{u.province}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : u.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span></td>
                        <td className="px-4 py-3">{u.verified_seller ? <BadgeCheck className="w-5 h-5 text-blue-600" /> : <span className="text-xs text-gray-400">No</span>}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{u.created_at ? timeAgo(u.created_at) : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {u.status === 'active' && u.role !== 'admin' && (<button onClick={() => handleUserStatus(u.id, 'suspended')} disabled={processingId === u.id} className="px-2 py-1 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all disabled:opacity-50">{processingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Suspend'}</button>)}
                            {u.status === 'suspended' && (<button onClick={() => handleUserStatus(u.id, 'active')} disabled={processingId === u.id} className="px-2 py-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all disabled:opacity-50">Activate</button>)}
                            {u.status !== 'banned' && u.role !== 'admin' && (<button onClick={() => handleUserStatus(u.id, 'banned')} disabled={processingId === u.id} className="px-2 py-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-50">Ban</button>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No users found</div>}
            </div>
          </div>
        )}

        {/* ===== PAYOUTS ===== */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl"><Shield className="w-4 h-4 text-blue-600" /><p className="text-xs text-blue-700">Pending payouts from sellers with delivered orders.</p></div>
            {payouts.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><Wallet className="w-14 h-14 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-bold text-gray-900 mb-2">No pending payouts</h3></div>
            ) : (
              <div className="space-y-3">
                {payouts.map(p => {
                  const sc = PAYOUT_STATUS_CONFIG[p.status as PayoutStatus] || PAYOUT_STATUS_CONFIG.pending;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div><p className="text-sm font-semibold text-gray-900">{p.seller_name || 'Seller'}</p><p className="text-xs text-gray-500">{p.seller_email}</p></div>
                        <div className="text-right"><p className="text-xl font-bold text-emerald-600">{formatZAR(p.amount)}</p><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span></div>
                      </div>
                      {p.status === 'pending' && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => handleProcessPayout(p.id, 'approve')} disabled={processingId === p.id} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-50">{processingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve</button>
                          <button onClick={() => handleProcessPayout(p.id, 'reject')} disabled={processingId === p.id} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== DISPUTES ===== */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {['all', 'open', 'under_review', 'resolved_refund', 'resolved_no_refund', 'closed'].map(s => (
                <button key={s} onClick={() => setDisputeFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${disputeFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s === 'all' ? 'All' : (DISPUTE_STATUS_CONFIG[s as DisputeStatus]?.label || s)}</button>
              ))}
            </div>
            {disputes.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><Flag className="w-14 h-14 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-bold text-gray-900 mb-2">No disputes</h3></div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d: any) => {
                  const sc = DISPUTE_STATUS_CONFIG[d.status as DisputeStatus] || DISPUTE_STATUS_CONFIG.open;
                  return (
                    <div key={d.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span><span className="text-xs text-gray-500 font-mono">#{d.id?.slice(0, 8)}</span></div>
                          <p className="text-sm font-semibold text-gray-900">{d.order_listing_title || 'Order Item'}</p>
                          <p className="text-xs text-gray-500 mt-1">Reason: {DISPUTE_REASON_LABELS[d.reason as DisputeReason] || d.reason}</p>
                          <p className="text-xs text-gray-500">Amount: {formatZAR(d.order_amount || 0)}</p>
                        </div>
                        <div className="text-right text-xs text-gray-400">{d.created_at && timeAgo(d.created_at)}</div>
                      </div>
                      {(d.status === 'open' || d.status === 'under_review') && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => setResolveModal({ open: true, disputeId: d.id, resolution: '', amount: String(d.order_amount || 0), notes: '' })} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"><FileText className="w-3.5 h-3.5" /> Resolve</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== VERIFICATIONS ===== */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl"><BadgeCheck className="w-4 h-4 text-indigo-600" /><p className="text-xs text-indigo-700">Review seller verification requests.</p></div>
            {users.filter(u => u.verification_status === 'pending').length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><BadgeCheck className="w-14 h-14 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-bold text-gray-900 mb-2">No pending verifications</h3></div>
            ) : (
              <div className="space-y-3">
                {users.filter(u => u.verification_status === 'pending').map(u => (
                  <div key={u.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-sm font-semibold text-gray-900">{u.full_name}</p><p className="text-xs text-gray-500">{u.email} | {u.province}</p></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleVerification(u.id, true)} disabled={processingId === u.id} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-50">{processingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve</button>
                        <button onClick={() => handleVerification(u.id, false)} disabled={processingId === u.id} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"><XCircle className="w-3 h-3" /> Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== PROMOS TAB ===== */}
        {activeTab === 'promos' && (
          <div className="space-y-6">
            {promoImpact && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Promos', value: promoImpact.total_promos, icon: <Gift className="w-5 h-5" />, bg: 'bg-purple-100 text-purple-600' },
                  { label: 'Active Promos', value: promoImpact.active_promos, icon: <Zap className="w-5 h-5" />, bg: 'bg-emerald-100 text-emerald-600' },
                  { label: 'Total Usage', value: promoImpact.total_promo_usage, icon: <Tag className="w-5 h-5" />, bg: 'bg-blue-100 text-blue-600' },
                  { label: 'Commission Forgone', value: formatZAR(promoImpact.total_commission_forgone), icon: <Banknote className="w-5 h-5" />, bg: 'bg-red-100 text-red-600' },

                  { label: 'Unique Sellers', value: promoImpact.unique_sellers_using_promos, icon: <Users className="w-5 h-5" />, bg: 'bg-amber-100 text-amber-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4"><div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.bg}`}>{s.icon}</div><p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{s.label}</p><p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p></div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><h3 className="text-lg font-bold text-gray-900">All Promotions</h3><span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{promos.length}</span></div>
              <button onClick={() => setShowCreatePromo(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-200"><Plus className="w-4 h-4" /> Create Promo</button>
            </div>
            {showCreatePromo && (
              <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-sm">
                <form onSubmit={handleCreatePromo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Promo Name *</label><input type="text" value={newPromo.name} onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })} placeholder="e.g. First 10 Sales Free" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" required /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Type *</label><select value={newPromo.type} onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"><option value="first_sales_free">First X Sales Free</option><option value="percent_off">Percent Off</option><option value="flat_off">Flat Off</option></select></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Sales</label><input type="number" min="1" value={newPromo.max_sales} onChange={(e) => setNewPromo({ ...newPromo, max_sales: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label><input type="date" value={newPromo.end_date} onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
                  </div>
                  <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label><textarea value={newPromo.description} onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" /></div>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreatePromo(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={creatingPromo} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 text-sm">{creatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create</button>
                  </div>
                </form>
              </div>
            )}
            {promosLoading ? (<div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>) : promos.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><Gift className="w-14 h-14 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-bold text-gray-900 mb-2">No promotions yet</h3></div>
            ) : (
              <div className="space-y-3">
                {promos.map((promo) => {
                  const isExpired = promo.end_date && new Date(promo.end_date) < new Date();
                  const typeLabel = promo.type === 'first_sales_free' ? '0% Commission' : promo.type === 'percent_off' ? `${promo.discount_percent}% Off` : 'Flat Off';
                  return (
                    <div key={promo.id} className={`bg-white rounded-2xl border ${promo.active ? 'border-emerald-200' : 'border-gray-200'} p-5`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-sm font-bold text-gray-900">{promo.name}</h4>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${promo.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{promo.active ? 'Active' : 'Inactive'}</span>
                            {isExpired && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 uppercase">Expired</span>}
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 text-purple-700">{typeLabel}</span>
                          </div>
                          {promo.description && <p className="text-xs text-gray-500 mt-1">{promo.description}</p>}
                        </div>
                        <button onClick={() => handleTogglePromo(promo.id, promo.active)} disabled={processingId === promo.id} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl disabled:opacity-50 ${promo.active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}>
                          {processingId === promo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : promo.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          {promo.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== COMMISSION TIERS TAB ===== */}
        {activeTab === 'commission' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Settings className="w-4 h-4 text-indigo-600" />
              <p className="text-xs text-indigo-700">Configure commission tiers applied to all sales. Changes take effect immediately.</p>
            </div>
            {commissionLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
            ) : (
              <form onSubmit={handleSaveCommissionTiers} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Percent className="w-5 h-5 text-indigo-600" /></div>
                  <div><h3 className="text-lg font-bold text-gray-900">Commission Tiers</h3><p className="text-sm text-gray-500">Set thresholds and rates for each tier</p></div>
                </div>
                {/* Tier 1 */}
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <h4 className="text-sm font-bold text-red-800 mb-3">Tier 1: Standard (Low Value)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Max Price (ZAR)</label><input type="number" min="1" value={commissionForm.low_threshold} onChange={e => setCommissionForm(prev => ({ ...prev, low_threshold: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Rate ({Math.round(commissionForm.low_rate * 100)}%)</label><input type="number" min="0.01" max="1" step="0.01" value={commissionForm.low_rate} onChange={e => setCommissionForm(prev => ({ ...prev, low_rate: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" /></div>
                  </div>
                </div>
                {/* Tier 2 */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h4 className="text-sm font-bold text-amber-800 mb-3">Tier 2: Mid-Range</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Max Price (ZAR)</label><input type="number" min="1" value={commissionForm.mid_threshold} onChange={e => setCommissionForm(prev => ({ ...prev, mid_threshold: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Rate ({Math.round(commissionForm.mid_rate * 100)}%)</label><input type="number" min="0.01" max="1" step="0.01" value={commissionForm.mid_rate} onChange={e => setCommissionForm(prev => ({ ...prev, mid_rate: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" /></div>
                  </div>
                </div>
                {/* Tier 3 */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <h4 className="text-sm font-bold text-emerald-800 mb-3">Tier 3: Premium (High Value)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Price Range</label><div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">Over R{commissionForm.mid_threshold.toLocaleString()}</div></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Rate ({Math.round(commissionForm.high_rate * 100)}%)</label><input type="number" min="0.01" max="1" step="0.01" value={commissionForm.high_rate} onChange={e => setCommissionForm(prev => ({ ...prev, high_rate: Number(e.target.value) }))} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" /></div>
                  </div>
                </div>
                {/* Preview */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Preview</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-white rounded-lg border"><p className="text-2xl font-black text-red-600">{Math.round(commissionForm.low_rate * 100)}%</p><p className="text-xs text-gray-500 mt-1">Under R{commissionForm.low_threshold}</p></div>
                    <div className="text-center p-3 bg-white rounded-lg border"><p className="text-2xl font-black text-amber-600">{Math.round(commissionForm.mid_rate * 100)}%</p><p className="text-xs text-gray-500 mt-1">R{commissionForm.low_threshold}–R{commissionForm.mid_threshold.toLocaleString()}</p></div>
                    <div className="text-center p-3 bg-white rounded-lg border"><p className="text-2xl font-black text-emerald-600">{Math.round(commissionForm.high_rate * 100)}%</p><p className="text-xs text-gray-500 mt-1">Over R{commissionForm.mid_threshold.toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setCommissionForm({ low_threshold: 500, low_rate: 0.12, mid_threshold: 2000, mid_rate: 0.10, high_rate: 0.05 })} className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Reset to Defaults</button>
                  <button type="submit" disabled={commissionSaving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 text-sm shadow-lg shadow-blue-200">{commissionSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Commission Tiers</button>
                </div>
              </form>
            )}
          </div>
        )}




        {/* ===== EMAIL LOGS TAB ===== */}
        {activeTab === 'emails' && (
          <AdminEmailLogsTab />
        )}

        {/* ===== MAINTENANCE TAB ===== */}
        {activeTab === 'maintenance' && (
          <AdminMaintenanceTab />
        )}


      </main>


      {/* Resolve Dispute Modal */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setResolveModal({ ...resolveModal, open: false })}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Resolve Dispute</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Resolution</label>
                <select value={resolveModal.resolution} onChange={e => setResolveModal({ ...resolveModal, resolution: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="">Select resolution...</option>
                  <option value="resolved_refund">Full Refund</option>
                  <option value="resolved_partial_refund">Partial Refund</option>
                  <option value="resolved_no_refund">No Refund</option>
                  <option value="closed">Close Dispute</option>
                </select>
              </div>
              {(resolveModal.resolution === 'resolved_refund' || resolveModal.resolution === 'resolved_partial_refund') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Refund Amount (ZAR)</label>
                  <input type="number" value={resolveModal.amount} onChange={e => setResolveModal({ ...resolveModal, amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes</label>
                <textarea value={resolveModal.notes} onChange={e => setResolveModal({ ...resolveModal, notes: e.target.value })}
                  rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" placeholder="Internal notes..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setResolveModal({ ...resolveModal, open: false })} className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={handleResolveDispute} disabled={processingId === resolveModal.disputeId}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {processingId === resolveModal.disputeId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPage: React.FC = () => (
  <AuthProvider>
    <AdminContent />
  </AuthProvider>
);

export default AdminPage;
