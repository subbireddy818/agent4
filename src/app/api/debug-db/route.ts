import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const test1 = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "super_builder")
      .limit(1)
      .maybeSingle();

    const superBuilderId = test1.data?.id;

    if (!superBuilderId) {
      return NextResponse.json({ error: "No super builder found in db to test with" });
    }

    const test2 = await supabaseAdmin
      .from("sub_builder_agent_assignments")
      .select("sub_builder_id, agent_id, profiles!sub_builder_agent_assignments_agent_id_fkey(name, phone, agency_name)")
      .eq("super_builder_id", superBuilderId)
      .limit(5);

    const test3 = await supabaseAdmin
      .from("agent_follows_builder")
      .select("builder_id, agent_id, profiles!agent_follows_builder_agent_id_fkey(name, phone, agency_name)")
      .limit(5);

    return NextResponse.json({
      superBuilderId,
      test2: { error: test2.error, data: test2.data },
      test3: { error: test3.error, data: test3.data }
    });
  } catch (err: any) {
    return NextResponse.json({ exception: err.message, stack: err.stack });
  }
}
