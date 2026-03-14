"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pause, Play, Square, CheckCircle } from "lucide-react"

interface CampaignControlsProps {
  campaignId: string
  status: string
}

export function CampaignControls({ campaignId, status }: CampaignControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState(status)
  const router = useRouter()

  async function handleAction(action: "pause" | "resume" | "stop" | "complete") {
    setLoading(action)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentStatus(data.status)
        router.refresh()
      }
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error)
    } finally {
      setLoading(null)
    }
  }

  if (currentStatus !== "active" && currentStatus !== "paused") {
    return null
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "active" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("pause")}
          disabled={loading !== null}
        >
          <Pause className="h-4 w-4 mr-1" />
          {loading === "pause" ? "Pausing..." : "Pause"}
        </Button>
      )}

      {currentStatus === "paused" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction("resume")}
          disabled={loading !== null}
        >
          <Play className="h-4 w-4 mr-1" />
          {loading === "resume" ? "Resuming..." : "Resume"}
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading !== null}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Complete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the campaign as completed and stop the agent.
              You can still view all results and analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("complete")}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {loading === "complete" ? "Completing..." : "Complete Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={loading !== null}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently stop the campaign. The agent will cease all
              activity and no more messages will be sent. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("stop")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading === "stop" ? "Stopping..." : "Stop Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
