import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data: profile } = await supabase.from("profiles").select("id").limit(1).single();
  
  if (!profile) return NextResponse.json({ error: "no profile" });

  const { data, error } = await supabase.from("documents").insert([{
    agent_id: profile.id,
    type: "document",
    url: "https://example.com/simulated-uploads/test.pdf",
    name: "test.pdf",
    send_count: 0,
    view_count: 0
  }]);

  return NextResponse.json({ data, error });
}
