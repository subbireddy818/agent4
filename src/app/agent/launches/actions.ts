"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface EventWithInvitation {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string | null;
  event_type: string | null;
  qr_code_data: string | null;
  invitation_status: "pending" | "accepted" | "declined" | null;
  invitation_id: string | null;
}

export async function getAgentEvents(phone: string): Promise<EventWithInvitation[]> {
  // Format phone
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const formattedPhone = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;

  // Get agent profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", formattedPhone)
    .single();

  if (!profile) return [];

  // Get all events
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (!events) return [];

  // Get RSVPs for this agent
  const { data: invitations } = await supabaseAdmin
    .from("rsvps")
    .select("*")
    .eq("agent_id", profile.id);

  const invMap = new Map(
    (invitations || []).map((inv: any) => [inv.event_id, inv])
  );

  return events.map((event: any) => {
    const inv = invMap.get(event.id) as any;
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      description: event.description,
      event_type: event.event_type || "meet",
      qr_code_data: event.qr_code_data || null,
      invitation_status: inv ? "accepted" : null,
      invitation_id: inv?.id || null,
    };
  });
}

export async function respondToInvitation(
  phone: string,
  eventId: string,
  response: "accepted" | "declined"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.slice(-10);
    const formattedPhone = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", formattedPhone)
      .single();

    if (!profile) return { ok: false, error: "Profile not found" };

    let error = null;

    if (response === "accepted") {
      // Upsert into rsvps (ignore if already exists)
      const res = await supabaseAdmin
        .from("rsvps")
        .upsert(
          {
            event_id: eventId,
            agent_id: profile.id,
            qr_code: `EVENT-${eventId.slice(0,8)}-${profile.id.slice(0,8)}`, // Generate dummy QR
          },
          { onConflict: "event_id,agent_id" }
        );
      error = res.error;

      if (!error) {
        // If event is a project launch, also follow the builder
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("developer_id")
          .eq("id", eventId)
          .maybeSingle();

        if (project?.developer_id) {
          await supabaseAdmin
            .from("agent_follows_builder")
            .upsert(
              {
                agent_id: profile.id,
                builder_id: project.developer_id,
              },
              { onConflict: "agent_id,builder_id" }
            );
        }
      }
    } else {
      // If declined, delete the RSVP
      const res = await supabaseAdmin
        .from("rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("agent_id", profile.id);
      error = res.error;

      if (!error) {
        // If event is a project launch, clean up the builder follow
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("developer_id")
          .eq("id", eventId)
          .maybeSingle();

        if (project?.developer_id) {
          // Check if agent is RSVP'd to any other projects by this developer
          const { data: otherRsvps } = await supabaseAdmin
            .from("rsvps")
            .select("event_id")
            .eq("agent_id", profile.id)
            .neq("event_id", eventId);

          let stillFollowingOther = false;
          if (otherRsvps && otherRsvps.length > 0) {
            const projectIds = otherRsvps.map((r: any) => r.event_id);
            const { count } = await supabaseAdmin
              .from("projects")
              .select("id", { count: "exact", head: true })
              .in("id", projectIds)
              .eq("developer_id", project.developer_id);
            if (count && count > 0) {
              stillFollowingOther = true;
            }
          }

          if (!stillFollowingOther) {
            await supabaseAdmin
              .from("agent_follows_builder")
              .delete()
              .eq("agent_id", profile.id)
              .eq("builder_id", project.developer_id);
          }
        }
      }
    }

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
