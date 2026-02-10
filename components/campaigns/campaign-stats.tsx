"use client";

import { CampaignStats as CampaignStatsType } from "@/lib/types";

interface CampaignStatsProps {
  stats: CampaignStatsType;
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  const stages = [
    {
      label: "Sent",
      count: stats.sent,
      color: "bg-blue-500",
      percentage: 100,
    },
    {
      label: "Opened",
      count: stats.opened,
      color: "bg-sky-500",
      percentage: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
    },
    {
      label: "Clicked",
      count: stats.clicked,
      color: "bg-amber-500",
      percentage: stats.sent > 0 ? (stats.clicked / stats.sent) * 100 : 0,
    },
    {
      label: "Submitted",
      count: stats.submitted,
      color: "bg-red-500",
      percentage: stats.sent > 0 ? (stats.submitted / stats.sent) * 100 : 0,
    },
    {
      label: "Reported",
      count: stats.reported,
      color: "bg-green-500",
      percentage: stats.sent > 0 ? (stats.reported / stats.sent) * 100 : 0,
    },
  ];

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={stage.label} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{stage.label}</span>
            <span className="text-muted-foreground">
              {stage.count} ({stage.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-8 bg-muted rounded-lg overflow-hidden">
            <div
              className={`h-full ${stage.color} flex items-center justify-end px-3 text-white font-medium text-sm transition-all duration-500`}
              style={{ width: `${stage.percentage}%` }}
            >
              {stage.percentage > 10 && `${stage.percentage.toFixed(1)}%`}
            </div>
          </div>
        </div>
      ))}

      {stats.training_completed > 0 && (
        <div className="pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Training Completed</span>
              <span className="text-muted-foreground">
                {stats.training_completed} (
                {stats.sent > 0
                  ? ((stats.training_completed / stats.sent) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full bg-green-600 flex items-center justify-end px-3 text-white font-medium text-sm transition-all duration-500"
                style={{
                  width: `${stats.sent > 0 ? (stats.training_completed / stats.sent) * 100 : 0}%`,
                }}
              >
                {stats.sent > 0 &&
                  (stats.training_completed / stats.sent) * 100 > 10 &&
                  `${((stats.training_completed / stats.sent) * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
