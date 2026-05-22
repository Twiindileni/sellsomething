import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_KEY. Auth will not work."
  );
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseKey || ""
);
