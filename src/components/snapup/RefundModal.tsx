import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatZAR } from '@/lib/api';
import {
  RotateCcw, Loader2, AlertTriangle, CheckCircle2, X, DollarSign,
  Shield, CreditCard, FileText, Info
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderAmount: number;
  orderTotal: number;
  listingTitle: string;
  listingImage?: string;
  onRefundProcessed?: () => void;
}


const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderAmount,
  orderTotal,
  listingTitle,
  listingImage,
  onRefundProcessed,
}) => {

  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundResult, setRefundResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setRefundType('full');
      setPartialAmount('');
      setReason('');
      setProcessing(false);
      setSuccess(false);
      setError(null);
      setRefundResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveTotal = orderTotal || orderAmount || 0;
  const refundAmount = refundType === 'full' ? effectiveTotal : parseFloat(partialAmount) || 0;
  const isValidAmount = refundType === 'full' || (refundAmount > 0 && refundAmount <= effectiveTotal);

  const handleProcessRefund = async () => {
    if (!isValidAmount) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    const confirmMsg = refundType === 'full'
      ? `Are you sure you want to issue a FULL refund of ${formatZAR(effectiveTotal)} for this order?`
      : `Are you sure you want to issue a PARTIAL refund of ${formatZAR(refundAmount)} for this order?`;

    if (!confirm(confirmMsg)) return;

    setProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('process-refund', {
        body: {
          action: 'process-refund',
          order_id: orderId,
          refund_amount: refundType === 'partial' ? refundAmount : undefined,
          reason: reason.trim(),
        },
      });

      if (fnError) {
        const errMsg = typeof fnError === 'object' ? (fnError as any).message || JSON.stringify(fnError) : String(fnError);
        throw new Error(errMsg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setRefundResult(data?.refund);
      setSuccess(true);

      toast({
        title: refundType === 'full' ? 'Full Refund Processed' : 'Partial Refund Processed',
        description: `${formatZAR(refundAmount)} refund has been processed. The buyer will be notified.`,
      });


      if (onRefundProcessed) {
        onRefundProcessed();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
      toast({
        title: 'Refund Failed',
        description: err.message || 'Failed to process refund',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Process Refund</h2>
              <p className="text-xs text-red-100">Order #{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {success ? (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Refund Processed</h3>
              <p className="text-sm text-gray-600 mb-4">
                {refundResult?.is_partial ? 'Partial' : 'Full'} refund of <strong>{formatZAR(refundResult?.amount || refundAmount)}</strong> has been processed.
              </p>

              {/* Refund Details */}
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Refund Amount</span>
                  <span className="font-bold text-red-600">{formatZAR(refundResult?.amount || refundAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Commission Refunded</span>
                  <span className="font-medium text-gray-700">{formatZAR(refundResult?.commission_refunded || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Seller Deduction</span>
                  <span className="font-medium text-gray-700">{formatZAR(refundResult?.net_seller_deduction || 0)}</span>
                </div>
              </div>
              {/* Refund Confirmation Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Refund Action Completed</p>
                    <p className="text-xs text-amber-700 mt-1">
                      The order status has been updated and escrow released. The refund will be processed back to the buyer's original payment method.
                    </p>
                  </div>
                </div>
              </div>


              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            /* Refund Form */
            <>
              {/* Order Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {listingImage && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    <img src={listingImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{listingTitle}</p>
                  <p className="text-xs text-gray-500">Order Total: <span className="font-bold text-emerald-600">{formatZAR(effectiveTotal)}</span></p>
                </div>
              </div>

              {/* Refund Type Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Refund Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundType('full')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      refundType === 'full'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Full Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundType('partial')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      refundType === 'partial'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Partial Refund
                  </button>
                </div>
              </div>

              {/* Refund Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Refund Amount (ZAR)
                </label>
                {refundType === 'full' ? (
                  <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl">
                    <span className="text-lg font-bold text-red-600">{formatZAR(effectiveTotal)}</span>
                    <span className="text-xs text-gray-500 ml-2">(Full order total)</span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R</span>
                    <input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      max={effectiveTotal}
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      Max: {formatZAR(effectiveTotal)}
                    </span>
                  </div>
                )}
                {refundType === 'partial' && partialAmount && parseFloat(partialAmount) > effectiveTotal && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Amount exceeds order total
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <FileText className="w-3.5 h-3.5 inline mr-1" />
                  Reason for Refund <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none mb-2"
                >
                  <option value="">Select a reason...</option>
                  <option value="Item not as described">Item not as described</option>
                  <option value="Item damaged or defective">Item damaged or defective</option>
                  <option value="Item not received">Item not received</option>
                  <option value="Buyer changed mind">Buyer changed mind</option>
                  <option value="Duplicate order">Duplicate order</option>
                  <option value="Wrong item sent">Wrong item sent</option>
                  <option value="Seller unable to fulfill">Seller unable to fulfill</option>
                  <option value="Dispute resolution">Dispute resolution</option>
                  <option value="Other">Other</option>
                </select>
                {reason === 'Other' && (
                  <textarea
                    value=""
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please describe the reason..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  />
                )}
              </div>

              {/* Refund Summary */}
              {isValidAmount && reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Refund Summary
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">Refund to Buyer</span>
                    <span className="font-bold text-red-800">{formatZAR(refundAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Type</span>
                    <span className="font-medium text-red-700">{refundType === 'full' ? 'Full Refund' : 'Partial Refund'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Reason</span>
                    <span className="font-medium text-red-700 truncate max-w-[200px]">{reason}</span>
                  </div>
                </div>
              )}

              {/* Refund Notice */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  This will update the order status and release the escrow hold. The refund will be processed back to the buyer's original payment method.
                </p>
              </div>



              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessRefund}
                  disabled={processing || !isValidAmount || !reason.trim()}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Process Refund
                    </>
                  )}
                </button>
              </div>

              {/* POPIA Notice */}
              <div className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                <Shield className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-500">
                  Refund records are retained per POPIA for financial audit purposes. Both buyer and seller will receive email notifications.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundModal;
