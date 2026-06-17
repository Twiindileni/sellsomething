import { createClient } from "@supabase/supabase-js";

// Publishable (anon) key — safe to ship in the client; access is enforced by RLS.
// Env vars override these when set (e.g. for a different Supabase project).
const FALLBACK_URL = "https://svyivtqdvfigoopwvaly.supabase.co";
const FALLBACK_KEY = "sb_publishable_hnjN-3hE3wHHkzyUn6xkdw_R2jsFt2U";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || FALLBACK_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true,
    },
  }
);
