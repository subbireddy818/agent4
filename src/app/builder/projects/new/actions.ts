"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ParsedUnit {
  number: string;
  config: string;
  size: string;
  price: string;
  status: "AVAILABLE" | "HOLD" | "SOLD" | "BLOCKED";
}

export async function saveProjectAction(
  phone: string,
  name: string,
  location: string,
  city: string,
  priceEstimate: string,
  type: string,
  units: ParsedUnit[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.slice(-10);
    const formattedPhone = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;

    // Get builder profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", formattedPhone)
      .single();

    if (!profile) return { ok: false, error: "Builder profile not found" };

    // Insert Project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({
        name,
        location: `${location}, ${city}`,
        price_range: priceEstimate,
        type: type.toLowerCase(),
        developer_id: profile.id,
        details: { city }
      })
      .select("id")
      .single();

    if (projectError || !project) {
        console.error("Project insert error:", projectError);
        return { ok: false, error: projectError?.message || "Failed to create project" };
    }

    // Insert Units
    const unitsToInsert = units.map(u => ({
        project_id: project.id,
        unit_name: u.number,
        status: u.status.toLowerCase(),
        details: { bhk: u.config, area: u.size, price: u.price }
    }));

    if (unitsToInsert.length > 0) {
        const { error: unitsError } = await supabaseAdmin
            .from("inventory_units")
            .insert(unitsToInsert);

        if (unitsError) {
            console.error("Units insert error:", unitsError);
            return { ok: false, error: unitsError.message };
        }
    }

    // Insert an Event so it appears in the Agent "Launches" section
    await supabaseAdmin.from("events").insert({
        id: project.id, // Tie the event directly to the project ID
        title: `New Project: ${name}`,
        date: "Active",
        location: city,
        description: `New ${type} project in ${location} by ${profile.agency_name || 'Builder'}. Starting at ${priceEstimate}.`
    });

    // Notify all agents via WhatsApp
    const { data: agents } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("role", "agent");

    if (agents && agents.length > 0) {
        // Send asynchronously
        Promise.all(agents.map(async (agent) => {
            try {
                // In a real env, use process.env.NEXT_PUBLIC_BASE_URL
                // Since this runs on server, we hardcode the Vercel app path or a relative hint
                const followUrl = `https://agent4.vercel.app/agent/follow?project_id=${project.id}`;
                const text = `🚀 *New Project Launched!*\n\n${name} in ${location} is now live on the platform.\nStarting at ${priceEstimate}.\n\nClick here to follow this project and get updates:\n${followUrl}`;
                
                await fetch(process.env.NEXT_PUBLIC_BASE_URL + "/api/whatsapp/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: agent.phone, text })
                }).catch(e => console.error("Fetch to whatsapp api failed:", e));
            } catch (err) {
                console.error("Error notifying agent:", agent.phone, err);
            }
        })).catch(console.error);
    }

    return { ok: true };
  } catch (err) {
    console.error("Action error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
