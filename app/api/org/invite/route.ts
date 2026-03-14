import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserWithOrg } from "@/lib/supabase/org"

export async function POST(request: NextRequest) {
  try {
    const { user, orgId } = await getUserWithOrg()
    if (!user || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, role, organization_id } = body

    if (!email || !organization_id) {
      return NextResponse.json({ error: "Missing email or organization_id" }, { status: 400 })
    }

    // Verify the user is admin/owner of the target org
    if (organization_id !== orgId) {
      return NextResponse.json({ error: "Cannot invite to another organization" }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single()

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Use admin client to invite user via Supabase Auth
    const adminClient = createAdminClient()
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: orgId,
        invited_role: role || "member",
      },
    })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user_id: inviteData.user.id })
  } catch (error) {
    console.error("[ORG] Invite error:", error)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}
