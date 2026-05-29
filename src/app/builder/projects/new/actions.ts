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

    return { ok: true };
  } catch (err) {
    console.error("Action error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
