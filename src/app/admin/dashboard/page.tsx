"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldAlert, Users, Building, 
  Clock, CheckCircle2, Loader2,
  Briefcase, RefreshCw, X, ChevronRight, MapPin, Phone
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  name: string;
  agency_name: string;
  phone: string;
  role: string;
  status: string;
  location: string;
  points: number;
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

  // Agent detail view
  const [selectedAgent, setSelectedAgent] = useState<Profile | null>(null);
  const [agentLeads, setAgentLeads] = useState<Lead[]>([]);
  const [loadingAgentLeads, setLoadingAgentLeads] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profiles) {
        setAgents(profiles.filter((p: Profile) => p.role === "agent"));
        setBuilders(profiles.filter((p: Profile) => p.role === "builder"));
        setPendingProfiles(profiles.filter((p: Profile) => p.status === "pending"));
      }

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
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function viewAgentLeads(agent: Profile) {
    setSelectedAgent(agent);
    setLoadingAgentLeads(true);
    try {
      const { data: agentLeadsData } = await supabase
        .from("leads")
        .select("*")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false });

      setAgentLeads(agentLeadsData || []);
    } catch (err) {
      console.error("Error loading agent leads:", err);
    } finally {
      setLoadingAgentLeads(false);
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
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Live platform data — agents, leads, and verifications.</p>
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

      {loading && (
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Loading platform data...</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{agents.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Registered Agents</div>
          </div>
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{builders.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Builders</div>
          </div>
          <Building className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{leads.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Total Leads</div>
          </div>
          <Briefcase className="w-5 h-5 text-blue-500" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{pendingProfiles.length}</div>
            <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">Pending Verification</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-red-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left — All Leads */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            All Platform Leads ({leads.length})
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {leads.length === 0 && !loading && (
              <div className="text-center text-slate-400 text-xs py-8">No leads yet.</div>
            )}
            {leads.map((lead) => (
              <div key={lead.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition text-xs font-semibold">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-extrabold text-slate-900">{lead.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {lead.phone} · {lead.location || "N/A"} · {lead.requirement || "N/A"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Added by: <span className="text-emerald-600 font-bold">{lead.agent_name}</span>
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
                    {lead.budget && <div className="text-[9px] text-slate-500 mt-0.5">{lead.budget}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Agents List (clickable) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Agents ({agents.length}) — Click to view leads
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {agents.length === 0 && !loading && (
              <div className="text-center text-slate-400 text-xs py-8">No agents registered yet.</div>
            )}
            {agents.map((agent) => {
              const agentLeadCount = leads.filter(l => l.agent_id === agent.id).length;
              return (
                <button
                  key={agent.id}
                  onClick={() => viewAgentLeads(agent)}
                  className="w-full text-left p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition text-xs font-semibold group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900">{agent.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {agent.agency_name || "Independent"} · {agent.phone}
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <div>
                        <div className="text-[9px] text-slate-400">Leads</div>
                        <div className="font-extrabold text-slate-900">{agentLeadCount}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Builders Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
          <Building className="w-4 h-4 text-indigo-500" />
          <span>Builders ({builders.length})</span>
        </h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {builders.length === 0 && !loading && (
            <div className="text-center text-slate-400 text-xs py-8">No builders registered yet.</div>
          )}
          {builders.map((builder) => (
            <div key={builder.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition text-xs font-semibold">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-extrabold text-slate-900">{builder.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {builder.agency_name || "Builder"} · {builder.phone}
                  </div>
                  {builder.location && (
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{builder.location}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    builder.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {builder.status === "approved" ? "Approved" : "Pending"}
                  </span>
                  <div className="text-[9px] text-slate-400 mt-1">{timeAgo(builder.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Detail Modal — shows when you click on an agent */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedAgent.name}</h2>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{selectedAgent.phone}</span>
                  </div>
                  <div>{selectedAgent.agency_name || "Independent Agent"}</div>
                  {selectedAgent.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{selectedAgent.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    selectedAgent.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {selectedAgent.status === "approved" ? "Approved" : "Pending"}
                  </span>
                  {selectedAgent.points > 0 && (
                    <span className="text-[9px] font-bold text-indigo-500">{selectedAgent.points} XP</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body — Agent's Leads */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Leads added by {selectedAgent.name} ({agentLeads.length})
              </h3>

              {loadingAgentLeads && (
                <div className="flex items-center space-x-2 text-xs text-slate-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading leads...</span>
                </div>
              )}

              {!loadingAgentLeads && agentLeads.length === 0 && (
                <div className="text-center text-slate-400 text-xs py-8">This agent has not added any leads yet.</div>
              )}

              <div className="space-y-3">
                {agentLeads.map((lead) => (
                  <div key={lead.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-slate-900">{lead.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {lead.phone} · {lead.location || "N/A"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Requirement: {lead.requirement || "N/A"} · Budget: {lead.budget || "N/A"}
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
