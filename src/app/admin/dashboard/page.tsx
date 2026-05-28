"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, Users, Building, MessageSquare, 
  Clock, CheckCircle2, ChevronRight, Loader2,
  UserCheck, Briefcase, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  name: string;
  agency_name: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  requirement: string;
  location: string;
  budget: string;
  created_at: string;
  agent_id: string;
  agent_name?: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [builders, setBuilders] = useState<Profile[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<Profile[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profiles) {
        setAgents(profiles.filter((p: Profile) => p.role === "agent"));
        setBuilders(profiles.filter((p: Profile) => p.role === "builder"));
        setPendingProfiles(profiles.filter((p: Profile) => p.status === "pending"));
      }

      // Fetch all leads with agent info
      const { data: leadsData } = await supabase
        .from("leads")
        .select("*, profiles!leads_agent_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (leadsData) {
        const mappedLeads = leadsData.map((l: any) => ({
          ...l,
          agent_name: l.profiles?.name || "Unknown Agent",
        }));
        setLeads(mappedLeads);
      }

      // Fetch message count
      const { count } = await supabase
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true });

      setTotalMessages(count || 0);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-8 text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Live platform data from Supabase — agents, leads, and verifications.</p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link 
            href="/admin/verification" 
            className="glow-button px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-emerald-700/25"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Verifications Queue</span>
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Loading platform data...</span>
        </div>
      )}

      {/* Metrics Row — LIVE from Supabase */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{agents.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Registered Agents</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{builders.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Builders</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{leads.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Total Leads</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{pendingProfiles.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Pending Verification</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left — All Leads (from all agents) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              All Platform Leads ({leads.length})
            </h3>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {leads.length === 0 && !loading && (
              <div className="text-center text-slate-400 text-xs py-8">No leads in the database yet.</div>
            )}
            {leads.slice(0, 20).map((lead) => (
              <div key={lead.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition text-xs font-semibold">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-slate-900">{lead.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {lead.phone} · {lead.location || "N/A"} · {lead.requirement || "N/A"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Agent: <span className="text-slate-600 font-bold">{lead.agent_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      lead.status === "new" ? "bg-slate-100 text-slate-600" :
                      lead.status === "interested" ? "bg-indigo-50 text-indigo-600" :
                      lead.status === "site_visit" ? "bg-purple-50 text-purple-600" :
                      lead.status === "negotiation" ? "bg-amber-50 text-amber-600" :
                      lead.status === "closed" ? "bg-emerald-50 text-emerald-600" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {lead.status?.toUpperCase()}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-1">{timeAgo(lead.created_at)}</div>
                  </div>
                </div>
                {lead.budget && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    Budget: <span className="font-bold text-slate-700">{lead.budget}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Registered Agents */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Registered Agents ({agents.length})
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {agents.length === 0 && !loading && (
              <div className="text-center text-slate-400 text-xs py-8">No agents registered yet.</div>
            )}
            {agents.map((agent) => (
              <div key={agent.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
                <div>
                  <div className="font-extrabold text-slate-900">{agent.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {agent.agency_name || "Independent"} · {agent.phone}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-extrabold flex items-center space-x-1 justify-end ${
                    agent.status === "approved" ? "text-[#16c47f]" : "text-amber-500"
                  }`}>
                    {agent.status === "approved" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Approved</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Pending</span>
                      </>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{timeAgo(agent.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
