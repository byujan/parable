import { createClient } from "./server"

/**
 * Get the current user's organization_id from their profile.
 * Returns null if not authenticated or no org assigned.
 */
export async function getUserOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  return profile?.organization_id ?? null
}

/**
 * Get the current user + their org_id in one call.
 * Used in API routes that need both.
 */
export async function getUserWithOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, orgId: null }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  return { user, orgId: profile?.organization_id ?? null }
}
