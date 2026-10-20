import { createClient } from "@supabase/supabase-js";

// Publishable key is safe for browser use; data is protected by RLS.
export const SUPABASE_URL = "https://qlsiwxphwfxjbarfwyhu.supabase.co";
const KEY = "sb_publishable_yRg0jkFxaUu81sxOh4g8EA_rmYUCIry";

export const supabase = createClient(SUPABASE_URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
