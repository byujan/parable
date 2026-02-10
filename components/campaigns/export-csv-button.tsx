"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Papa from "papaparse";

interface ExportCsvButtonProps {
  campaignId: string;
  campaignName: string;
}

export function ExportCsvButton({
  campaignId,
  campaignName,
}: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Fetch campaign with recipient list
      const { data: campaign } = await supabase
        .from("campaigns")
        .select(
          `
          *,
          recipient_list:recipient_lists (
            recipients (*)
          )
        `
        )
        .eq("id", campaignId)
        .single();

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Fetch all events
      const { data: events } = await supabase
        .from("campaign_events")
        .select("*")
        .eq("campaign_id", campaignId);

      // Build events map by recipient
      const eventsByRecipient = new Map<
        string,
        {
          sent: boolean;
          opened: boolean;
          clicked: boolean;
          submitted: boolean;
          reported: boolean;
          training_completed: boolean;
        }
      >();

      events?.forEach((event) => {
        if (!eventsByRecipient.has(event.recipient_id)) {
          eventsByRecipient.set(event.recipient_id, {
            sent: false,
            opened: false,
            clicked: false,
            submitted: false,
            reported: false,
            training_completed: false,
          });
        }
        const recipientEvents = eventsByRecipient.get(event.recipient_id)!;
        recipientEvents[event.event_type as keyof typeof recipientEvents] = true;
      });

      // Build CSV data
      const recipients = campaign.recipient_list?.recipients || [];
      const csvData = recipients.map((recipient: any) => {
        const events = eventsByRecipient.get(recipient.id) || {
          sent: false,
          opened: false,
          clicked: false,
          submitted: false,
          reported: false,
          training_completed: false,
        };

        return {
          email: recipient.email,
          first_name: recipient.first_name || "",
          last_name: recipient.last_name || "",
          department: recipient.department || "",
          sent: events.sent ? "Yes" : "No",
          opened: events.opened ? "Yes" : "No",
          clicked: events.clicked ? "Yes" : "No",
          submitted: events.submitted ? "Yes" : "No",
          reported: events.reported ? "Yes" : "No",
          training_completed: events.training_completed ? "Yes" : "No",
        };
      });

      // Generate CSV
      const csv = Papa.unparse(csvData);

      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split("T")[0];
      const filename = `${campaignName.replace(/[^a-z0-9]/gi, "_")}_results_${date}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="h-4 w-4 mr-2" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
