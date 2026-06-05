import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing env vars" });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });

    const spec = await res.json();
    
    // Extract paths and definitions keys
    const paths = Object.keys(spec.paths || {});
    const definitions = Object.keys(spec.definitions || {});

    return NextResponse.json({
      paths,
      definitions
    });
  } catch (err: any) {
    return NextResponse.json({ exception: err.message, stack: err.stack });
  }
}
