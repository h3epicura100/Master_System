import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hfvbyktusslocxsblenu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdmJ5a3R1c3Nsb2N4c2JsZW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTkzODUsImV4cCI6MjEwMjc3NTM4NX0.rhg0ALMcw8YoLwVd4YcBqLOt_o8zLUOBR-foLENUYhU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})
