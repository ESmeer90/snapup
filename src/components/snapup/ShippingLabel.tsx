import React, { useRef, useEffect, useState } from 'react';
import { Printer, X, Truck, Package, MapPin } from 'lucide-react';

interface ShippingLabelProps {
  isOpen: boolean;
  onClose: () => void;
  labelData: {
    order_id: string;
    tracking_number: string;
    courier: string;
    seller_name: string;
    seller_province: string;
    buyer_address?: string;
    item_description: string;
    item_location: string;
    created_at: string;
  };
}

// Simple Code128-style barcode renderer using canvas
function drawBarcode(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Generate pseudo-barcode pattern from text
  let pattern = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Create a binary pattern from char code
    const bin = code.toString(2).padStart(8, '0');
    pattern += bin + '0'; // separator
  }
  // Add start/stop patterns
  pattern = '11010010' + pattern + '1100011101';
  
  const barWidth = Math.max(1, Math.floor(width / pattern.length));
  const barHeight = height - 20;
  
  ctx.fillStyle = '#000000';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      ctx.fillRect(i * barWidth, 0, barWidth, barHeight);
    }
  }
  
  // Draw text below barcode
  ctx.fillStyle = '#000000';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height - 4);
}

const ShippingLabel: React.FC<ShippingLabelProps> = ({ isOpen, onClose, labelData }) => {
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isOpen && barcodeRef.current && labelData.tracking_number) {
      drawBarcode(barcodeRef.current, labelData.tracking_number);
      setReady(true);
    }
  }, [isOpen, labelData.tracking_number]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const courierLogos: Record<string, string> = {
    'The Courier Guy': 'TCG',
    'Fastway': 'FWY',
    'Aramex': 'ARX',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:p-0" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none" onClick={e => e.stopPropagation()}>
        {/* Screen-only header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Shipping Label</h2>
              <p className="text-xs text-gray-500">Print or save as PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200">
              <Printer className="w-4 h-4" /> Print Label
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Label Content */}
        <div ref={printRef} className="p-6 print:p-4">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .print-label, .print-label * { visibility: visible !important; }
              .print-label { position: fixed; left: 0; top: 0; width: 100%; padding: 15mm; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="print-label border-2 border-black p-5 max-w-[500px] mx-auto">
            {/* Courier Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-lg">{courierLogos[labelData.courier] || 'SHP'}</span>
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900">{labelData.courier}</p>
                  <p className="text-xs text-gray-500">SnapUp Marketplace</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Order</p>
                <p className="text-sm font-mono font-bold">#{labelData.order_id}</p>
                <p className="text-[10px] text-gray-400">{new Date(labelData.created_at).toLocaleDateString('en-ZA')}</p>
              </div>
            </div>

            {/* Barcode */}
            <div className="flex justify-center my-4">
              <canvas ref={barcodeRef} width={380} height={70} className="max-w-full" />
            </div>

            {/* Tracking Number */}
            <div className="text-center mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tracking Number</p>
              <p className="text-xl font-mono font-black tracking-widest">{labelData.tracking_number}</p>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-3">
              {/* From */}
              <div className="border-r border-gray-300 pr-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">FROM (Seller)</p>
                <p className="text-sm font-bold text-gray-900">{labelData.seller_name}</p>
                <p className="text-xs text-gray-600">{labelData.item_location}</p>
                <p className="text-xs text-gray-600">{labelData.seller_province}</p>
              </div>
              {/* To */}
              <div className="pl-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">TO (Buyer)</p>
                {labelData.buyer_address ? (
                  <p className="text-sm font-bold text-gray-900 whitespace-pre-line">{labelData.buyer_address}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Address encrypted (POPIA). Decrypt from order details.</p>
                )}
              </div>
            </div>

            {/* Item Description */}
            <div className="border-t-2 border-black mt-3 pt-3">
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contents</p>
                  <p className="text-sm font-medium text-gray-900">{labelData.item_description}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-300 mt-3 pt-2 flex items-center justify-between">
              <p className="text-[9px] text-gray-400">POPIA Compliant | Handle with care</p>
              <p className="text-[9px] text-gray-400">snapup.co.za</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingLabel;
