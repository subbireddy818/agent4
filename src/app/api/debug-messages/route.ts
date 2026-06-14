import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") || "";

  // Show the last 20 messages in the table regardless of phone
  const { data: all, error: allErr } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id, phone, direction, content, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Also query with the specific phone
  let formatted = "";
  let byPhone: any[] = [];
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const last10 = digits.slice(-10);
    formatted = last10.length === 10 ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}` : "invalid";
    const { data } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, phone, direction, content, created_at")
      .eq("phone", formatted)
      .order("created_at", { ascending: false })
      .limit(20);
    byPhone = data || [];
  }

  return NextResponse.json({
    queriedPhone: phone,
    formattedPhone: formatted,
    matchingMessages: byPhone,
    allRecentMessages: all || [],
    error: allErr?.message,
  });
}
