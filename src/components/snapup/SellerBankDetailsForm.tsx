import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SA_BANKS } from '@/types';
import {
  Building2, User, CreditCard, Banknote, Shield, Save,
  Loader2, AlertTriangle, CheckCircle2, Edit3, RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// SA Bank universal branch codes
const SA_BANK_BRANCH_CODES: Record<string, string> = {
  'ABSA Bank': '632005',
  'African Bank': '430000',
  'Bidvest Bank': '462005',
  'Capitec Bank': '470010',
  'Discovery Bank': '679000',
  'First National Bank (FNB)': '250655',
  'Investec': '580105',
  'Nedbank': '198765',
  'Standard Bank': '051001',
  'TymeBank': '678910',
};

const ACCOUNT_TYPES = [
  { value: 'cheque', label: 'Cheque / Current Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'transmission', label: 'Transmission Account' },
];

interface SellerBankDetailsFormProps {
  onSaved?: () => void;
  compact?: boolean;
}

const SellerBankDetailsForm: React.FC<SellerBankDetailsFormProps> = ({ onSaved, compact = false }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountType, setAccountType] = useState('cheque');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasBankDetails = !!(profile?.bank_name && profile?.bank_account_number && profile?.bank_branch_code);

  useEffect(() => {
    if (profile) {
      setBankName(profile.bank_name || '');
      setAccountHolder(profile.bank_account_holder || profile.full_name || '');
      setAccountNumber(profile.bank_account_number || '');
      setBranchCode(profile.bank_branch_code || '');
      setAccountType((profile as any).bank_account_type || 'cheque');
    }
  }, [profile]);

  // Auto-fill branch code when bank is selected
  const handleBankChange = (bank: string) => {
    setBankName(bank);
    setErrors(prev => ({ ...prev, bankName: '' }));
    if (SA_BANK_BRANCH_CODES[bank]) {
      setBranchCode(SA_BANK_BRANCH_CODES[bank]);
      setErrors(prev => ({ ...prev, branchCode: '' }));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!bankName) errs.bankName = 'Select a bank';
    if (!accountHolder.trim()) errs.accountHolder = 'Account holder name required';
    if (!accountNumber.trim()) errs.accountNumber = 'Account number required';
    else if (!/^\d{6,20}$/.test(accountNumber.trim())) errs.accountNumber = 'Must be 6-20 digits';
    if (!branchCode.trim()) errs.branchCode = 'Branch code required';
    else if (!/^\d{5,7}$/.test(branchCode.trim())) errs.branchCode = 'Must be 5-7 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-sa-payouts', {
        body: {
          action: 'save-bank-details',
          bank_name: bankName,
          bank_account_number: accountNumber.trim(),
          bank_branch_code: branchCode.trim(),
          bank_account_type: accountType,
          bank_account_holder: accountHolder.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Bank Details Saved', description: `${bankName} account ending in ${accountNumber.slice(-4)} saved securely.` });
      if (refreshProfile) await refreshProfile();
      setEditing(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save bank details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Show saved state
  if (hasBankDetails && !editing) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold text-gray-900 flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
            <Building2 className="w-4 h-4 text-emerald-600" />
            SA Bank Details
          </h3>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-all">
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium text-emerald-800">Banking details configured</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-gray-500">Bank:</span> <span className="font-medium text-gray-900">{profile?.bank_name}</span></div>
            <div><span className="text-gray-500">Account:</span> <span className="font-mono font-medium text-gray-900">****{profile?.bank_account_number?.slice(-4)}</span></div>
            <div><span className="text-gray-500">Branch:</span> <span className="font-mono text-gray-900">{profile?.bank_branch_code}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="text-gray-900 capitalize">{(profile as any)?.bank_account_type || 'Cheque'}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Holder:</span> <span className="font-medium text-gray-900">{profile?.bank_account_holder || profile?.full_name}</span></div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
          <Shield className="w-3 h-3" /> POPIA encrypted. EFT payouts processed to this account.
        </p>
      </div>
    );
  }

  // Edit/Create form
  return (
    <div className={`bg-white rounded-2xl border-2 ${editing ? 'border-blue-200' : 'border-amber-200'} ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit' : 'Add'} SA Bank Details</h3>
          <p className="text-xs text-gray-500">Required for EFT payouts in ZAR</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5" noValidate>
        {/* Bank Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name <span className="text-red-500">*</span></label>
          <select value={bankName} onChange={e => handleBankChange(e.target.value)}
            className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm ${errors.bankName ? 'border-red-300' : 'border-gray-200'}`}>
            <option value="">Select your bank...</option>
            {(Array.isArray(SA_BANKS) ? SA_BANKS : []).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {errors.bankName && <p className="text-red-500 text-[10px] mt-0.5">{errors.bankName}</p>}
        </div>

        {/* Account Holder */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Account Holder <span className="text-red-500">*</span></label>
          <input type="text" value={accountHolder} onChange={e => { setAccountHolder(e.target.value); setErrors(p => ({ ...p, accountHolder: '' })); }}
            placeholder="e.g. Thabo Mokoena"
            className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm ${errors.accountHolder ? 'border-red-300' : 'border-gray-200'}`} />
          {errors.accountHolder && <p className="text-red-500 text-[10px] mt-0.5">{errors.accountHolder}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number <span className="text-red-500">*</span></label>
            <input type="text" inputMode="numeric" value={accountNumber}
              onChange={e => { setAccountNumber(e.target.value.replace(/\D/g, '')); setErrors(p => ({ ...p, accountNumber: '' })); }}
              placeholder="1234567890" maxLength={20}
              className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono ${errors.accountNumber ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.accountNumber && <p className="text-red-500 text-[10px] mt-0.5">{errors.accountNumber}</p>}
          </div>

          {/* Branch Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Code <span className="text-red-500">*</span></label>
            <input type="text" inputMode="numeric" value={branchCode}
              onChange={e => { setBranchCode(e.target.value.replace(/\D/g, '')); setErrors(p => ({ ...p, branchCode: '' })); }}
              placeholder="470010" maxLength={7}
              className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono ${errors.branchCode ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.branchCode && <p className="text-red-500 text-[10px] mt-0.5">{errors.branchCode}</p>}
            {bankName && SA_BANK_BRANCH_CODES[bankName] && branchCode === SA_BANK_BRANCH_CODES[bankName] && (
              <p className="text-emerald-600 text-[10px] mt-0.5 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Universal branch code</p>
            )}
          </div>
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Account Type <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {ACCOUNT_TYPES.map(type => (
              <button key={type.value} type="button"
                onClick={() => setAccountType(type.value)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                  accountType === type.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                }`}>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* POPIA Notice */}
        <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100 flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-700">
            <strong>POPIA:</strong> Banking details are encrypted at rest and used exclusively for EFT payout processing in ZAR.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {editing && (
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-xs shadow-lg shadow-emerald-200">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Saving...' : 'Save Bank Details'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellerBankDetailsForm;
