"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Template, LandingPage, RecipientList } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Send, Save, TestTube } from "lucide-react";

interface CampaignFormProps {
  templates: Template[];
  landingPages: LandingPage[];
  recipientLists: (RecipientList & { recipientCount?: number })[];
}

export function CampaignForm({
  templates,
  landingPages,
  recipientLists,
}: CampaignFormProps) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [landingPageId, setLandingPageId] = useState("");
  const [recipientListId, setRecipientListId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedList = recipientLists.find((list) => list.id === recipientListId);

  const handleTestSend = async () => {
    if (!templateId || !landingPageId) {
      setError("Please select a template and landing page first");
      return;
    }

    setTestLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          landing_page_id: landingPageId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send test email");
      }

      setSuccess("Test email sent successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!name || !templateId || !landingPageId || !recipientListId) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          name,
          template_id: templateId,
          landing_page_id: landingPageId,
          recipient_list_id: recipientListId,
          scheduled_at: scheduledAt || null,
          status: "draft",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess("Campaign saved as draft!");
      setTimeout(() => {
        router.push(`/dashboard/campaigns/${data.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!name || !templateId || !landingPageId || !recipientListId) {
      setError("Please fill in all required fields");
      return;
    }

    if (!selectedList?.recipientCount || selectedList.recipientCount === 0) {
      setError("Selected recipient list has no recipients");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      // Create campaign
      const { data: campaign, error: insertError } = await supabase
        .from("campaigns")
        .insert({
          name,
          template_id: templateId,
          landing_page_id: landingPageId,
          recipient_list_id: recipientListId,
          scheduled_at: scheduledAt || null,
          status: scheduledAt ? "scheduled" : "active",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Launch campaign
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to launch campaign");
      }

      setSuccess("Campaign launched successfully!");
      setTimeout(() => {
        router.push(`/dashboard/campaigns/${campaign.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q1 Security Awareness Training"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Email Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="landingPage">Landing Page *</Label>
            <Select value={landingPageId} onValueChange={setLandingPageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a landing page" />
              </SelectTrigger>
              <SelectContent>
                {landingPages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientList">Recipient List *</Label>
            <Select value={recipientListId} onValueChange={setRecipientListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a recipient list" />
              </SelectTrigger>
              <SelectContent>
                {recipientLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({list.recipientCount || 0} recipients)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedList && (
              <p className="text-sm text-muted-foreground">
                This campaign will be sent to {selectedList.recipientCount || 0}{" "}
                recipients
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule Send (Optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty to send immediately when launched
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleTestSend}
            disabled={testLoading || !templateId || !landingPageId}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testLoading ? "Sending..." : "Send Test Email"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Send a test email to your account to preview the campaign
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={
            loading || !name || !templateId || !landingPageId || !recipientListId
          }
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button
          onClick={handleLaunchCampaign}
          disabled={
            loading || !name || !templateId || !landingPageId || !recipientListId
          }
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? "Launching..." : "Launch Campaign"}
        </Button>
      </div>
    </div>
  );
}
