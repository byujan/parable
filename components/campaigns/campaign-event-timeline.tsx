"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Terminal } from "lucide-react"

interface LogEntry {
  id: number
  level: string
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface EventTimelineProps {
  campaignId: string
  isActive: boolean
}

const levelStyles: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warn: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-800 border-red-200",
  debug: "bg-gray-100 text-gray-600 border-gray-200",
}

export function CampaignEventTimeline({ campaignId, isActive }: EventTimelineProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/logs?limit=100`)
        if (res.ok) {
          const data = await res.json()
          setLogs(data.logs.reverse())
        }
      } catch {
        // Ignore fetch errors
      }
    }

    fetchLogs()

    if (isActive) {
      const interval = setInterval(fetchLogs, 3_000)
      return () => clearInterval(interval)
    }
  }, [campaignId, isActive])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs.length])

  if (logs.length === 0 && !isActive) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Agent Activity Log</CardTitle>
          {isActive && (
            <Badge variant="outline" className="ml-auto animate-pulse text-xs border-blue-300 text-blue-600">
              Live
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="max-h-96 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-2"
        >
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isActive ? "Waiting for agent activity..." : "No logs available."}
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 py-1.5 px-2 rounded hover:bg-muted/50"
              >
                <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 font-mono">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[11px] px-1.5 py-0 font-medium shrink-0 ${levelStyles[log.level] || ""}`}
                >
                  {log.level}
                </Badge>
                <span className="text-sm break-all leading-relaxed">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
