"use client"

import { useState, useEffect } from "react"
import { Bell, Send, AlertTriangle, CheckCircle2, MousePointerClick } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  type: "campaign_launched" | "campaign_completed" | "high_click_rate" | "training_completed"
  title: string
  description: string
  timestamp: string
  read: boolean
  href?: string
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const supabase = createClient()

        // Fetch recent campaign events to derive notifications
        const { data: recentEvents } = await supabase
          .from("campaign_events")
          .select(`
            id,
            event_type,
            created_at,
            campaign_id,
            campaigns:campaign_id (name)
          `)
          .order("created_at", { ascending: false })
          .limit(50)

        // Fetch active/completed campaigns for status-change notifications
        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, name, status, started_at, completed_at")
          .order("created_at", { ascending: false })
          .limit(10)

        const derived: Notification[] = []

        // Campaign status notifications
        campaigns?.forEach((campaign) => {
          if (campaign.status === "active" && campaign.started_at) {
            derived.push({
              id: `launch-${campaign.id}`,
              type: "campaign_launched",
              title: "Campaign Launched",
              description: `"${campaign.name}" is now active and sending emails.`,
              timestamp: campaign.started_at,
              read: false,
              href: `/dashboard/campaigns/${campaign.id}`,
            })
          }
          if (campaign.status === "completed" && campaign.completed_at) {
            derived.push({
              id: `complete-${campaign.id}`,
              type: "campaign_completed",
              title: "Campaign Completed",
              description: `"${campaign.name}" has finished.`,
              timestamp: campaign.completed_at,
              read: false,
              href: `/dashboard/campaigns/${campaign.id}`,
            })
          }
        })

        // Aggregate click events per campaign for high-click-rate alerts
        if (recentEvents && recentEvents.length > 0) {
          const clicksByCampaign = new Map<string, { count: number; name: string }>()
          recentEvents.forEach((event) => {
            if (event.event_type === "clicked") {
              const existing = clicksByCampaign.get(event.campaign_id) || {
                count: 0,
                name: (event.campaigns as any)?.name || "Unknown",
              }
              existing.count++
              clicksByCampaign.set(event.campaign_id, existing)
            }
          })
          clicksByCampaign.forEach((data, campaignId) => {
            if (data.count >= 5) {
              derived.push({
                id: `clicks-${campaignId}`,
                type: "high_click_rate",
                title: "High Click Activity",
                description: `"${data.name}" has ${data.count} clicks in recent activity.`,
                timestamp: new Date().toISOString(),
                read: false,
                href: `/dashboard/campaigns/${campaignId}`,
              })
            }
          })

          // Recent training completions
          const trainingEvents = recentEvents.filter(
            (e) => e.event_type === "training_completed"
          )
          if (trainingEvents.length > 0) {
            derived.push({
              id: `training-batch`,
              type: "training_completed",
              title: "Training Completions",
              description: `${trainingEvents.length} recipient(s) completed training recently.`,
              timestamp: trainingEvents[0].created_at,
              read: false,
            })
          }
        }

        // Sort by timestamp descending
        derived.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )

        setNotifications(derived.slice(0, 8))
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "campaign_launched":
        return <Send className="h-4 w-4 text-blue-500" />
      case "campaign_completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "high_click_rate":
        return <MousePointerClick className="h-4 w-4 text-amber-500" />
      case "training_completed":
        return <AlertTriangle className="h-4 w-4 text-purple-500" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[340px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Notifications appear when campaigns run
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <a
                key={notification.id}
                href={notification.href || "#"}
                className={`
                  flex gap-3 px-3 py-3 hover:bg-accent transition-colors border-b last:border-b-0
                  ${!notification.read ? "bg-accent/30" : ""}
                `}
                onClick={() => {
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === notification.id ? { ...n, read: true } : n
                    )
                  )
                }}
              >
                <div className="mt-0.5 shrink-0">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <Badge
                        variant="default"
                        className="h-1.5 w-1.5 rounded-full p-0 shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatTime(notification.timestamp)}
                  </p>
                </div>
              </a>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
