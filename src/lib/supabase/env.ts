export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** The site works without Supabase (guest-only); auth UI checks this flag. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
