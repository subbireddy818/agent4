"use client";

import { useState, useEffect } from "react";
import { Calendar, Loader2, MapPin, Users, Crown, Clock, Search, X, Building2, Megaphone, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  event_type: string;
  target_audience?: string;
  target_locations?: string[];
  created_at: string;
  source: "builder_campaign" | "super_builder";
  creator_name: string;
  creator_role: string;
  creator_phone: string;
  days_until: number | null;
  rsvp_count: number;
}

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    loadEvents();
  }, []);

  function parseDateToMs(dateStr: string): number | null {
    // Try standard Date parsing
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();

    // Try parsing "30th May 2026, 11:00 AM" style
    const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, "$1");
    const d2 = new Date(cleaned);
    if (!isNaN(d2.getTime())) return d2.getTime();

    return null;
  }

  function getDaysUntil(dateStr: string): number | null {
    const ms = parseDateToMs(dateStr);
    if (!ms) return null;
    const diff = ms - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const allEvents: EventItem[] = [];

      // 1. Get events from general events table (created by builder campaigns)
      const { data: generalEvents } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Get events from super_builder_events table
      const { data: sbEvents } = await supabase
        .from("super_builder_events")
        .select("*, profiles!super_builder_events_created_by_fkey(name, role, phone)")
        .order("created_at", { ascending: false });

      // 3. Get campaigns to map builder info to events
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*, profiles!campaigns_builder_id_fkey(name, role, phone)")
        .order("created_at", { ascending: false });

      // 4. Get RSVP counts per event
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("event_id");

      const rsvpMap = new Map<string, number>();
      if (rsvps) {
        for (const r of rsvps) {
          rsvpMap.set(r.event_id, (rsvpMap.get(r.event_id) || 0) + 1);
        }
      }

      // Map campaign builder info by campaign name → event title
      const campaignCreatorMap = new Map<string, { name: string; role: string; phone: string }>();
      if (campaigns) {
        for (const c of campaigns) {
          campaignCreatorMap.set(c.name, {
            name: c.profiles?.name || "Unknown",
            role: c.profiles?.role || "builder",
            phone: c.profiles?.phone || "",
          });
        }
      }

      // Process general events
      if (generalEvents) {
        for (const e of generalEvents) {
          const creator = campaignCreatorMap.get(e.title);
          allEvents.push({
            id: e.id,
            title: e.title,
            date: e.date,
            location: e.location,
            description: e.description || "",
            event_type: e.event_type || "campaign",
            target_audience: undefined,
            target_locations: e.target_locations || [],
            created_at: e.created_at,
            source: "builder_campaign",
            creator_name: creator?.name || "Builder",
            creator_role: creator?.role || "builder",
            creator_phone: creator?.phone || "",
            days_until: getDaysUntil(e.date),
            rsvp_count: rsvpMap.get(e.id) || 0,
          });
        }
      }

      // Process super builder events
      if (sbEvents) {
        for (const e of sbEvents) {
          allEvents.push({
            id: e.id,
            title: e.title,
            date: e.date,
            location: e.location,
            description: e.description || "",
            event_type: "super_builder_event",
            target_audience: e.target_audience,
            target_locations: e.target_locations || [],
            created_at: e.created_at,
            source: "super_builder",
            creator_name: e.profiles?.name || "Super Builder",
            creator_role: "super_builder",
            creator_phone: e.profiles?.phone || "",
            days_until: getDaysUntil(e.date),
            rsvp_count: 0,
          });
        }
      }

      // Sort by created_at descending
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(allEvents);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === "upcoming") return matchesSearch && e.days_until !== null && e.days_until > 0;
    if (filterType === "past") return matchesSearch && (e.days_until === null || e.days_until <= 0);
    return matchesSearch;
  });

  const upcomingCount = events.filter((e) => e.days_until !== null && e.days_until > 0).length;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
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
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">All Events</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">
          Every event on the platform — who created it, target audience, countdown, and RSVPs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{events.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Events</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-emerald-600">{upcomingCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-slate-900">{events.filter((e) => e.source === "builder_campaign").length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By Builders</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-extrabold text-purple-600">{events.filter((e) => e.source === "super_builder").length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By Super Builders</p>
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
            placeholder="Search event name, creator, or location..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          {(["all", "upcoming", "past"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                filterType === type ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"
              }`}
            >
              {type === "all" ? "All" : type === "upcoming" ? `Upcoming (${upcomingCount})` : "Past"}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500">No events match your filters.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="text-sm font-extrabold text-slate-900">{event.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      event.source === "super_builder"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-indigo-50 text-indigo-600"
                    }`}>
                      {event.source === "super_builder" ? "Super Builder" : "Builder Campaign"}
                    </span>
                    {event.target_audience && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        event.target_audience === "builders" ? "bg-blue-50 text-blue-600" :
                        event.target_audience === "agents" ? "bg-emerald-50 text-emerald-600" :
                        "bg-amber-50 text-amber-600"
                      }`}>
                        {event.target_audience === "both" ? "Builders & Agents" : event.target_audience}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{event.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </span>
                    {event.rsvp_count > 0 && (
                      <span className="flex items-center space-x-1 text-emerald-600 font-bold">
                        <Users className="w-3 h-3" />
                        <span>{event.rsvp_count} RSVPs</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span>Created by:</span>
                    <span className="font-bold text-slate-800 flex items-center space-x-1">
                      {event.creator_role === "super_builder" && <Crown className="w-3 h-3 text-purple-500" />}
                      <span>{event.creator_name}</span>
                    </span>
                    <span className="text-slate-400">({event.creator_phone})</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">{formatDate(event.created_at)}</span>
                  </div>

                  {event.target_locations && event.target_locations.length > 0 && (
                    <div className="flex items-center space-x-1 flex-wrap gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">Locations:</span>
                      {event.target_locations.slice(0, 5).map((loc) => (
                        <span key={loc} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">{loc}</span>
                      ))}
                      {event.target_locations.length > 5 && (
                        <span className="text-[9px] text-slate-400">+{event.target_locations.length - 5} more</span>
                      )}
                    </div>
                  )}

                  {event.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">{event.description}</p>
                  )}
                </div>

                {/* Countdown */}
                <div className="shrink-0 ml-4 text-right">
                  {event.days_until !== null && event.days_until > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                      <div className="flex items-center space-x-1 text-emerald-600">
                        <Timer className="w-3.5 h-3.5" />
                        <span className="text-lg font-extrabold">{event.days_until}</span>
                      </div>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                        day{event.days_until !== 1 ? "s" : ""} left
                      </p>
                    </div>
                  ) : event.days_until !== null && event.days_until === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
                      <p className="text-xs font-extrabold text-amber-600">TODAY</p>
                    </div>
                  ) : event.days_until !== null && event.days_until < 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-slate-400">PAST</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
