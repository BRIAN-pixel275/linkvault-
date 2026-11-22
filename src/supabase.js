import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// true only when both env values exist
export const isSupabaseConfigured = Boolean(url && anonKey)

// placeholders stop createClient from throwing when the keys are missing;
// main.jsx should check isSupabaseConfigured before using it
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-key'
)