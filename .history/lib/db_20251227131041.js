import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a lazy-initialized Supabase client
let _supabase = null;

export function getSupabaseClient() {
  if (!_supabase) {
    // Prefer service role key on server; fall back to anon key if available.
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    if (!supabaseUrl || !keyToUse) {
      console.error("Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey,
      });
      throw new Error("Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and at least one of SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }

    _supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabase;
}

// Export supabase as a getter for backward compatibility
export const supabase = {
  from: (table) => getSupabaseClient().from(table),
  rpc: (fn, params) => getSupabaseClient().rpc(fn, params),
  auth: getSupabaseClient()?.auth,
};

// Helper function for backward compatibility with existing code
// This allows gradual migration from MySQL to Supabase
export async function getConnection() {
  return {
    execute: async (query, params) => {
      // This is a compatibility layer - for new code, use supabase directly
      console.warn("Using legacy getConnection() - consider migrating to Supabase client directly");
      throw new Error("Please migrate to Supabase client. Use 'import { supabase } from \"@/lib/db\"' instead.");
    },
    end: async () => {
      // No-op for Supabase
    },
  };
}
