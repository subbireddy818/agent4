import { createClient } from "@supabase/supabase-js";

// Server-only admin client — uses service role key to bypass RLS
// NEVER import this in client components (only use in API routes / server actions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cdjuzogayydnenjrnajg.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseServiceKey) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Webhook DB writes will fail RLS.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
