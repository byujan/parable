import { createClient } from '@supabase/supabase-js'

// Plain Supabase client that works anywhere (API routes, CLI scripts, etc.)
// Uses the service role key for full access — do NOT expose client-side
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key)
}
