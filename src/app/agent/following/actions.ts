"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getFollowedProjects(phone: string) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!profile) return [];

    // Get all accepted invitations for this agent
    const { data: rsvps } = await supabaseAdmin
      .from("event_invitations")
      .select("event_id")
      .eq("agent_id", profile.id)
      .eq("status", "accepted");

    if (!rsvps || rsvps.length === 0) return [];

    const eventIds = rsvps.map(r => r.event_id);

    // Fetch projects whose IDs match the followed events
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("*")
      .in("id", eventIds)
      .order("created_at", { ascending: false });

    return projects || [];
  } catch (err) {
    console.error("Error getting followed projects:", err);
    return [];
  }
}
