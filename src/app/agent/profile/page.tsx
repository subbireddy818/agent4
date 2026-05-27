"use client";

import { useState } from "react";
import { 
  User, ShieldCheck, FileCheck, 
  Upload, CheckCircle2, Award 
} from "lucide-react";

export default function AgentProfile() {
  const [profile, setProfile] = useState({
    name: "Sreenivas Rao",
    agency: "Rao Real Estate Services",
    phone: "+91 98765 43210",
    email: "sreenivas@raorealty.in",
    rera: "RERA-HYD-551029",
    status: "Approved",
    cpId: "CP-8402",
    quotaUsage: "12 / 50 Leads",
    quotaPercent: 24
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    setTimeout(() => {
      setSaving(false);
      setMessage("Profile details saved successfully!");
    }, 1200);
  };

  return (
    <div className="max-w-4xl space-y-6 text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Agent Profile</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">Manage your personal credentials, verification status, and CP agreement files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left - Profile details form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <User className="w-4 h-4 text-[#25d366]" />
            <span>Profile Details</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold text-slate-400">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Full Name</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Agency Name</label>
                <input 
                  type="text" 
                  value={profile.agency}
                  onChange={(e) => setProfile({ ...profile, agency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Phone Number</label>
                <input 
                  type="tel" 
                  disabled
                  value={profile.phone}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-450 rounded-xl py-2.5 px-3 outline-none text-sm font-medium cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block uppercase tracking-wider text-[10px]">RERA Registration License</label>
              <input 
                type="text" 
                value={profile.rera}
                onChange={(e) => setProfile({ ...profile, rera: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
              />
            </div>

            {message && (
              <div className="p-3 bg-brand-green/10 border border-brand-green/30 rounded-xl text-brand-green-light text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{message}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold rounded-xl shadow-md transition"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Right - CP Status verification */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CP Status badge */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Verification badge</div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-[#16c47f]">
                <ShieldCheck className="w-10 h-10 shrink-0" />
                <div>
                  <div className="text-base font-bold text-slate-900">CP Status Approved</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Verification active</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Assigned CP ID</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 tracking-wider">{profile.cpId}</div>
                </div>

                <button 
                  onClick={() => alert("Downloading CP agreement PDF file...")}
                  className="px-3 py-1.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold text-[10px] rounded-lg transition flex items-center space-x-1"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Agreement Pass</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quotas limits */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Quotas Consumption</h3>
            
            <div className="space-y-3.5 text-xs font-bold text-slate-500">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span>Lead Pipeline Logs</span>
                  <span className="text-slate-800">{profile.quotaUsage}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: `${profile.quotaPercent}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span>AI Nudges / Matches</span>
                  <span className="text-slate-800">Unlimited (Free Tier)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: "100%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
