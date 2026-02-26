import React, { useState } from 'react';
import {
  Shield, CheckCircle2, Clock, AlertTriangle, HelpCircle, ChevronDown,
  ChevronUp, ArrowLeft, CreditCard, MessageSquare, FileText, RefreshCw,
  Lock, Eye, DollarSign, Package, Truck, XCircle, Scale, Award, Users
} from 'lucide-react';
import { BUYER_PROTECTION_LIMIT } from '@/types';
import { formatZAR } from '@/lib/api';
import SEOHead from '@/components/snapup/SEOHead';


const FAQ_ITEMS = [
  {
    q: 'What is SnapUp Buyer Protection?',
    a: 'SnapUp Buyer Protection is our guarantee that covers eligible purchases up to R5,000. If you don\'t receive your item or it\'s significantly different from the listing description, you can file a dispute and receive a full or partial refund.',
  },
  {
    q: 'How much coverage do I get?',
    a: `Each eligible transaction is covered up to ${formatZAR(BUYER_PROTECTION_LIMIT)}. This covers the item price. Service fees may also be refunded depending on the dispute outcome.`,
  },
  {
    q: 'What orders are eligible for protection?',
    a: 'Orders paid through PayFast on SnapUp with a status of Paid, Shipped, or Delivered are eligible. Cash-on-delivery, in-person trades, or payments made outside the platform are NOT covered.',
  },
  {
    q: 'How do I file a dispute?',
    a: 'Go to your Orders page, find the order in question, and click "Open Dispute". Select a reason, describe the issue, and upload any evidence (photos, screenshots). Our team will review within 48 hours.',
  },
  {
    q: 'How long does the dispute process take?',
    a: 'Most disputes are reviewed within 48 hours. Simple cases (item not received with tracking showing no delivery) are resolved within 24 hours. Complex cases may take up to 7 business days.',
  },
  {
    q: 'When will I receive my refund?',
    a: 'Once a dispute is resolved in your favour, refunds are processed within 3-5 business days. The refund goes back to your original payment method via PayFast.',
  },
  {
    q: 'Can I get a partial refund?',
    a: 'Yes. If the item was received but is significantly different from the description, our team may issue a partial refund based on the discrepancy. Both parties can agree to a partial resolution.',
  },
  {
    q: 'What if the seller disputes my claim?',
    a: 'The seller has 72 hours to respond to your dispute with their own evidence. Our team reviews both sides and makes a fair decision. If the seller doesn\'t respond, the dispute is resolved in your favour.',
  },
  {
    q: 'Are there items not covered?',
    a: 'Items over R5,000 are covered up to the R5,000 limit. Items traded in person without platform payment, digital goods, and services are not covered. Items where the buyer confirmed delivery are also excluded unless fraud is proven.',
  },
  {
    q: 'What about verified sellers?',
    a: 'Verified sellers have completed our identity verification process. While all sellers are covered by Buyer Protection, verified sellers have an additional trust layer. Look for the blue checkmark badge.',
  },
  {
    q: 'Is my personal data safe during disputes?',
    a: 'Yes. All dispute evidence and communications are handled in compliance with POPIA (Protection of Personal Information Act). Only relevant parties and our dispute resolution team have access to case details.',
  },
  {
    q: 'Can I cancel a dispute?',
    a: 'You can withdraw a dispute at any time before it\'s resolved. Go to your Disputes page and select "Withdraw". Note that repeated frivolous disputes may affect your account standing.',
  },
];

