import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Target } from "lucide-react";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      template:email_templates (name),
      landing_page:landing_pages (name),
      recipient_list:recipient_lists (name)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching campaigns:", error);
  }

  // Get event counts for each campaign
  const campaignsWithStats = await Promise.all(
    (campaigns || []).map(async (campaign) => {
      const { data: events } = await supabase
        .from("campaign_events")
        .select("event_type")
        .eq("campaign_id", campaign.id);

      const eventCounts = {
        sent: events?.filter((e) => e.event_type === "sent").length || 0,
        opened: events?.filter((e) => e.event_type === "opened").length || 0,
        clicked: events?.filter((e) => e.event_type === "clicked").length || 0,
      };

      return {
        ...campaign,
        stats: eventCounts,
      };
    })
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "secondary",
      scheduled: "outline",
      active: "default",
      completed: "default",
    };

    const colors: Record<string, string> = {
      completed: "bg-green-500 hover:bg-green-600 text-white",
    };

    return (
      <Badge
        variant={variants[status] || "secondary"}
        className={status === "completed" ? colors[status] : ""}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage phishing simulation campaigns
        </p>
      </div>

      <div className="flex justify-end">
        <Link href="/dashboard/campaigns/new">
          <Button>New Campaign</Button>
        </Link>
      </div>

      {!campaignsWithStats || campaignsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Create your first phishing simulation campaign to get started
          </p>
          <Link href="/dashboard/campaigns/new">
            <Button>Create Campaign</Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Sent</TableHead>
                <TableHead className="text-center">Opened</TableHead>
                <TableHead className="text-center">Clicked</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignsWithStats.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="font-medium hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {campaign.template?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-center">
                    {campaign.stats.sent}
                  </TableCell>
                  <TableCell className="text-center">
                    {campaign.stats.opened}
                  </TableCell>
                  <TableCell className="text-center">
                    {campaign.stats.clicked}
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
