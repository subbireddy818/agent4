"use client";

import Link from "next/link";
import { 
  ShieldAlert, Users, Building, MessageSquare, 
  Clock, CheckCircle2, ChevronRight 
} from "lucide-react";

export default function AdminDashboard() {
  const pendingRegistrations = [
    { name: "Rajesh Sekhar", agency: "Rajesh Estates", phone: "+91 99122 33445", docsCount: 4, time: "2 hours ago" },
    { name: "Kiran Goud", agency: "Kiran & Co Realty", phone: "+91 98450 12345", docsCount: 3, time: "4 hours ago" }
  ];

  const recentAgreements = [
    { broker: "Sreenivas Rao", builder: "Prestige Group", date: "Today", status: "Signed & Active" },
    { broker: "Neha Singh", builder: "Godrej Properties", date: "Yesterday", status: "Signed & Active" }
  ];

  return (
    <div className="space-y-8 text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Moderation logs, verification approvals, and platform subscription limits.</p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <Link 
            href="/admin/verification" 
            className="glow-button px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-emerald-700/25"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Verifications Queue</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">1,245</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Registered Brokers</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">14</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Paying Builders</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">4</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Verifications Pending</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">142,400</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Messages Logged</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left - Broker registrations checklist */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pending Verification Reviews
              </h3>
              <Link href="/admin/verification" className="text-xs text-emerald-600 font-bold uppercase hover:underline flex items-center">
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {pendingRegistrations.map((broker, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition flex justify-between items-center text-xs font-semibold text-slate-655">
                  <div>
                    <div className="font-extrabold text-slate-900">{broker.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{broker.agency} · {broker.phone}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-700 flex items-center justify-end space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-450" />
                      <span>{broker.time}</span>
                    </div>
                    <div className="text-[9px] text-[#16c47f] mt-1 font-extrabold">
                      {broker.docsCount} Docs Attached
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Recent CP Agreements */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Active Partners</h3>

          <div className="space-y-3">
            {recentAgreements.map((agreement, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-655">
                <div>
                  <div className="font-extrabold text-slate-900">{agreement.broker}</div>
                  <div className="text-slate-500 mt-0.5">Sponsor: {agreement.builder}</div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-[#16c47f] flex items-center space-x-1 justify-end">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Active</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Signed {agreement.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
