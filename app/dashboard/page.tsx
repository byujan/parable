import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Users, MousePointerClick, GraduationCap } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const [
    { count: activeCampaigns },
    { count: totalRecipients },
    { data: campaignEvents },
    { count: trainingCompletions },
    { data: recentCampaigns },
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("recipients")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("campaign_events")
      .select("event_type"),
    supabase
      .from("campaign_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "training_completed"),
    supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Calculate average click rate
  const totalEvents = campaignEvents?.length || 0;
  const clickEvents = campaignEvents?.filter((e) => e.event_type === "clicked").length || 0;
  const avgClickRate = totalEvents > 0 ? ((clickEvents / totalEvents) * 100).toFixed(1) : "0.0";

  const stats = [
    {
      title: "Active Campaigns",
      value: activeCampaigns || 0,
      icon: Activity,
      description: "Currently running",
    },
    {
      title: "Total Recipients",
      value: totalRecipients || 0,
      icon: Users,
      description: "In your database",
    },
    {
      title: "Avg Click Rate",
      value: `${avgClickRate}%`,
      icon: MousePointerClick,
      description: "Across all campaigns",
    },
    {
      title: "Training Completions",
      value: trainingCompletions || 0,
      icon: GraduationCap,
      description: "Total completed",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "scheduled":
        return "outline";
      case "completed":
        return "secondary";
      case "draft":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your phishing simulation campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentCampaigns || recentCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Create your first campaign to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {campaign.scheduled_at
                        ? new Date(campaign.scheduled_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
