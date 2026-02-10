import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignStats } from "@/components/campaigns/campaign-stats";
import { ExportCsvButton } from "@/components/campaigns/export-csv-button";
import { notFound } from "next/navigation";
import { CampaignStats as CampaignStatsType } from "@/lib/types";
import { CheckCircle2, XCircle } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      template:templates (name),
      landing_page:landing_pages (name),
      recipient_list:recipient_lists (
        name,
        recipients (
          id,
          email,
          first_name,
          last_name,
          department
        )
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  // Fetch all campaign events
  const { data: events } = await supabase
    .from("campaign_events")
    .select("*")
    .eq("campaign_id", params.id);

  // Calculate stats
  const eventsByRecipient = new Map<
    string,
    {
      recipient: any;
      sent: boolean;
      opened: boolean;
      clicked: boolean;
      submitted: boolean;
      reported: boolean;
      training_completed: boolean;
    }
  >();

  // Initialize with all recipients
  campaign.recipient_list?.recipients?.forEach((recipient: any) => {
    eventsByRecipient.set(recipient.id, {
      recipient,
      sent: false,
      opened: false,
      clicked: false,
      submitted: false,
      reported: false,
      training_completed: false,
    });
  });

  // Update with events
  events?.forEach((event) => {
    const recipientData = eventsByRecipient.get(event.recipient_id);
    if (recipientData) {
      recipientData[event.event_type as keyof typeof recipientData] = true;
    }
  });

  const stats: CampaignStatsType = {
    total_recipients: campaign.recipient_list?.recipients?.length || 0,
    sent: events?.filter((e) => e.event_type === "sent").length || 0,
    delivered: events?.filter((e) => e.event_type === "delivered").length || 0,
    opened: events?.filter((e) => e.event_type === "opened").length || 0,
    clicked: events?.filter((e) => e.event_type === "clicked").length || 0,
    submitted: events?.filter((e) => e.event_type === "submitted").length || 0,
    reported: events?.filter((e) => e.event_type === "reported").length || 0,
    training_completed:
      events?.filter((e) => e.event_type === "training_completed").length || 0,
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {campaign.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span>{campaign.template?.name}</span>
              <span>•</span>
              <span>
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          {getStatusBadge(campaign.status)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sent > 0
                ? `${((stats.opened / stats.sent) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clicked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clicked}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sent > 0
                ? `${((stats.clicked / stats.sent) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.submitted}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.sent > 0
                ? `${((stats.submitted / stats.sent) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reported</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.reported}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.sent > 0
                ? `${((stats.reported / stats.sent) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Training Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.training_completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.sent > 0
                ? `${((stats.training_completed / stats.sent) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Funnel</CardTitle>
          <CardDescription>
            Visualize how recipients progressed through the campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignStats stats={stats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recipient Results</CardTitle>
              <CardDescription>
                Detailed results for each recipient in this campaign
              </CardDescription>
            </div>
            <ExportCsvButton
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Sent</TableHead>
                  <TableHead className="text-center">Opened</TableHead>
                  <TableHead className="text-center">Clicked</TableHead>
                  <TableHead className="text-center">Submitted</TableHead>
                  <TableHead className="text-center">Reported</TableHead>
                  <TableHead className="text-center">Training</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(eventsByRecipient.values()).map((data) => (
                  <TableRow key={data.recipient.id}>
                    <TableCell className="font-mono text-sm">
                      {data.recipient.email}
                    </TableCell>
                    <TableCell>
                      {[data.recipient.first_name, data.recipient.last_name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </TableCell>
                    <TableCell>{data.recipient.department || "-"}</TableCell>
                    <TableCell className="text-center">
                      {data.sent ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.opened ? (
                        <CheckCircle2 className="h-4 w-4 text-sky-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.clicked ? (
                        <CheckCircle2 className="h-4 w-4 text-amber-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.submitted ? (
                        <CheckCircle2 className="h-4 w-4 text-red-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.reported ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {data.training_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
