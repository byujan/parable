import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch profile for full name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const userEmail = user.email || ""
  const fullName = profile?.full_name || user.user_metadata?.full_name || null

  return (
    <div className="flex h-screen">
      <Sidebar userEmail={userEmail} />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Topbar userEmail={userEmail} fullName={fullName} />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  )
}
