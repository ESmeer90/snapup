import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, Mail, MapPin, Lock, Eye, Users, Database,
  Trash2, AlertTriangle, FileText, ExternalLink, CheckCircle2, Globe
} from 'lucide-react';
import SEOHead from '@/components/snapup/SEOHead';

const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = '19 February 2026';

  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <>
          <p>
            SnapUp Marketplace ("SnapUp", "we", "us", or "our") is committed to protecting your personal information 
            and your right to privacy in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA") 
            of the Republic of South Africa.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            online marketplace platform. Please read this policy carefully. If you do not agree with the terms of this 
            privacy policy, please do not access the platform.
          </p>
          <p>
            SnapUp is headquartered in Kimberley, Northern Cape, South Africa, and operates as a marketplace connecting 
            buyers and sellers across all nine provinces of South Africa.
          </p>
        </>
      ),
    },
    {
      id: 'responsible-party',
      title: '2. Responsible Party (POPIA Section 1)',
      icon: <Users className="w-5 h-5" />,
      content: (
        <>
          <p>In terms of POPIA, the responsible party for the processing of your personal information is:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-3">
            <p className="font-semibold text-gray-900">SnapUp Marketplace</p>
            <p className="text-sm text-gray-600 mt-1">Kimberley, Northern Cape, 8301</p>
            <p className="text-sm text-gray-600">South Africa</p>
            <p className="text-sm text-gray-600 mt-2">
              Information Officer Email:{' '}
              <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-600 hover:underline">
                snapmart.officialapp@gmail.com
              </a>
            </p>
          </div>
          <p>
            Our Information Officer is responsible for ensuring compliance with POPIA and handling all data subject 
            requests. You may contact the Information Officer at any time regarding your personal information.
          </p>
        </>
      ),
    },
    {
      id: 'information-collected',
      title: '3. Personal Information We Collect',
      icon: <Database className="w-5 h-5" />,
      content: (
        <>
          <p>We collect personal information that you voluntarily provide when you:</p>
          <ul className="list-disc pl-5 space-y-1.5 my-3">
            <li>Register for an account on SnapUp</li>
            <li>Create or manage listings on the marketplace</li>
            <li>Communicate with other users through our messaging system</li>
            <li>Make purchases or sales through the platform</li>
            <li>Contact us for support</li>
          </ul>
          <p className="font-semibold text-gray-900 mt-4 mb-2">Categories of personal information collected:</p>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Identity Information</p>
              <p className="text-sm text-gray-600 mt-0.5">Full name, email address, province of residence</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Contact Information</p>
              <p className="text-sm text-gray-600 mt-0.5">Phone number (optional), email address</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Listing Information</p>
              <p className="text-sm text-gray-600 mt-0.5">Item descriptions, photos, prices, locations</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Transaction Information</p>
              <p className="text-sm text-gray-600 mt-0.5">Order history, payment references (via PayFast)</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Communication Data</p>
              <p className="text-sm text-gray-600 mt-0.5">Messages exchanged between users on the platform</p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'purpose',
      title: '4. Purpose of Processing (POPIA Section 13)',
      icon: <Eye className="w-5 h-5" />,
      content: (
        <>
          <p>We process your personal information for the following specific, explicitly defined, and legitimate purposes:</p>
          <ul className="space-y-2 my-3">
            {[
              'To create and manage your SnapUp account',
              'To enable you to list items for sale on the marketplace',
              'To facilitate communication between buyers and sellers',
              'To process transactions and payments through PayFast',
              'To send you important account notifications and updates',
              'To maintain the security and integrity of our platform',
              'To comply with legal obligations under South African law',
              'To resolve disputes and enforce our terms of service',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            We will not process your personal information for any purpose other than those stated above without 
            obtaining your explicit consent, unless required by law.
          </p>
        </>
      ),
    },
    {
      id: 'consent',
      title: '5. Consent (POPIA Section 11)',
      icon: <CheckCircle2 className="w-5 h-5" />,
      content: (
        <>
          <p>
            By creating an account on SnapUp, you provide your voluntary, specific, and informed consent for us to 
            process your personal information as described in this Privacy Policy, in accordance with POPIA Section 11(1)(a).
          </p>
          <p>
            You may withdraw your consent at any time by:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 my-3">
            <li>Deleting your account through the Settings page (which permanently erases all your data)</li>
            <li>Contacting our Information Officer at snapmart.officialapp@gmail.com</li>
          </ul>
          <p>
            Please note that withdrawal of consent may result in the inability to use certain features of the platform.
          </p>
        </>
      ),
    },
    {
      id: 'data-security',
      title: '6. Data Security (POPIA Section 19)',
      icon: <Lock className="w-5 h-5" />,
      content: (
        <>
          <p>
            We implement appropriate technical and organisational measures to protect your personal information against 
            unauthorised access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul className="space-y-2 my-3">
            {[
              '256-bit SSL/TLS encryption for all data in transit',
              'Encrypted storage of passwords using industry-standard hashing algorithms',
              'Row-level security (RLS) policies on our database to ensure users can only access their own data',
              'Secure authentication through Supabase Auth with session management',
              'Regular security audits and vulnerability assessments',
              'Payment processing handled by PayFast, a PCI-DSS compliant payment gateway',
              'Image storage with access controls on Supabase Storage',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            In the event of a data breach that may compromise your personal information, we will notify you and the 
            Information Regulator as required by POPIA Section 22, within a reasonable timeframe.
          </p>
        </>
      ),
    },
    {
      id: 'third-parties',
      title: '7. Third-Party Sharing (POPIA Section 18)',
      icon: <Globe className="w-5 h-5" />,
      content: (
        <>
          <p>
            We do not sell, rent, or trade your personal information to third parties. We may share limited 
            information with the following service providers who assist in operating our platform:
          </p>
          <div className="space-y-3 my-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">PayFast (Pty) Ltd</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Payment processing — receives transaction amounts and payment references only. 
                PayFast is a South African company compliant with PCI-DSS standards.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="font-medium text-gray-800 text-sm">Supabase Inc.</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Cloud infrastructure and database hosting — processes data under strict data processing agreements 
                with appropriate security measures.
              </p>
            </div>
          </div>
          <p>
            All third-party service providers are contractually obligated to protect your personal information and 
            may only process it for the specific purposes outlined in our agreements with them.
          </p>
        </>
      ),
    },
    {
      id: 'data-subject-rights',
      title: '8. Your Rights as a Data Subject (POPIA Section 23-25)',
      icon: <Users className="w-5 h-5" />,
      content: (
        <>
          <p>Under POPIA, you have the following rights regarding your personal information:</p>
          <div className="space-y-3 my-3">
            {[
              {
                right: 'Right of Access (Section 23)',
                desc: 'You may request confirmation of whether we hold personal information about you and request a copy of that information.',
              },
              {
                right: 'Right to Correction (Section 24(1)(a))',
                desc: 'You may request the correction or deletion of personal information that is inaccurate, irrelevant, excessive, out of date, incomplete, misleading, or obtained unlawfully. You can update your name and province directly in your Account Settings.',
              },
              {
                right: 'Right to Deletion (Section 24(1)(b))',
                desc: 'You may request the destruction or deletion of personal information that we are no longer authorised to retain. You can delete your entire account and all data through the Account Settings page.',
              },
              {
                right: 'Right to Object (Section 11(3))',
                desc: 'You may object to the processing of your personal information on reasonable grounds.',
              },
              {
                right: 'Right to Lodge a Complaint',
                desc: 'You have the right to lodge a complaint with the Information Regulator if you believe your rights have been infringed.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="font-semibold text-blue-900 text-sm">{item.right}</p>
                <p className="text-sm text-blue-800/80 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <p>
            To exercise any of these rights, please contact our Information Officer at{' '}
            <a href="mailto:snapmart.officialapp@gmail.com" className="text-blue-600 hover:underline font-medium">
              snapmart.officialapp@gmail.com
            </a>
            . We will respond to your request within 30 days as required by POPIA.
          </p>
        </>
      ),
    },
    {
      id: 'data-retention',
      title: '9. Data Retention (POPIA Section 14)',
      icon: <Database className="w-5 h-5" />,
      content: (
        <>
          <p>
            We retain your personal information only for as long as necessary to fulfil the purposes for which it 
            was collected, or as required by law. Specifically:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 my-3">
            <li><strong>Account data:</strong> Retained for the duration of your account. Deleted permanently when you delete your account.</li>
            <li><strong>Listing data:</strong> Active listings are retained while your account is active. Deleted permanently when you delete your account.</li>
            <li><strong>Transaction records:</strong> May be retained for up to 5 years after the transaction date for tax and legal compliance purposes, unless you request earlier deletion.</li>
            <li><strong>Messages:</strong> Retained while your account is active. Deleted permanently when you delete your account.</li>
            <li><strong>Images:</strong> Stored in our secure storage and deleted permanently when the associated listing is removed or your account is deleted.</li>
          </ul>
          <p>
            When you delete your account, all personal information is permanently and irreversibly erased from our 
            systems, including backups, within 30 days.
          </p>
        </>
      ),
    },
    {
      id: 'account-deletion',
      title: '10. Account Deletion & Data Erasure',
      icon: <Trash2 className="w-5 h-5" />,
      content: (
        <>
          <p>
            SnapUp provides a self-service account deletion feature accessible through your{' '}
            <Link to="/settings" className="text-blue-600 hover:underline font-medium">Account Settings</Link> page. 
            When you delete your account, the following data is permanently erased:
          </p>
          <ul className="space-y-2 my-3">
            {[
              'Your profile and all personal information',
              'All listings you have created, including uploaded images',
              'All messages (sent and received)',
              'All order and transaction history',
              'All saved favourites',
              'Your authentication credentials',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Trash2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 my-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Account deletion is permanent and irreversible. Once deleted, your data 
                cannot be recovered. Please ensure you have saved any information you may need before proceeding.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'cookies',
      title: '11. Cookies & Local Storage',
      icon: <Database className="w-5 h-5" />,
      content: (
        <>
          <p>
            SnapUp uses essential cookies and local storage to maintain your authentication session and provide 
            core platform functionality. We do not use tracking cookies or third-party analytics cookies.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 my-3">
            <p className="font-medium text-gray-800 text-sm">Essential Cookies Only</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Authentication session tokens, user preferences (e.g., selected province). These are strictly 
              necessary for the platform to function and do not require separate consent under POPIA.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 'children',
      title: '12. Children\'s Privacy',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <p>
          SnapUp is not intended for use by children under the age of 18. We do not knowingly collect personal 
          information from children. If we become aware that we have collected personal information from a child 
          under 18 without parental consent, we will take steps to delete that information immediately. In terms 
          of POPIA Section 35, the processing of personal information of children requires the consent of a 
          competent person.
        </p>
      ),
    },
    {
      id: 'changes',
      title: '13. Changes to This Policy',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or legal 
          requirements. We will notify you of any material changes by posting the updated policy on this page 
          with a revised "Last Updated" date. Your continued use of SnapUp after such changes constitutes your 
          acceptance of the updated policy.
        </p>
      ),
    },
    {
      id: 'contact',
      title: '14. Contact Us',
      icon: <Mail className="w-5 h-5" />,
      content: (
        <>
          <p>
            If you have any questions about this Privacy Policy, your personal information, or wish to exercise 
            your POPIA rights, please contact us:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 my-3 space-y-2">
            <p className="font-semibold text-gray-900">SnapUp Marketplace — Information Officer</p>
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
            You may also lodge a complaint with the Information Regulator:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 my-3 space-y-2">
            <p className="font-semibold text-gray-900">Information Regulator (South Africa)</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-blue-500" />
              <span>inforeg@justice.gov.za</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>https://inforegulator.org.za</span>
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEOHead
        title="Privacy Policy - POPIA Compliance"
        description="SnapUp Privacy Policy. Learn how we collect, use, and protect your personal information in compliance with South Africa's Protection of Personal Information Act (POPIA)."
        canonical="/privacy-policy"
        ogUrl="/privacy-policy"
        jsonLd={{
          '@type': 'WebPage',
          name: 'SnapUp Privacy Policy',
          description: 'Privacy Policy for SnapUp Marketplace, compliant with POPIA (Protection of Personal Information Act) of South Africa.',
          url: 'https://snapup.co.za/privacy-policy',
          dateModified: '2026-02-19',
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
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">POPIA Compliant</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
          <p className="text-blue-100 mt-3 text-base sm:text-lg max-w-2xl leading-relaxed">
            SnapUp is committed to protecting your personal information in compliance with the 
            Protection of Personal Information Act (POPIA) of South Africa.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-blue-200">
            <span>Last updated: {lastUpdated}</span>
            <span className="hidden sm:inline">|</span>
            <span>Effective: {lastUpdated}</span>
            <span className="hidden sm:inline">|</span>
            <span>POPIA Act 4 of 2013</span>
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
          <Shield className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-blue-900 mb-2">Your Privacy Matters to Us</h3>
          <p className="text-sm text-blue-800/80 max-w-lg mx-auto mb-6">
            If you have any questions about this Privacy Policy or wish to exercise your POPIA rights, 
            don't hesitate to reach out.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:snapmart.officialapp@gmail.com?subject=POPIA%20Enquiry"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 text-sm"
            >
              <Mail className="w-4 h-4" />
              Contact Information Officer
            </a>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-blue-300 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Account Settings
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
            <Link to="/settings" className="hover:text-blue-500 transition-colors">Settings</Link>
            <span>|</span>
            <span>Kimberley, Northern Cape, SA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
