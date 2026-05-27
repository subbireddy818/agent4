"use client";

import Link from "next/link";
import { 
  Building2, Users, Megaphone, CalendarCheck, 
  ArrowUpRight, BarChart3, TrendingUp, HelpCircle,
  Plus, Upload, Award, Gift, Sparkles
} from "lucide-react";

export default function BuilderDashboard() {
  const campaignsList = [
    { name: "Skyline Heights Launch", reach: "2,450 CP Brokers", readRate: "92%", ctr: "18.4%", rsvp: "342 RSVPed" },
    { name: "Urban Rise Phase-2 CP Meet", reach: "1,890 CP Brokers", readRate: "88%", ctr: "12.5%", rsvp: "156 RSVPed" },
    { name: "Prestige Commission Booster", reach: "4,112 CP Brokers", readRate: "94%", ctr: "22.1%", rsvp: "750 RSVPed" }
  ];

  return (
    <div className="space-y-8 text-slate-800">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Builder Hub Overview</h1>
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Sponsor webinars, broadcast campaigns, and circulate inventory in realtime.</p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link 
            href="/builder/campaigns" 
            className="glow-button px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-indigo-650/10"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Create Campaign</span>
          </Link>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-bold">
          <Link href="/builder/campaigns" className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-slate-700 flex flex-col items-center text-center transition">
            <span className="text-lg mb-1">📢</span>
            <span>Create Campaign</span>
          </Link>
          <Link href="/builder/projects/new" className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-slate-700 flex flex-col items-center text-center transition">
            <span className="text-lg mb-1">🚜</span>
            <span>Upload Inventory</span>
          </Link>
          <button onClick={() => alert("Sponsor Webinar: generate ₹500 Amazon rewards voucher pass.")} className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-slate-700 flex flex-col items-center text-center transition">
            <span className="text-lg mb-1">🎓</span>
            <span>Sponsor Webinar</span>
          </button>
          <button onClick={() => alert("Create CP Meet Launch event & generate QR pass.")} className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-slate-700 flex flex-col items-center text-center transition">
            <span className="text-lg mb-1">🚀</span>
            <span>Create Launch Event</span>
          </button>
          <button onClick={() => alert("Open Document vault to upload brochures.")} className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-slate-700 flex flex-col items-center text-center transition">
            <span className="text-lg mb-1">📄</span>
            <span>Upload Brochure</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">12</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Active Projects</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">8,452</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">CP Reach</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">24,200</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Views</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">1,248</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">RSVP Invites</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#25d366]/10 text-[#16c47f] flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Performance Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left - CSS Doughnut Performance */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Campaign Delivery ROI</span>
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-pointer" />
            </h3>

            <div className="py-6 flex justify-center items-center">
              <div className="relative w-36 h-36 rounded-full border-8 border-slate-100 flex items-center justify-center shadow-inner">
                <div className="absolute inset-0 rounded-full border-8 border-indigo-600 border-t-transparent border-l-transparent"></div>
                
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-slate-900">92%</div>
                  <div className="text-[9px] text-[#64748b] font-bold uppercase tracking-wider mt-0.5">Read Rate</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold pt-4 border-t border-slate-200/80">
              <div>
                <div className="text-indigo-500">92%</div>
                <div className="text-[9px] text-slate-400 uppercase mt-0.5">Read</div>
              </div>
              <div>
                <div className="text-purple-500">97%</div>
                <div className="text-[9px] text-slate-400 uppercase mt-0.5">Delivered</div>
              </div>
              <div>
                <div className="text-[#16c47f]">18.4%</div>
                <div className="text-[9px] text-slate-400 uppercase mt-0.5">CTR</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Campaigns list */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Active WhatsApp Campaigns</span>
            </h3>
            <span className="text-[9px] text-[#16c47f] font-bold uppercase tracking-wider">
              Realtime feed
            </span>
          </div>

          <div className="space-y-3">
            {campaignsList.map((camp, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition flex justify-between items-center text-xs font-semibold text-slate-655"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900">{camp.name}</div>
                  <div className="text-[10px] text-slate-500">
                    Sponsor segment: <span className="text-slate-700">{camp.reach}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-right">
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase">CTR</div>
                    <div className="font-bold text-indigo-500 mt-0.5">{camp.ctr}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase">Read</div>
                    <div className="font-bold text-slate-800 mt-0.5">{camp.readRate}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-slate-400 uppercase">RSVPs</div>
                    <div className="font-bold text-[#16c47f] mt-0.5">{camp.rsvp.split(" ")[0]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
