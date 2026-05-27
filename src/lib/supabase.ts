import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cdjuzogayydnenjrnajg.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_build_key";

if (supabaseAnonKey === "placeholder_build_key") {
  console.warn("Supabase Anon Key is missing. Using placeholder key for compile-time build.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