const TIMELINE_STEPS = [
  {
    icon: AlertTriangle,
    title: 'Issue Identified',
    description: 'You notice a problem with your order (not received, wrong item, damaged, etc.)',
    time: 'Day 0',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  {
    icon: FileText,
    title: 'File a Dispute',
    description: 'Open a dispute from your Orders page. Provide details and upload evidence.',
    time: 'Day 0',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  {
    icon: Eye,
    title: 'Under Review',
    description: 'Our team reviews your case. The seller is notified and has 72 hours to respond.',
    time: 'Day 1-2',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  {
    icon: Scale,
    title: 'Resolution Decision',
    description: 'We evaluate evidence from both parties and make a fair decision.',
    time: 'Day 2-5',
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
  },
  {
    icon: DollarSign,
    title: 'Refund Processed',
    description: 'If resolved in your favour, refund is initiated via PayFast.',
    time: 'Day 3-7',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  {
    icon: CheckCircle2,
    title: 'Funds Received',
    description: 'Refund appears in your original payment method (3-5 business days from processing).',
    time: 'Day 5-10',
    color: 'text-emerald-700',
    bg: 'bg-emerald-200',
  },
];

const BuyerProtectionPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Buyer Protection - Shop with Confidence"
        description="SnapUp Buyer Protection covers eligible purchases up to R5,000. If you don't receive your item or it's not as described, file a dispute for a full refund. POPIA compliant."
        canonical="/buyer-protection"
        ogUrl="/buyer-protection"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-emerald-200 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to SnapUp
          </a>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
                Buyer Protection
              </h1>
              <p className="text-emerald-100 text-lg mt-3 max-w-2xl leading-relaxed">
                Shop with confidence on SnapUp. Every eligible purchase is covered
                up to <strong className="text-white">{formatZAR(BUYER_PROTECTION_LIMIT)}</strong>,
                ensuring you get what you paid for or your money back.
              </p>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { icon: Shield, label: 'Max Coverage', value: formatZAR(BUYER_PROTECTION_LIMIT) },
              { icon: Clock, label: 'Review Time', value: '24-48 hrs' },
              { icon: RefreshCw, label: 'Refund Processing', value: '3-5 days' },
              { icon: Lock, label: 'POPIA Compliant', value: 'Always' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center"
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-emerald-200" />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-emerald-200 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {/* What's Covered */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            What's Covered
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Package,
                title: 'Item Not Received',
                desc: 'If your item never arrives after the expected delivery window, file a dispute for a full refund.',
                color: 'text-red-600',
                bg: 'bg-red-50',
                border: 'border-red-200',
              },
              {
                icon: XCircle,
                title: 'Not as Described',
                desc: 'Received something significantly different from the listing? Get a full or partial refund.',
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
              },
              {
                icon: AlertTriangle,
                title: 'Damaged Items',
                desc: 'Item arrived damaged? Document with photos and file a dispute within 7 days of delivery.',
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                border: 'border-orange-200',
              },
              {
                icon: RefreshCw,
                title: 'Wrong Item Sent',
                desc: 'Received a completely different item? Full refund guaranteed once verified.',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-200',
              },
              {
                icon: CreditCard,
                title: 'Secure Payments',
                desc: 'All PayFast transactions are encrypted and processed securely. Your payment details are never stored.',
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                border: 'border-indigo-200',
              },
              {
                icon: Award,
                title: 'Verified Sellers',
                desc: 'Look for the verified badge. These sellers have completed identity verification for extra trust.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`${item.bg} border ${item.border} rounded-2xl p-5 hover:shadow-md transition-shadow`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Eligible Order Statuses */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            Eligible Order Statuses
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Eligible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    {
                      status: 'Paid',
                      eligible: true,
                      notes: 'Payment confirmed. Seller preparing order.',
                    },
                    {
                      status: 'Shipped',
                      eligible: true,
                      notes: 'Item dispatched. Tracking available.',
                    },
                    {
                      status: 'Delivered',
                      eligible: true,
                      notes: 'File within 7 days of delivery confirmation.',
                    },
                    {
                      status: 'Pending',
                      eligible: false,
                      notes: 'Payment not yet confirmed. Wait for confirmation.',
                    },
                    {
                      status: 'Cancelled',
                      eligible: false,
                      notes: 'Order was cancelled. No protection needed.',
                    },
                    {
                      status: 'Refunded',
                      eligible: false,
                      notes: 'Already refunded. Dispute resolved.',
                    },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                            row.eligible
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {row.eligible ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How to File a Dispute - Timeline */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            How to File a Dispute
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200 hidden sm:block" />
            <div className="space-y-6">
              {TIMELINE_STEPS.map((step, i) => (
                <div key={i} className="flex gap-4 sm:gap-6 items-start">
                  <div
                    className={`w-12 h-12 ${step.bg} rounded-xl flex items-center justify-center flex-shrink-0 relative z-10`}
                  >
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        {step.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Refund Timelines */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            Refund Timelines
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Item Not Received',
                timeline: '1-3 business days',
                desc: 'After seller fails to provide proof of shipment within 72 hours.',
                color: 'border-l-red-500',
              },
              {
                title: 'Item Not as Described',
                timeline: '3-5 business days',
                desc: 'After review of evidence from both parties.',
                color: 'border-l-amber-500',
              },
              {
                title: 'Damaged / Wrong Item',
                timeline: '3-7 business days',
                desc: 'May require return of item. Refund upon confirmation.',
                color: 'border-l-orange-500',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl border border-gray-200 border-l-4 ${item.color} p-5`}
              >
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {item.timeline}
                </p>
                <p className="text-sm text-gray-500 mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Important: File disputes promptly
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Disputes must be filed within 7 days of delivery confirmation or
                14 days after expected delivery date (for items not received).
                Late disputes may not be eligible for protection.
              </p>
            </div>
          </div>
        </section>

        {/* Coverage Limits */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            Coverage Limits
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  What's Included
                </h3>
                <ul className="space-y-2">
                  {[
                    `Coverage up to ${formatZAR(BUYER_PROTECTION_LIMIT)} per transaction`,
                    'Item price fully covered within limits',
                    'Service fee refunded for eligible disputes',
                    'Free dispute filing — no additional cost',
                    'POPIA-compliant evidence handling',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  What's Not Covered
                </h3>
                <ul className="space-y-2">
                  {[
                    'In-person cash transactions',
                    'Payments made outside SnapUp/PayFast',
                    'Digital goods and services',
                    'Items where buyer confirmed satisfaction',
                    'Disputes filed after the 7/14 day window',
                    'Amounts exceeding R5,000 coverage limit',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-500"
                    >
                      <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </div>
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-gray-900 pr-4 text-sm sm:text-base">
                    {item.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact / Help */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                Need Help with a Dispute?
              </h3>
              <p className="text-gray-600 mt-1">
                Our support team is here to help. If you have questions about
                Buyer Protection or need assistance with a dispute, reach out to
                us.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <a
                  href="mailto:snapmart.officialapp@gmail.com"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-200"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Support
                </a>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm border border-gray-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Marketplace
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* POPIA Notice */}
        <div className="flex items-start gap-3 p-4 bg-gray-100 rounded-xl">
          <Lock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600 font-semibold">
              POPIA Compliance Notice
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              All dispute evidence, personal information, and communications are
              processed in compliance with South Africa's Protection of Personal
              Information Act (POPIA). Evidence is retained only for the duration
              necessary to resolve disputes and is securely deleted thereafter.
              You have the right to access, correct, or request deletion of your
              data at any time.{' '}
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:underline"
              >
                Read our Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerProtectionPage;
