import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { builderPhone, agentIds } = await req.json();

    if (!builderPhone) {
      return NextResponse.json({ success: false, error: "Missing builder phone" });
    }

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json({ success: false, error: "No agents selected" });
    }

    // Lookup builder
    const { data: builder, error: builderErr } = await supabase
      .from("profiles")
      .select("id, name, agency_name")
      .eq("phone", builderPhone)
      .single();

    if (builderErr || !builder) {
      return NextResponse.json({ success: false, error: "Builder not found" });
    }

    // Fetch the specific selected agents
    const { data: agents, error: agentsErr } = await supabase
      .from("profiles")
      .select("id, phone, name")
      .in("id", agentIds);

    if (agentsErr || !agents) {
      return NextResponse.json({ success: false, error: "Failed to fetch agents" });
    }

    if (agents.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Bulk insert invitations in `channel_partners`
    const insertPayload = agents.map(agent => ({
      builder_id: builder.id,
      agent_id: agent.id,
      status: "invited"
    }));

    // We use upsert so we don't fail if they were already invited/connected before
    // though in real life we might want to check existing status first.
    // Assuming status transitions are handled.
    const { error: insertErr } = await supabase
      .from("channel_partners")
      .upsert(insertPayload, { onConflict: "builder_id, agent_id" });

    if (insertErr) {
      console.error("Failed to insert channel partners", insertErr);
    }

    // Send WhatsApp messages (Simulated via webhook endpoint if using sandbox)
    // Or normally we'd hit GallaBox / Meta API here.
    const builderName = builder.agency_name || builder.name || "A Premium Builder";
    
    for (const agent of agents) {
      if (!agent.phone) continue;
      
      const message = `Hi ${agent.name},\n\n*${builderName}* is inviting you to become an official Channel Partner!\n\nReply *Yes* to accept and earn 100 bonus credits, or *No* to decline.`;
      
      // Simulate sending via our local webhook or GallaBox logic
      // In a real app we'd call the Meta Graph API here.
      // We will assume that if we are using the sandbox, they will see it.
      
      // We can insert the outbound message into `whatsapp_messages` directly for the simulator to pick it up.
      await supabase.from("whatsapp_messages").insert([{
        direction: "outbound",
        phone: agent.phone,
        message_type: "text",
        content: message,
        outbound_status: 1
      }]);
    }

    return NextResponse.json({ success: true, count: agents.length });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
