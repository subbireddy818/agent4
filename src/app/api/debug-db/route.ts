import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    return NextResponse.json({
      envKeys: Object.keys(process.env)
    });
  } catch (err: any) {
    return NextResponse.json({ exception: err.message, stack: err.stack });
  }
}
