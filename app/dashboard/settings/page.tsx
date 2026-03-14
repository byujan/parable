import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrgSettingsForm } from "@/components/settings/org-settings-form"
import { InviteMemberDialog } from "@/components/settings/invite-member-dialog"
import { Building2, Users } from "lucide-react"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Get profile with org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) redirect("/login")

  // Get org details
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single()

  // Get members
  const { data: members } = await supabase
    .from("organization_members")
    .select(`
      *,
      profile:profiles(email, full_name, role)
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true })

  const isOwnerOrAdmin = profile.role === "owner" || profile.role === "admin"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization and team members
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>
            Your organization details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {org && isOwnerOrAdmin ? (
            <OrgSettingsForm org={org} />
          ) : (
            <div className="space-y-2">
              <p className="text-sm"><strong>Name:</strong> {org?.name}</p>
              <p className="text-sm"><strong>Slug:</strong> {org?.slug}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  People who have access to this organization
                </CardDescription>
              </div>
            </div>
            {isOwnerOrAdmin && (
              <InviteMemberDialog organizationId={profile.organization_id} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members || []).map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.profile?.full_name || "-"}
                  </TableCell>
                  <TableCell>{member.profile?.email}</TableCell>
                  <TableCell>
                    <Badge variant={
                      member.role === "owner" ? "default" :
                      member.role === "admin" ? "secondary" : "outline"
                    }>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
