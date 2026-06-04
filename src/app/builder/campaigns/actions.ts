"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function launchCampaignAction(
  phone: string,
  name: string,
  audienceSegment: string,
  template: string,
  date: string,
  location: string,
  description: string,
  targetLocations?: string[]
): Promise<{ ok: boolean; error?: string; sentCount?: number }> {
  try {
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.slice(-10);
    const formattedPhone = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;

    // Get builder profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, credits")
      .eq("phone", formattedPhone)
      .single();

    if (!profile) return { ok: false, error: "Builder profile not found" };

    // Build agent query to count targeted agents for validation
    let agentQuery = supabaseAdmin
      .from("profiles")
      .select("phone, name, location")
      .eq("role", "agent")
      .eq("status", "approved");

    // Filter by specific locations if provided
    if (targetLocations && targetLocations.length > 0) {
      agentQuery = agentQuery.in("location", targetLocations);
    }

    const { data: agents, error: agentsError } = await agentQuery;
    if (agentsError) {
      console.error("Error querying targeted agents:", agentsError);
      return { ok: false, error: "Failed to estimate targeted agents" };
    }

    const cost = agents?.length || 0;
    const builderCredits = profile.credits || 0;

    if (builderCredits < cost) {
      return { 
        ok: false, 
        error: `Insufficient credits! Launching this campaign targets ${cost} agents but you only have ${builderCredits} credits.` 
      };
    }

    // Deduct credits
    const { error: deductError } = await supabaseAdmin
      .from("profiles")
      .update({ credits: builderCredits - cost })
      .eq("id", profile.id);

    if (deductError) {
      console.error("Error deducting builder credits:", deductError);
      return { ok: false, error: "Failed to process credit deduction" };
    }

    // 1. Insert into campaigns table with exact sent_count
    const { error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .insert({
        builder_id: profile.id,
        name,
        audience_segment: audienceSegment,
        template,
        sent_count: cost,
        read_rate: 0.0,
      });

    if (campaignError) {
        console.error("Campaign insert error:", campaignError);
        return { ok: false, error: campaignError.message };
    }

    // 2. Insert into events table so it shows up in agent's launches tab
    const { error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        title: name,
        date,
        location,
        description,
        target_locations: targetLocations || [],
      });

    if (eventError) {
        console.error("Event insert error:", eventError);
        return { ok: false, error: eventError.message };
    }

    // 3. Send WhatsApp message to filtered agents based on location
    const apiKey = process.env.GALLABOX_API_KEY;
    const apiSecret = process.env.GALLABOX_API_SECRET;
    const channelId = process.env.GALLABOX_CHANNEL_ID;

    if (apiKey && apiSecret && channelId && agents && agents.length > 0) {
      for (const agent of agents) {
        if (!agent.phone) continue;
        const cleanPhone = agent.phone.replace(/\D/g, "");
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

        await fetch("https://server.gallabox.com/devapi/messages/whatsapp", {
          method: "POST",
          headers: {
            "apiKey": apiKey,
            "apiSecret": apiSecret,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            channelId: channelId,
            channelType: "whatsapp",
            recipient: {
              name: agent.name || "Agent",
              phone: finalPhone
            },
            whatsapp: {
              type: "text",
              text: {
                body: `*${name}*\n\n${description}\n\nDate: ${date}\nLocation: ${location}`
              }
            }
          })
        }).catch(err => console.error("GallaBox send error:", err));
      }
    } else if (!apiKey || !apiSecret || !channelId) {
      console.warn("GallaBox credentials missing, skipping WhatsApp broadcasts.");
    }

    return { ok: true, sentCount: cost };
  } catch (err) {
    console.error("Action error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
