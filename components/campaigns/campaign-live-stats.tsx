"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Activity, Mail, MousePointerClick, Eye, ShieldAlert, ShieldCheck, GraduationCap } from "lucide-react"

interface LiveStatsProps {
  campaignId: string
  initialStatus: string
}

interface StatsData {
  sent: number
  opened: number
  clicked: number
  submitted: number
  reported: number
  training_completed: number
}

const statConfig = [
  { key: "sent" as const, label: "Sent", icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "opened" as const, label: "Opened", icon: Eye, color: "text-sky-600", bg: "bg-sky-50" },
  { key: "clicked" as const, label: "Clicked", icon: MousePointerClick, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "submitted" as const, label: "Submitted", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
  { key: "reported" as const, label: "Reported", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
  { key: "training_completed" as const, label: "Training", icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50" },
]

export function CampaignLiveStats({ campaignId, initialStatus }: LiveStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    if (status !== "active" && status !== "paused") return

    const supabase = createBrowserClient()

    async function fetchStats() {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("status")
        .eq("id", campaignId)
        .single()

      if (campaign) {
        setStatus(campaign.status)
      }

      const { data: events } = await supabase
        .from("campaign_events")
        .select("event_type")
        .eq("campaign_id", campaignId)

      if (events) {
        const counts: StatsData = {
          sent: 0,
          opened: 0,
          clicked: 0,
          submitted: 0,
          reported: 0,
          training_completed: 0,
        }
        for (const event of events) {
          const key = event.event_type as keyof StatsData
          if (key in counts) {
            counts[key]++
          }
        }
        setStats(counts)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5_000)
    return () => clearInterval(interval)
  }, [campaignId, status])

  if (!stats || (status !== "active" && status !== "paused")) return null

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base font-semibold">Live Activity</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={
              status === "active"
                ? "animate-pulse border-blue-400 text-blue-700 bg-blue-100"
                : "border-yellow-400 text-yellow-700 bg-yellow-100"
            }
          >
            {status === "active" ? "Running" : "Paused"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {statConfig.map(({ key, label, icon: Icon, color, bg }) => (
            <div key={key} className={`rounded-lg p-3 ${bg}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{stats[key]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
