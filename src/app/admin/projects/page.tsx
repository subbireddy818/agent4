"use client";

import { useState, useEffect } from "react";
import { Building2, Loader2, MapPin, Users, Crown, Clock, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProjectWithDetails {
  id: string;
  name: string;
  location: string;
  city: string;
  price_range: string;
  type: string;
  created_at: string;
  developer_id: string;
  developer_name: string;
  developer_role: string;
  developer_phone: string;
  shares: { builder_name: string; builder_phone: string; builder_company: string; status: string; shared_at: string }[];
}

export default function AdminProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<"all" | "builder" | "super_builder">("all");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      // Fetch all projects with developer info
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*, profiles!projects_developer_id_fkey(name, role, phone)")
        .order("created_at", { ascending: false });

      // Fetch all project shares
      const { data: sharesData } = await supabase
        .from("project_shares")
        .select("*, profiles!project_shares_builder_id_fkey(name, phone, agency_name)")
        .order("created_at", { ascending: false });

      const sharesMap = new Map<string, any[]>();
      if (sharesData) {
        for (const share of sharesData) {
          const existing = sharesMap.get(share.project_id) || [];
          existing.push({
            builder_name: share.profiles?.name || "Unknown",
            builder_phone: share.profiles?.phone || "",
            builder_company: share.profiles?.agency_name || "",
            status: share.status,
            shared_at: share.created_at,
          });
          sharesMap.set(share.project_id, existing);
        }
      }

      if (projectsData) {
        const mapped: ProjectWithDetails[] = projectsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          location: p.location || "",
          city: p.city || "",
          price_range: p.price_range || "",
          type: p.type || "Residential",
          created_at: p.created_at,
          developer_id: p.developer_id,
          developer_name: p.profiles?.name || "Unknown",
          developer_role: p.profiles?.role || "builder",
          developer_phone: p.profiles?.phone || "",
          shares: sharesMap.get(p.id) || [],
        }));
        setProjects(mapped);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.developer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === "all" || p.developer_role === filterRole;

    return matchesSearch && matchesRole;
  });

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">All Projects</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">
          Full visibility — who created each project, which builders joined, and share status.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{projects.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Projects</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{projects.filter((p) => p.developer_role === "builder").length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By Builders</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{projects.filter((p) => p.developer_role === "super_builder").length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By Super Builders</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{projects.reduce((acc, p) => acc + p.shares.filter((s) => s.status === "active").length, 0)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Shares</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search project name, developer, or location..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          {(["all", "builder", "super_builder"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                filterRole === role ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
              }`}
            >
              {role === "all" ? "All" : role === "builder" ? "Builders" : "Super Builders"}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500">No projects match your filters.</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Project Header */}
              <div
                className="p-5 cursor-pointer hover:bg-slate-50/50 transition"
                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{project.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        project.developer_role === "super_builder"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-indigo-50 text-indigo-600"
                      }`}>
                        {project.developer_role === "super_builder" ? "Super Builder" : "Builder"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{project.location || project.city || "—"}</span>
                      </span>
                      {project.price_range && <span className="font-bold text-emerald-600">{project.price_range}</span>}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>Created by:</span>
                      <span className="font-bold text-slate-800 flex items-center space-x-1">
                        {project.developer_role === "super_builder" && <Crown className="w-3 h-3 text-purple-500" />}
                        <span>{project.developer_name}</span>
                      </span>
                      <span className="text-slate-400">({project.developer_phone})</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center space-x-3">
                    <div>
                      <div className="flex items-center space-x-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        <span className="font-bold">{project.shares.filter((s) => s.status === "active").length}</span>
                        <span>builders</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(project.created_at)}</p>
                    </div>
                    {expandedProject === project.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail: Builders who joined */}
              {expandedProject === project.id && (
                <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                  {project.shares.length === 0 ? (
                    <p className="text-xs text-slate-400">No builders have been shared this project yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Builders with Access ({project.shares.length})
                      </h4>
                      {project.shares.map((share, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{share.builder_name}</p>
                            <p className="text-[10px] text-slate-500">
                              {share.builder_company ? `${share.builder_company} · ` : ""}{share.builder_phone}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              share.status === "active"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-600"
                            }`}>
                              {share.status}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                              {formatDate(share.shared_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
