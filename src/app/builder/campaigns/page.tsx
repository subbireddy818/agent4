"use client";

import { useState } from "react";
import { 
  Megaphone, Smartphone, HelpCircle, FileText, 
  Plus, Check, Sparkles, Send, AlertTriangle 
} from "lucide-react";
import Link from "next/link";

export default function CampaignBuilder() {
  const [campaignName, setCampaignName] = useState("Skyline Heights Launch");
  const [filters, setFilters] = useState(["Hyderabad West", "Verified Agents"]);
  const [message, setMessage] = useState(
    "Dear Partner,\n\nJoin us for the exclusive launch of Skyline Heights on 30th May at 11:00 AM at Kokapet, Hyderabad.\n\nExciting offers and high commission structures await you!\n\nLimited seats, RSVP now."
  );
  const [attachedFile, setAttachedFile] = useState("Skyline_Heights_Brochure.pdf");
  const [newFilter, setNewFilter] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Audience filters options from schema spec
  const [cityFilter, setCityFilter] = useState("Hyderabad");
  const [verifyFilter, setVerifyFilter] = useState(true);
  const [webinarFilter, setWebinarFilter] = useState(false);

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilter) return;
    setFilters([...filters, newFilter]);
    setNewFilter("");
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleLaunchCampaign = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
      }, 5000);
    }, 2000);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Campaign Studio</h1>
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Broadcast WhatsApp templates to filterable agent categories.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          
          {/* Package Limit Meter */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Package Quota Usage</span>
              <span className="text-slate-800">12 / 15 Campaigns</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: "80%" }}></div>
            </div>
            
            {/* Overage Warning */}
            <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-700 flex items-center space-x-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Overage Alert: Additional broadcasts will be charged at ₹0.50 per msg.</span>
            </div>
          </div>

          <form className="space-y-4 text-xs font-semibold text-slate-400">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="block uppercase tracking-wider text-[10px]">Campaign Name</label>
              <input 
                type="text" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Skyline Heights Launch"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
              />
            </div>

            {/* Audience segment filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="space-y-1.5">
                <label className="uppercase tracking-wider text-[10px] text-slate-400">City Segment</label>
                <select 
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 outline-none focus:border-[#25d366]"
                >
                  <option>Hyderabad</option>
                  <option>Bangalore</option>
                  <option>Chennai</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-6">
                <label className="flex items-center space-x-2 cursor-pointer font-bold">
                  <input 
                    type="checkbox" 
                    checked={verifyFilter} 
                    onChange={(e) => setVerifyFilter(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Verified Agents Only</span>
                </label>
              </div>

              <div className="space-y-1.5 pt-6">
                <label className="flex items-center space-x-2 cursor-pointer font-bold">
                  <input 
                    type="checkbox" 
                    checked={webinarFilter} 
                    onChange={(e) => setWebinarFilter(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Webinar Attendees Only</span>
                </label>
              </div>
            </div>

            {/* Target Audience Filters */}
            <div className="space-y-1.5">
              <label className="block uppercase tracking-wider text-[10px]">Specific Filters</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.map((f, i) => (
                  <span key={i} className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <span>{f}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFilter(i)}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="e.g. Kokapet specialist"
                  value={newFilter}
                  onChange={(e) => setNewFilter(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2 px-3 text-slate-800 outline-none text-xs font-medium transition"
                />
                <button 
                  type="button"
                  onClick={handleAddFilter}
                  className="px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition text-xs font-bold"
                >
                  Add Filter
                </button>
              </div>
            </div>

            {/* Message Body Template */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <label className="uppercase tracking-wider text-[10px]">Message Template Copy</label>
                <span className="text-[10px] text-[#16c47f] font-bold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Helper (Hinglish)</span>
                </span>
              </div>
              <textarea 
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your campaign details..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
              />
            </div>

            {/* Attachment */}
            <div className="space-y-1.5">
              <label className="block uppercase tracking-wider text-[10px]">Attached Project Brochure</label>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-700">
                  <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span className="text-xs font-bold">{attachedFile}</span>
                </div>

                <button 
                  type="button" 
                  onClick={() => setAttachedFile(attachedFile ? "" : "Skyline_Heights_Brochure.pdf")}
                  className="text-[10px] hover:text-[#16c47f] font-bold"
                >
                  {attachedFile ? "Remove" : "Attach File"}
                </button>
              </div>
            </div>

            {/* Success Notification Banner */}
            {sentSuccess && (
              <div className="p-4 bg-brand-green/10 border border-[#25d366]/30 rounded-xl text-[#16c47f] text-xs flex items-center space-x-2 animate-bounce">
                <Check className="w-4 h-4" />
                <span>Campaign "{campaignName}" launched successfully to agents!</span>
              </div>
            )}

            {/* Actions & Reach Estimator */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Estimated Reach</div>
                <div className="text-sm font-extrabold text-slate-900">2,450 CP Agents</div>
              </div>

              <div className="flex gap-2 text-sm font-bold">
                <Link href="/builder/dashboard" className="px-4 py-2.5 bg-transparent text-slate-500 hover:text-slate-800 rounded-xl transition flex items-center">
                  Cancel
                </Link>
                <button 
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={sending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2"
                >
                  {sending ? "Sending..." : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Launch Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Phone Mockup Panel */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[300px] h-[580px] rounded-[40px] border-[6px] border-slate-800 bg-[#07090e] shadow-2xl overflow-hidden relative flex flex-col shrink-0">
            {/* Phone Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-850 rounded-b-xl z-20"></div>

            {/* Header */}
            <div className="bg-[#075e54] pt-7 pb-2.5 px-4 flex items-center space-x-2 text-white shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#128c7e] flex items-center justify-center font-bold text-xs">
                🏢
              </div>
              <div>
                <div className="font-bold text-[10px]">Prestige Developer</div>
                <div className="text-[7px] text-[#4ade80]">Official Broadcast Channel</div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 overflow-y-auto bg-[#efeae2] text-[10px] space-y-3">
              <div className="flex flex-col items-start">
                <div className="max-w-[90%] rounded-xl p-2.5 bg-white text-slate-800 rounded-tl-none shadow-sm space-y-2">
                  
                  {/* Rich file attachment */}
                  {attachedFile && (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[120px] font-bold">{attachedFile}</span>
                      </div>
                      <span className="shrink-0 text-slate-400 text-[8px]">PDF</span>
                    </div>
                  )}

                  {/* Message body */}
                  <div className="whitespace-pre-line leading-relaxed">
                    {message || "Drafting message preview..."}
                  </div>

                  {/* Template replies */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                    <button type="button" className="w-full py-1.5 text-center font-bold text-[9px] text-brand-green-hover bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition">
                      RSVP Now
                    </button>
                    <button type="button" className="w-full py-1.5 text-center font-bold text-[9px] text-brand-green-hover bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition">
                      View Details
                    </button>
                  </div>
                </div>
                <span className="text-[8px] text-slate-400 mt-1 px-1 font-semibold">19:25</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-2 bg-[#f0f2f5] text-[8px] text-center text-slate-500 shrink-0 border-t border-slate-200">
              ⚡ GallaBox WhatsApp API Template Preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
