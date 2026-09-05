import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-3xl shadow-xl border border-slate-100">
        <Link href="/" className="inline-flex items-center space-x-2 text-sm font-bold text-[#16c47f] hover:text-[#0f172a] transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-4">Disclaimer</h1>
        <p className="text-sm text-slate-400 font-medium mb-10 uppercase tracking-wider">Last Updated: September 2026</p>
        
        <div className="space-y-8 text-slate-600 leading-relaxed text-base">
          <p>
            The information contained on the AgentsApp platform (managed by M/S. CHENNAMANENI SREENIVAS RAO) is for general information purposes only.
          </p>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">No Warranties</h2>
            <p>
              While we strive to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability with respect to the platform or the information, products, services, or related graphics contained on the platform for any purpose. Any reliance you place on such information is therefore strictly at your own risk.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Real Estate Transactions</h2>
            <p>
              AgentsApp acts solely as a technology provider and B2B communication platform connecting real estate developers, builders, and channel partners. We are not a registered real estate broker, agent, or developer. We do not participate in, negotiate, or guarantee any transactions, commission payouts, or real estate agreements made between parties using our software.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">Limitation of Liability</h2>
            <p>
              In no event will we be liable for any loss or damage including without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits arising out of, or in connection with, the use of this platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">External Links</h2>
            <p>
              Through this platform, you are able to link to other websites which are not under our control. We have no control over the nature, content, and availability of those sites. The inclusion of any links does not necessarily imply a recommendation or endorse the views expressed within them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
