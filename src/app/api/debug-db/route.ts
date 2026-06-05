import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const tablesToTest = [
      "agent_follows_builder",
      "agent_follow_builder",
      "agent_followers",
      "builder_follows",
      "builder_followers",
      "followers",
      "follows",
      "rsvps",
      "project_shares"
    ];

    const results: Record<string, any> = {};

    for (const table of tablesToTest) {
      const { error, data } = await supabaseAdmin
        .from(table)
        .select("*")
        .limit(1);
      
      if (error) {
        results[table] = { exists: false, error: error.message, code: error.code };
      } else {
        results[table] = { exists: true, count: data.length };
      }
    }

    return NextResponse.json({
      results
    });
  } catch (err: any) {
    return NextResponse.json({ exception: err.message, stack: err.stack });
  }
}
