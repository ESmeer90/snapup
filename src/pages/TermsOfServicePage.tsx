import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, Mail, MapPin, FileText, Users, Scale,
  CreditCard, AlertTriangle, Ban, Globe, Gavel, CheckCircle2,
  ShoppingBag, MessageSquare, Lock, ExternalLink, BookOpen
} from 'lucide-react';
import SEOHead from '@/components/snapup/SEOHead';

const TermsOfServicePage: React.FC = () => {
  const lastUpdated = '23 February 2026';

  const sections = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <>
          <p>
            By accessing, browsing, or using the SnapUp Marketplace platform ("SnapUp", "the Platform", "we", "us", or "our"),
            you ("User", "you", or "your") agree to be bound by these Terms of Service ("Terms"), our{' '}
            <Link to="/privacy-policy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>, and our{' '}
            <Link to="/buyer-protection" className="text-blue-600 hover:underline font-medium">Buyer Protection Policy</Link>.
          </p>
          <p>
            If you do not agree to these Terms, you must not use the Platform. We reserve the right to modify these Terms
            at any time. Continued use of SnapUp after changes constitutes acceptance of the revised Terms.
          </p>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of South Africa,
            including the Consumer Protection Act 68 of 2008 ("CPA") and the Electronic Communications and Transactions
            Act 25 of 2002 ("ECTA").
          </p>
        </>
      ),
    },
    {
      id: 'user-obligations',
      title: '2. User Obligations & Account Responsibilities',
      icon: <Users className="w-5 h-5" />,
      content: (
        <>
          <p>By creating an account on SnapUp, you represent and warrant that:</p>
          <ul className="space-y-2 my-3">
            {[
              'You are at least 18 years of age or have the consent of a parent or legal guardian',
              'You are a natural person or duly registered entity in South Africa',
              'All information you provide during registration is accurate, complete, and current',
              'You will maintain the security of your account credentials and not share them with third parties',
              'You are solely responsible for all activity that occurs under your account',
              'You will not create multiple accounts for fraudulent or deceptive purposes',
              'You will comply with all applicable South African laws and regulations',
              'You will not use the Platform for any unlawful, harmful, or fraudulent activity',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            You must notify us immediately at{' '}
            <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-600 hover:underline font-medium">
              snapmart.officialapp@gmail.com
            </a>{' '}
            if you suspect any unauthorised use of your account.
          </p>
        </>
      ),
    },
    {
      id: 'listing-rules',
      title: '3. Listing Rules & Prohibited Items',
      icon: <ShoppingBag className="w-5 h-5" />,
      content: (
        <>
          <p>When creating listings on SnapUp, sellers must adhere to the following rules:</p>
          <div className="bg-gray-50 rounded-xl p-4 my-3 border border-gray-100">
            <p className="font-semibold text-gray-900 text-sm mb-2">Listing Requirements</p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li>Listings must accurately describe the item being sold, including condition, defects, and specifications</li>
              <li>All images must be of the actual item (stock photos are not permitted)</li>
              <li>Prices must be stated in South African Rand (ZAR) and include all applicable costs</li>
              <li>Sellers must have legal ownership or authority to sell the listed item</li>
              <li>Duplicate or spam listings are prohibited and may result in account suspension</li>
            </ul>
          </div>
          <p className="font-semibold text-gray-900 mt-4 mb-2">Prohibited Items</p>
          <p>The following items may not be listed or sold on SnapUp:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
            {[
              'Illegal drugs or controlled substances',
              'Firearms, ammunition, or explosives',
              'Stolen property or goods of uncertain provenance',
              'Counterfeit or pirated goods',
              'Hazardous materials or chemicals',
              'Human organs, body parts, or bodily fluids',
              'Endangered species or products derived from them',
              'Items that infringe intellectual property rights',
              'Pornographic or obscene material',
              'Items prohibited under South African law',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg p-2.5 border border-red-100">
                <Ban className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-800">{item}</span>
              </div>
            ))}
          </div>
          <p>
            SnapUp reserves the right to remove any listing that violates these rules without notice and to suspend
            or terminate the account of repeat offenders.
          </p>
        </>
      ),
    },
    {
      id: 'payment-terms',
      title: '4. Payment Terms & PayFast Integration',
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <>
          <p>
            All payments on SnapUp are processed through{' '}
            <strong>PayFast (Pty) Ltd</strong>, a PCI-DSS compliant South African payment gateway.
            SnapUp does not directly handle, store, or process credit card or bank account details.
          </p>
          <div className="space-y-3 my-3">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Service Fee</p>
              <p className="text-sm text-gray-600 mt-1">
                A service fee of <strong>2.5%</strong> is added to each transaction to cover platform operating costs,
                buyer protection, and payment processing. This fee is clearly displayed to buyers before purchase.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Seller Commission</p>
              <p className="text-sm text-gray-600 mt-1">
                SnapUp charges a tiered commission on completed sales. Commission rates are transparently displayed
                in the seller dashboard. Sellers receive the net amount after commission deduction.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Escrow Protection</p>
              <p className="text-sm text-gray-600 mt-1">
                Payments for eligible transactions are held in escrow until the buyer confirms delivery.
                Funds are automatically released to the seller after the escrow period (typically 48 hours
                after delivery confirmation), unless a dispute is raised.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Refunds</p>
              <p className="text-sm text-gray-600 mt-1">
                Refunds are processed in accordance with the Consumer Protection Act and our Buyer Protection Policy.
                Eligible refunds are returned via the original payment method through PayFast.
                Processing times are typically 5-10 business days.
              </p>
            </div>
          </div>
          <p>
            By using SnapUp, you also agree to PayFast's{' '}
            <a href="https://www.payfast.co.za/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
              Terms of Service
            </a>.
          </p>
        </>
      ),
    },
    {
      id: 'buyer-seller-obligations',
      title: '5. Buyer & Seller Obligations',
      icon: <Scale className="w-5 h-5" />,
      content: (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="font-bold text-blue-900 text-sm mb-2">Buyer Obligations</p>
              <ul className="space-y-1.5 text-sm text-blue-800/80">
                <li>Pay the agreed price plus service fee promptly</li>
                <li>Provide accurate delivery information</li>
                <li>Inspect items upon receipt and report issues within 48 hours</li>
                <li>Confirm delivery within the escrow period</li>
                <li>Communicate respectfully with sellers</li>
                <li>Not file false or fraudulent disputes</li>
              </ul>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="font-bold text-emerald-900 text-sm mb-2">Seller Obligations</p>
              <ul className="space-y-1.5 text-sm text-emerald-800/80">
                <li>Accurately describe items and their condition</li>
                <li>Ship items within the agreed timeframe</li>
                <li>Provide tracking information when available</li>
                <li>Respond to buyer inquiries within 48 hours</li>
                <li>Honour the agreed price and terms</li>
                <li>Comply with the Consumer Protection Act</li>
              </ul>
            </div>
          </div>
          <p>
            SnapUp acts as an intermediary platform and is not a party to transactions between buyers and sellers.
            We facilitate communication, payment processing, and dispute resolution, but we do not guarantee the
            quality, safety, legality, or accuracy of any listing or transaction.
          </p>
        </>
      ),
    },
    {
      id: 'dispute-resolution',
      title: '6. Dispute Resolution Process',
      icon: <Gavel className="w-5 h-5" />,
      content: (
        <>
          <p>
            SnapUp provides a structured dispute resolution process to protect both buyers and sellers:
          </p>
          <div className="space-y-3 my-3">
            {[
              {
                step: 'Step 1: Direct Communication',
                desc: 'Buyers and sellers are encouraged to resolve issues directly through SnapUp\'s messaging system. Most disputes can be resolved through open communication.',
              },
              {
                step: 'Step 2: Formal Dispute',
                desc: 'If direct communication fails, either party may open a formal dispute through the SnapUp platform within 7 days of delivery. The disputing party must provide evidence (photos, messages, etc.).',
              },
              {
                step: 'Step 3: Seller Response',
                desc: 'The other party has 48 hours to respond to the dispute with their evidence and proposed resolution.',
              },
              {
                step: 'Step 4: SnapUp Mediation',
                desc: 'If the parties cannot agree, SnapUp\'s dispute resolution team will review all evidence and make a binding decision within 5 business days.',
              },
              {
                step: 'Step 5: Resolution',
                desc: 'Based on the review, SnapUp may issue a full refund, partial refund, release funds to the seller, or require the item to be returned. Escrow funds are held during the dispute process.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">{item.step}</p>
                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <p>
            Nothing in this dispute resolution process limits your rights under the Consumer Protection Act
            or your right to approach the National Consumer Commission, a consumer court, or any other
            competent authority.
          </p>
        </>
      ),
    },
    {
      id: 'limitation-of-liability',
      title: '7. Limitation of Liability',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: (
        <>
          <p>To the maximum extent permitted by South African law:</p>
          <ul className="space-y-2 my-3">
            {[
              'SnapUp provides the Platform on an "as is" and "as available" basis without warranties of any kind, whether express or implied',
              'SnapUp is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform',
              'SnapUp is not responsible for the actions, content, information, or data of third parties, including other users',
              'SnapUp\'s total liability to you for any claims arising from or related to the Platform shall not exceed the total fees paid by you to SnapUp in the 12 months preceding the claim',
              'SnapUp is not liable for any loss or damage resulting from unauthorised access to your account due to your failure to maintain account security',
              'SnapUp does not guarantee uninterrupted, secure, or error-free operation of the Platform',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Consumer Protection Act Notice:</strong> Nothing in these Terms is intended to limit or
                exclude any rights you may have under the Consumer Protection Act 68 of 2008. Where these Terms
                conflict with the CPA, the CPA shall prevail.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'intellectual-property',
      title: '8. Intellectual Property',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <>
          <p>
            All content on the SnapUp Platform, including but not limited to the logo, design, text, graphics,
            software, and source code, is the property of SnapUp or its licensors and is protected by South African
            and international intellectual property laws.
          </p>
          <div className="space-y-3 my-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">User-Generated Content</p>
              <p className="text-sm text-gray-600 mt-0.5">
                By posting listings, images, reviews, or other content on SnapUp, you grant us a non-exclusive,
                worldwide, royalty-free licence to use, display, and distribute such content solely for the
                purpose of operating the Platform. You retain ownership of your content.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Infringement Claims</p>
              <p className="text-sm text-gray-600 mt-0.5">
                If you believe that content on SnapUp infringes your intellectual property rights, please
                contact us at{' '}
                <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-600 hover:underline">
                  snapmart.officialapp@gmail.com
                </a>{' '}
                with details of the alleged infringement. We will investigate and take appropriate action
                in accordance with South African law.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'communication',
      title: '9. Communication & Messaging',
      icon: <MessageSquare className="w-5 h-5" />,
      content: (
        <>
          <p>
            SnapUp provides an in-platform messaging system for communication between buyers and sellers.
            When using this system, you agree to:
          </p>
          <ul className="space-y-2 my-3">
            {[
              'Communicate respectfully and professionally at all times',
              'Not use the messaging system to harass, threaten, or abuse other users',
              'Not share personal contact information (phone numbers, addresses) outside of legitimate transaction purposes',
              'Not use the messaging system to conduct transactions outside of SnapUp (circumventing our payment and protection systems)',
              'Not send spam, unsolicited advertising, or promotional content',
              'Report any suspicious or fraudulent messages to SnapUp immediately',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            Messages may be monitored by automated spam filters. SnapUp reserves the right to review messages
            in the context of dispute resolution or fraud investigation, in compliance with POPIA.
          </p>
        </>
      ),
    },
    {
      id: 'account-termination',
      title: '10. Account Suspension & Termination',
      icon: <Ban className="w-5 h-5" />,
      content: (
        <>
          <p>SnapUp may suspend or terminate your account, without prior notice, if you:</p>
          <ul className="space-y-2 my-3">
            {[
              'Violate any provision of these Terms of Service',
              'Engage in fraudulent, deceptive, or illegal activity',
              'Repeatedly receive negative feedback or disputes from other users',
              'List prohibited items or engage in prohibited conduct',
              'Attempt to circumvent SnapUp\'s payment or protection systems',
              'Create multiple accounts for fraudulent purposes',
              'Fail to respond to legitimate buyer inquiries or disputes',
              'Provide false or misleading information during registration or verification',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Ban className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            You may voluntarily terminate your account at any time through the{' '}
            <Link to="/settings" className="text-blue-600 hover:underline font-medium">Account Settings</Link> page.
            Upon termination, all your personal data will be permanently deleted in accordance with our Privacy Policy
            and POPIA requirements.
          </p>
          <p>
            Any pending transactions or active disputes must be resolved before account termination.
            Funds held in escrow will be processed according to the applicable dispute resolution outcome.
          </p>
        </>
      ),
    },
    {
      id: 'privacy-data',
      title: '11. Privacy & Data Protection (POPIA)',
      icon: <Lock className="w-5 h-5" />,
      content: (
        <>
          <p>
            Your use of SnapUp is also governed by our{' '}
            <Link to="/privacy-policy" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>,
            which details how we collect, use, and protect your personal information in compliance with the
            Protection of Personal Information Act 4 of 2013 (POPIA).
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-3">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">POPIA Compliance</p>
                <p className="text-sm text-blue-800/80 mt-1">
                  SnapUp is committed to protecting your personal information. We process data only for
                  legitimate marketplace purposes, implement robust security measures, and respect your
                  rights as a data subject. You may exercise your POPIA rights at any time by contacting
                  our Information Officer.
                </p>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'governing-law',
      title: '12. Governing Law & Jurisdiction',
      icon: <Globe className="w-5 h-5" />,
      content: (
        <>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            Republic of South Africa, without regard to its conflict of law provisions.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-3">
            <p className="font-semibold text-gray-900 text-sm">Applicable Legislation</p>
            <ul className="space-y-1.5 mt-2 text-sm text-gray-600">
              <li>Consumer Protection Act 68 of 2008 (CPA)</li>
              <li>Electronic Communications and Transactions Act 25 of 2002 (ECTA)</li>
              <li>Protection of Personal Information Act 4 of 2013 (POPIA)</li>
              <li>National Credit Act 34 of 2005 (where applicable)</li>
              <li>Prevention of Organised Crime Act 121 of 1998 (POCA)</li>
            </ul>
          </div>
          <p>
            Any dispute arising from these Terms that cannot be resolved through our dispute resolution
            process shall be subject to the exclusive jurisdiction of the courts of the Republic of South Africa,
            specifically the Magistrate's Court or High Court having jurisdiction in the Northern Cape Province.
          </p>
          <p>
            Nothing in these Terms limits your right to approach the National Consumer Commission,
            a consumer court, or any other competent authority established under South African law.
          </p>
        </>
      ),
    },
    {
      id: 'changes',
      title: '13. Changes to These Terms',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <p>
          SnapUp reserves the right to modify these Terms at any time. Material changes will be communicated
          to registered users via email or through a prominent notice on the Platform at least 14 days before
          taking effect, in accordance with ECTA requirements. Your continued use of SnapUp after the effective
          date of any changes constitutes your acceptance of the revised Terms. If you do not agree with the
          changes, you must stop using the Platform and may request account deletion.
        </p>
      ),
    },
    {
      id: 'contact',
      title: '14. Contact Information',
      icon: <Mail className="w-5 h-5" />,
      content: (
        <>
          <p>
            For questions, concerns, or complaints regarding these Terms of Service, please contact us:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 my-3 space-y-2">
            <p className="font-semibold text-gray-900">SnapUp Marketplace</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-blue-500" />
              <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-600 hover:underline">
                snapmart.officialapp@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>Kimberley, Northern Cape, 8301, South Africa</span>
            </div>
          </div>
          <p className="mt-3">
            For consumer complaints, you may also contact:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 my-3 space-y-2">
            <p className="font-semibold text-gray-900">National Consumer Commission</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>https://www.thencc.gov.za</span>
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEOHead
        title="Terms of Service"
        description="SnapUp Terms of Service. Read our legally compliant South African e-commerce terms covering user obligations, payment terms, dispute resolution, and governing law."
        canonical="/terms-of-service"
        ogUrl="/terms-of-service"
        jsonLd={{
          '@type': 'WebPage',
          name: 'SnapUp Terms of Service',
          description: 'Terms of Service for SnapUp Marketplace, compliant with South African Consumer Protection Act and ECTA.',
          url: 'https://snapup.co.za/terms-of-service',
          dateModified: '2026-02-23',
          inLanguage: 'en-ZA',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-white font-black text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Snap<span className="text-blue-600">Up</span></span>
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Scale className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">SA Law Compliant</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Terms of Service</h1>
          <p className="text-blue-100 mt-3 text-base sm:text-lg max-w-2xl leading-relaxed">
            These terms govern your use of the SnapUp Marketplace platform. Please read them carefully
            before using our services.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-blue-200">
            <span>Last updated: {lastUpdated}</span>
            <span className="hidden sm:inline">|</span>
            <span>Effective: {lastUpdated}</span>
            <span className="hidden sm:inline">|</span>
            <span>South African Law</span>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-blue-500">{section.icon}</span>
                <span>{section.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm scroll-mt-20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                  {section.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              </div>
              <div className="prose prose-sm prose-gray max-w-none text-gray-600 leading-relaxed space-y-3">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center">
          <Scale className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-blue-900 mb-2">Questions About These Terms?</h3>
          <p className="text-sm text-blue-800/80 max-w-lg mx-auto mb-6">
            If you have any questions about these Terms of Service or need clarification on any provision,
            please don't hesitate to contact us.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:snapmart.officialapp@gmail.com?subject=Terms%20of%20Service%20Enquiry"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 text-sm"
            >
              <Mail className="w-4 h-4" />
              Contact Us
            </a>
            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-blue-300 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-all text-sm"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            <Link
              to="/buyer-protection"
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-blue-300 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Buyer Protection
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>&copy; {new Date().getFullYear()} SnapUp Marketplace. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/" className="hover:text-blue-500 transition-colors">Home</Link>
            <span>|</span>
            <Link to="/privacy-policy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/settings" className="hover:text-blue-500 transition-colors">Settings</Link>
            <span>|</span>
            <span>Kimberley, Northern Cape, SA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfServicePage;
