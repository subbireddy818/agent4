import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-3xl shadow-xl border border-slate-100">
        <Link href="/" className="inline-flex items-center space-x-2 text-sm font-bold text-[#16c47f] hover:text-[#0f172a] transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-sm text-slate-400 font-medium mb-10 uppercase tracking-wider">Last Updated: September 2026</p>
        
        <div className="space-y-8 text-slate-600 leading-relaxed text-base">
          <p>
            M/S. CHENNAMANENI SREENIVAS RAO ("we," "us," or "our") respects your privacy and is committed to protecting the personal information you share with us through the AgentsApp platform. This Privacy Policy outlines our practices regarding data collection, usage, and security.
          </p>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Identity Information:</strong> Name, phone number, email address, and agency name.</li>
              <li><strong>Verification Data:</strong> KYC documents including RERA certificates, Aadhar cards, and PAN cards uploaded for account approval.</li>
              <li><strong>Usage Data:</strong> Application logs, WhatsApp interaction logs, and device information to improve service reliability.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">2. How We Use Your Information</h2>
            <p className="mb-2">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, operate, and maintain the platform.</li>
              <li>To verify the professional credentials of channel partners and builders.</li>
              <li>To send you transactional messages, updates, and platform notifications via WhatsApp and Email.</li>
              <li>To process attendance for webinars, launches, and events.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">3. WhatsApp Data & Messaging</h2>
            <p>
              By registering on our platform, you consent to receive business notifications and communications via the WhatsApp Business API. Your phone number and message contents are transmitted securely according to Meta's privacy guidelines. We do not sell your conversational data to third parties.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Data Security</h2>
            <p>
              We implement industry-standard security measures, including encryption and secure database hosting (Supabase), to protect your data against unauthorized access, alteration, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact our Data Protection Officer at <strong>hello@agentsapp.in</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
