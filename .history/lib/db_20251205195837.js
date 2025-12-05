import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a Supabase client with the service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
