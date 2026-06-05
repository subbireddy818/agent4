"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "@/lib/session";

async function getSuperBuilderId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    const session = await verifySession(token);
    if (!session) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", session.sub)
      .maybeSingle();

    if (profile) return profile.id;

    if (session.phone) {
      const { data: pPhone } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", session.phone)
        .maybeSingle();
      if (pPhone) return pPhone.id;
    }
    return null;
  } catch (err) {
    console.error("Error getting super builder id:", err);
    return null;
  }
}

export async function getSubBuilders() {
  try {
    const superBuilderId = await getSuperBuilderId();
    if (!superBuilderId) return { ok: false, error: "Not authenticated as Super Builder" };

    const { data: builders, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, phone, agency_name, location, created_at")
      .eq("parent_id", superBuilderId)
      .eq("role", "builder")
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, builders: builders || [] };
  } catch (err: any) {
    console.error("Error in getSubBuilders:", err);
    return { ok: false, error: err.message || "Failed to load sub-builders" };
  }
}

export async function createSubBuilder(
  name: string,
  phone: string,
  agencyName: string,
  location: string
) {
  try {
    const superBuilderId = await getSuperBuilderId();
    if (!superBuilderId) return { ok: false, error: "Not authenticated" };

    // Format phone number
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.slice(-10);
    if (last10.length !== 10) {
      return { ok: false, error: "Phone number must have at least 10 digits" };
    }
    const formattedPhone = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;

    // Check if phone number is already registered
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, role, parent_id")
      .eq("phone", formattedPhone)
      .maybeSingle();

    if (existing) {
      if (existing.role !== "builder") {
        return { ok: false, error: "This phone number is registered with a different role and cannot be added as a builder." };
      }
      if (existing.parent_id) {
        return { ok: false, error: "This builder is already managed by another Super Builder." };
      }

      // Check if there is already a pending link request
      const { data: pendingReq } = await supabaseAdmin
        .from("sub_builder_requests")
        .select("id, status")
        .eq("super_builder_id", superBuilderId)
        .eq("builder_phone", formattedPhone)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingReq) {
        return { ok: false, error: "A request to link this builder is already pending admin approval." };
      }

      // Create a new link request
      const { error: reqErr } = await supabaseAdmin
        .from("sub_builder_requests")
        .insert({
          super_builder_id: superBuilderId,
          builder_phone: formattedPhone,
          builder_name: name,
          status: "pending"
        });

      if (reqErr) throw reqErr;
      return { ok: true, requestSubmitted: true };
    }

    // Insert new profile
    const { data: newProfile, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        name,
        phone: formattedPhone,
        agency_name: agencyName,
        location: location || "Hyderabad",
        role: "builder",
        status: "approved", // Automatically approved as they work for the super builder
        parent_id: superBuilderId,
        credits: 0 // Shares parent's credits anyway
      })
      .select()
      .single();

    if (error) throw error;
    return { ok: true, builder: newProfile };
  } catch (err: any) {
    console.error("Error in createSubBuilder:", err);
    return { ok: false, error: err.message || "Failed to create sub-builder" };
  }
}

export async function deleteSubBuilder(builderId: string) {
  try {
    const superBuilderId = await getSuperBuilderId();
    if (!superBuilderId) return { ok: false, error: "Not authenticated" };

    // Confirm that this builder is a sub-builder of this super builder
    const { data: check } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", builderId)
      .eq("parent_id", superBuilderId)
      .maybeSingle();

    if (!check) return { ok: false, error: "Access denied. Builder is not managed by you." };

    // Delete sub-builder profile (which will cascade delete their project shares because of foreign keys)
    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", builderId);

    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error("Error in deleteSubBuilder:", err);
    return { ok: false, error: err.message || "Failed to delete sub-builder" };
  }
}

export async function getAllAgents() {
  try {
    const { data: agents, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, phone, agency_name, location, is_rera_approved, rera_number")
      .eq("role", "agent")
      .eq("status", "approved")
      .order("name", { ascending: true });
    if (error) throw error;
    return { ok: true, agents: agents || [] };
  } catch (err: any) {
    console.error("Error in getAllAgents:", err);
    return { ok: false, error: err.message || "Failed to load agents" };
  }
}

export async function getAssignedAgents(subBuilderId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("sub_builder_agent_assignments")
      .select("agent_id")
      .eq("sub_builder_id", subBuilderId);
    if (error) throw error;
    return { ok: true, agentIds: data ? data.map(d => d.agent_id) : [] };
  } catch (err: any) {
    console.error("Error in getAssignedAgents:", err);
    return { ok: false, error: err.message || "Failed to load assignments" };
  }
}

export async function assignAgentsToSubBuilder(subBuilderId: string, agentIds: string[]) {
  try {
    const superBuilderId = await getSuperBuilderId();
    if (!superBuilderId) return { ok: false, error: "Not authenticated" };

    // Delete existing assignments for this sub-builder
    const { error: delError } = await supabaseAdmin
      .from("sub_builder_agent_assignments")
      .delete()
      .eq("sub_builder_id", subBuilderId);
    
    if (delError) throw delError;

    if (agentIds.length > 0) {
      // Insert new assignments
      const inserts = agentIds.map(agentId => ({
        super_builder_id: superBuilderId,
        sub_builder_id: subBuilderId,
        agent_id: agentId
      }));

      const { error: insError } = await supabaseAdmin
        .from("sub_builder_agent_assignments")
        .insert(inserts);

      if (insError) throw insError;
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Error in assignAgentsToSubBuilder:", err);
    return { ok: false, error: err.message || "Failed to assign agents" };
  }
}

export async function getIndependentBuilders() {
  try {
    const superBuilderId = await getSuperBuilderId();
    if (!superBuilderId) return { ok: false, error: "Not authenticated" };

    const { data: builders, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, phone, agency_name, location")
      .eq("role", "builder")
      .is("parent_id", null)
      .eq("status", "approved")
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, builders: builders || [] };
  } catch (err: any) {
    console.error("Error in getIndependentBuilders:", err);
    return { ok: false, error: err.message || "Failed to load builders" };
  }
}
