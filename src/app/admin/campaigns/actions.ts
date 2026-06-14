"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getCampaignsAction() {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from("campaigns")
      .select("*, builder:profiles!builder_id(name, agency_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { ok: true, campaigns: campaigns || [] };
  } catch (err: any) {
    console.error("Error in getCampaignsAction:", err);
    return { ok: false, error: err.message };
  }
}

export async function getCampaignDetailsAction(campaignName: string, createdAt: string) {
  try {
    // 1. Fetch all approved agents
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, phone, agency_name, location")
      .eq("role", "agent")
      .eq("status", "approved")
      .order("name", { ascending: true });

    if (agentsError) throw agentsError;

    // 2. Fetch outbound whatsapp messages related to this campaign
    // Builder broadcast messages start with exactly "*Campaign Name*"
    const searchPattern = `*${campaignName}*`;
    
    // Fetch messages sent around the time the campaign was created
    // We add a 24-hour buffer to be safe, though they are usually sent immediately
    const startDate = new Date(new Date(createdAt).getTime() - 1000 * 60 * 60).toISOString();
    const endDate = new Date(new Date(createdAt).getTime() + 1000 * 60 * 60 * 24).toISOString();

    const { data: messages, error: msgsError } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, phone, agent_id, outbound_status, created_at, content")
      .eq("direction", "outbound")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (msgsError) throw msgsError;

    // Filter messages in memory because ILIKE or specific text matching might be tricky with standard supabase client
    const campaignMessages = (messages || []).filter((msg) => 
      msg.content && msg.content.includes(searchPattern)
    );

    const sentPhones = new Set(campaignMessages.map((msg) => {
      // Normalize the phone number format from the messages log to match the profile phone
      // The profile phone might be "+91 99999 99999" or "9999999999"
      // So we'll just extract the digits for comparison
      return (msg.phone || "").replace(/\D/g, "");
    }));
    
    const sentAgentIds = new Set(campaignMessages.filter(msg => msg.agent_id).map(msg => msg.agent_id));

    // 3. Map status to each agent
    const mappedAgents = (agents || []).map((agent) => {
      const agentPhoneDigits = (agent.phone || "").replace(/\D/g, "");
      const isSent = sentAgentIds.has(agent.id) || (agentPhoneDigits && sentPhones.has(agentPhoneDigits));
      
      return {
        ...agent,
        status: isSent ? "Sent" : "Didn't send"
      };
    });

    return { ok: true, agents: mappedAgents };
  } catch (err: any) {
    console.error("Error in getCampaignDetailsAction:", err);
    return { ok: false, error: err.message };
  }
}
