"use client";

import { useEffect, useState } from "react";
import { 
  Loader2, Users, Trash2, Building2, Search, X, 
  UserMinus, UserPlus, Phone, MapPin, Plus, CheckCircle2 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  getSubBuilders, createSubBuilder, deleteSubBuilder,
  getAllAgents, getAssignedAgents, assignAgentsToSubBuilder 
} from "./actions";

interface SharedBuilder {
  id: string;
  builder_id: string;
  project_id: string;
  status: string;
  created_at: string;
  builder_name: string;
  builder_phone: string;
  builder_company: string;
  project_name: string;
}

interface SubBuilder {
  id: string;
  name: string;
  phone: string;
  agency_name: string;
  location: string;
  created_at: string;
}

export default function ManageBuildersPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"builders" | "assignments">("builders");
  
  // Sub Builders State
  const [subBuilders, setSubBuilders] = useState<SubBuilder[]>([]);
  const [loadingBuilders, setLoadingBuilders] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", agency: "", location: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Assignments/Shares State
  const [shares, setShares] = useState<SharedBuilder[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deletingBuilderId, setDeletingBuilderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Agent Assignment State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBuilder, setAssigningBuilder] = useState<{ id: string; name: string } | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  async function handleOpenAssignModal(builderId: string, builderName: string) {
    setAssigningBuilder({ id: builderId, name: builderName });
    setShowAssignModal(true);
    setLoadingAgents(true);
    setAgentSearch("");
    try {
      const [agentsRes, assignedRes] = await Promise.all([
        getAllAgents(),
        getAssignedAgents(builderId)
      ]);

      if (agentsRes.ok && agentsRes.agents) {
        setAgents(agentsRes.agents);
      }
      if (assignedRes.ok && assignedRes.agentIds) {
        setSelectedAgentIds(assignedRes.agentIds);
      }
    } catch (err) {
      console.error("Error loading assignment data:", err);
    } finally {
      setLoadingAgents(false);
    }
  }

  async function handleSaveAssignments() {
    if (!assigningBuilder) return;
    setSavingAssignments(true);
    try {
      const res = await assignAgentsToSubBuilder(assigningBuilder.id, selectedAgentIds);
      if (res.ok) {
        alert("Agents assigned successfully!");
        setShowAssignModal(false);
        setAssigningBuilder(null);
      } else {
        alert(res.error || "Failed to save assignments.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingAssignments(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadShares(), loadBuilders()]);
    setLoading(false);
  }

  async function loadBuilders() {
    setLoadingBuilders(true);
    try {
      const res = await getSubBuilders();
      if (res.ok && res.builders) {
        setSubBuilders(res.builders as SubBuilder[]);
      }
    } catch (err) {
      console.error("Error loading builders:", err);
    } finally {
      setLoadingBuilders(false);
    }
  }

  async function loadShares() {
    try {
      const meRes = await fetch("/api/me");
      const meData = await meRes.json();
      if (!meData.user) return;

      const { data } = await supabase
        .from("project_shares")
        .select("*, projects(name), profiles!project_shares_builder_id_fkey(name, phone, agency_name)")
        .eq("shared_by", meData.user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        const mapped = data.map((s: any) => ({
          id: s.id,
          builder_id: s.builder_id,
          project_id: s.project_id,
          status: s.status,
          created_at: s.created_at,
          builder_name: s.profiles?.name || "Unnamed",
          builder_phone: s.profiles?.phone || "",
          builder_company: s.profiles?.agency_name || "",
          project_name: s.projects?.name || "Project",
        }));
        setShares(mapped);
      }
    } catch (err) {
      console.error("Error loading shares:", err);
    }
  }

  async function handleRemoveBuilder(shareId: string, builderName: string, projectName: string) {
    if (!window.confirm(`Remove "${builderName}" from "${projectName}"? They will no longer have access to this project.`)) {
      return;
    }

    setRemovingId(shareId);
    try {
      const res = await fetch("/api/super-builder/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_id: shareId }),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
      } else {
        alert(data.error || "Failed to remove builder.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAddBuilderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name || !addForm.phone) {
      setAddError("Name and Phone fields are required.");
      return;
    }

    setAdding(true);
    setAddError("");
    try {
      const res = await createSubBuilder(
        addForm.name,
        addForm.phone,
        addForm.agency,
        addForm.location
      );

      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ name: "", phone: "", agency: "", location: "" });
        if ((res as any).requestSubmitted) {
          alert("Request Submitted! This builder is already registered on the platform. A request to link them under your company has been sent to the Admin for approval.");
        } else {
          await loadBuilders();
          alert("Sub-builder created successfully! They can now log in using their phone number.");
        }
      } else {
        setAddError(res.error || "Failed to create sub-builder.");
      }
    } catch (err: any) {
      setAddError("Network error: " + err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteBuilder(builderId: string, builderName: string) {
    if (!window.confirm(`Are you sure you want to delete sub-builder "${builderName}"? This will revoke all their project assignments and delete their account profile.`)) {
      return;
    }

    setDeletingBuilderId(builderId);
    try {
      const res = await deleteSubBuilder(builderId);
      if (res.ok) {
        setSubBuilders((prev) => prev.filter((b) => b.id !== builderId));
        setShares((prev) => prev.filter((s) => s.builder_id !== builderId));
        alert("Sub-builder deleted successfully.");
      } else {
        alert(res.error || "Failed to delete sub-builder.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDeletingBuilderId(null);
    }
  }

  const filteredBuilders = subBuilders.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      b.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShares = shares.filter(
    (s) =>
      s.builder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.builder_phone.includes(searchQuery) ||
      s.builder_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Manage Builders</h1>
            <p className="text-sm text-slate-500">Create, manage, and assign sub-builders to your projects</p>
          </div>
        </div>
        {activeTab === "builders" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md shadow-purple-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Sub-Builder</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold w-fit">
        <button
          onClick={() => { setActiveTab("builders"); setSearchQuery(""); }}
          className={`px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === "builders" ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          My Sub-Builders ({subBuilders.length})
        </button>
        <button
          onClick={() => { setActiveTab("assignments"); setSearchQuery(""); }}
          className={`px-4 py-2 rounded-lg transition shrink-0 ${
            activeTab === "assignments" ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Project Assignments ({shares.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === "builders"
              ? "Search sub-builders by name, phone, company, or location..."
              : "Search assignments by builder, company, or project name..."
          }
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-purple-500 transition"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* SUB-BUILDERS TAB CONTENT */}
      {activeTab === "builders" && (
        <div>
          {loadingBuilders ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : filteredBuilders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500">
                {subBuilders.length === 0
                  ? "No sub-builders registered under your company yet."
                  : "No sub-builders match your search."}
              </p>
              {subBuilders.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                >
                  Create Your First Sub-Builder Account
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBuilders.map((builder) => (
                <div key={builder.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-55 bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                        {builder.name.charAt(0).toUpperCase()}
                      </div>
                      <button
                        onClick={() => handleDeleteBuilder(builder.id, builder.name)}
                        disabled={deletingBuilderId === builder.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Delete Sub-Builder Profile"
                      >
                        {deletingBuilderId === builder.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm">{builder.name}</h3>
                    <p className="text-xs text-purple-650 font-bold mt-1">{builder.agency_name || "Prestige Sub-Builder"}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{builder.phone}</span>
                    </div>
                    {builder.location && (
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{builder.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenAssignModal(builder.id, builder.name)}
                      className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign Agents</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ASSIGNMENTS TAB CONTENT */}
      {activeTab === "assignments" && (
        <div>
          {filteredShares.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <UserMinus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500">
                {shares.length === 0
                  ? "No projects have been assigned to builders yet."
                  : "No assignments match your search."}
              </p>
              {shares.length === 0 && (
                <a
                  href="/super-builder/projects/share"
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition inline-block"
                >
                  Go to Project Assignments Screen
                </a>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sub-Builder</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assigned Project</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredShares.map((share) => (
                  <div key={share.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-slate-50 transition">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{share.builder_name}</p>
                      <p className="text-xs text-slate-500">{share.builder_phone}</p>
                    </div>
                    <p className="text-sm text-slate-600">{share.builder_company || "—"}</p>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-sm text-slate-700">{share.project_name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveBuilder(share.id, share.builder_name, share.project_name)}
                      disabled={removingId === share.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Remove builder access"
                    >
                      {removingId === share.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Sub-Builder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl relative text-slate-800">
            <button
              onClick={() => {
                setShowAddModal(false);
                setAddForm({ name: "", phone: "", agency: "", location: "" });
                setAddError("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-55 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-purple-650" />
              <span>Create Sub-Builder Account</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter sub-builder details to register them under your organization. They can log in immediately with their phone number without OTP validation.
            </p>

            <form onSubmit={handleAddBuilderSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl py-2.5 px-3 text-slate-850 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. +91 93460 89096"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl py-2.5 px-3 text-slate-850 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Company / Division</label>
                <input
                  type="text"
                  placeholder="e.g. Prestige Block-A Division"
                  value={addForm.agency}
                  onChange={(e) => setAddForm({ ...addForm, agency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl py-2.5 px-3 text-slate-850 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Kokapet, Hyderabad"
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl py-2.5 px-3 text-slate-850 outline-none transition"
                />
              </div>

              {addError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-[10px] text-red-650">
                  {addError}
                </div>
              )}

              <button
                type="submit"
                disabled={adding}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-60 flex items-center justify-center space-x-1.5 shadow-md shadow-purple-600/20"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{adding ? "Creating..." : "Create Account"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Agents Modal */}
      {showAssignModal && assigningBuilder && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Assign Agents to Sub-Builder</h2>
                <p className="text-xs text-slate-500 mt-0.5">Assign specific channel partners/agents to <span className="font-bold text-purple-600">{assigningBuilder.name}</span></p>
              </div>
              <button
                onClick={() => { setShowAssignModal(false); setAssigningBuilder(null); }}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {loadingAgents ? (
              <div className="p-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Search Agent */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents by name, phone, or location..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 transition"
                  />
                  {agentSearch && (
                    <button onClick={() => setAgentSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Agents list */}
                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                  {agents.filter(a => 
                    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                    a.phone.includes(agentSearch) ||
                    (a.location && a.location.toLowerCase().includes(agentSearch.toLowerCase()))
                  ).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">No matching agents found.</p>
                  ) : (
                    agents.filter(a => 
                      a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                      a.phone.includes(agentSearch) ||
                      (a.location && a.location.toLowerCase().includes(agentSearch.toLowerCase()))
                    ).map((agent) => {
                      const isChecked = selectedAgentIds.includes(agent.id);
                      return (
                        <label
                          key={agent.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                            isChecked
                              ? "bg-purple-50/50 border-purple-200 text-purple-900"
                              : "bg-slate-50 border-slate-200 hover:border-slate-350 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedAgentIds(prev =>
                                  prev.includes(agent.id)
                                    ? prev.filter(id => id !== agent.id)
                                    : [...prev, agent.id]
                                );
                              }}
                              className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <p className="font-extrabold text-slate-900">{agent.name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{agent.agency_name || "Independent Agent"} · {agent.phone}</p>
                            </div>
                          </div>
                          {agent.location && (
                            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-bold">
                              {agent.location}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => { setShowAssignModal(false); setAssigningBuilder(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssignments || loadingAgents}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-60 flex items-center space-x-1.5 cursor-pointer"
              >
                {savingAssignments && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Assignments</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
