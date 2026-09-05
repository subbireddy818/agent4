import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-3xl shadow-xl border border-slate-100">
        <Link href="/" className="inline-flex items-center space-x-2 text-sm font-bold text-[#16c47f] hover:text-[#0f172a] transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-8">About Us</h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
          <p>
            Welcome to <strong>AgentsApp</strong>, managed legally as <em>Rao chennamaneni sreenivas</em>. We are a premier B2B PropTech platform dedicated to transforming the way real estate builders, developers, and channel partners collaborate.
          </p>
          <p>
            Founded with a vision to digitize the fragmented real estate ecosystem, our platform provides cutting-edge tools for inventory management, real-time lead tracking, and automated WhatsApp communication. We bridge the gap between real estate supply and the agent distribution network.
          </p>
          
          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">Our Mission</h2>
          <p>
            To empower real estate professionals with technology that simplifies operations, increases transparency, and accelerates sales velocity. We believe that by providing agents and builders with seamless digital infrastructure, we can create a more trustworthy and efficient market for homebuyers.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">Why Choose Us?</h2>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Verified Network:</strong> We ensure every channel partner and builder on our platform undergoes strict RERA verification.</li>
            <li><strong>WhatsApp Integration:</strong> Manage your entire business directly from WhatsApp without logging into complex dashboards.</li>
            <li><strong>Real-Time Inventory:</strong> Never sell a booked plot again. Live inventory sync ensures everyone is on the same page.</li>
            <li><strong>Instant Payout Tracking:</strong> Transparent commission tracking and invoice management.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
