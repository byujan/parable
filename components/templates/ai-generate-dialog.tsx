"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { CampaignContext } from "@/lib/types";

interface GeneratedTemplate {
  subject: string;
  sender_name: string;
  sender_email: string;
  html_body: string;
  text_body: string;
}

interface AIGenerateDialogProps {
  /** When provided, dialog is controlled by parent (no trigger). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When provided, sent to API as campaign_context for campaign-aware generation. */
  campaignContext?: CampaignContext;
}

export function AIGenerateDialog(props: AIGenerateDialogProps = {}) {
  const { open: controlledOpen, onOpenChange: controlledOnOpenChange, campaignContext } = props;
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    category: "credential_harvest",
    difficulty: "medium",
    company_name: "",
    industry: "",
    additional_context: "",
    impersonated_sender: "",
    scenario: "",
    urgency: "medium" as "low" | "medium" | "high",
    target_audience: "",
  });

  const handleGenerate = async () => {
    setLoading(true);
    setGenerated(null);

    try {
      const body: Record<string, unknown> = { ...formData };
      if (campaignContext) {
        body.campaign_context = campaignContext;
      }
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate template");
      }

      if (!data.template) {
        throw new Error("No template returned from AI. Please try again.");
      }

      setGenerated(data.template);
    } catch (error) {
      console.error("Error generating template:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate template. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generated) return;

    setSaving(true);

    try {
      const timestamp = new Date().toLocaleString();
      const templateName = `AI Generated - ${formData.category.replace("_", " ")} - ${timestamp}`;

      const { error } = await supabase.from("templates").insert([
        {
          name: templateName,
          subject: generated.subject,
          sender_name: generated.sender_name,
          sender_email: generated.sender_email,
          category: formData.category,
          difficulty: formData.difficulty,
          html_body: generated.html_body,
          text_body: generated.text_body,
          is_ai_generated: true,
        },
      ]);

      if (error) throw error;

      setOpen(false);
      router.refresh();

      // Reset form
      setFormData({
        category: "credential_harvest",
        difficulty: "medium",
        company_name: "",
        industry: "",
        additional_context: "",
        impersonated_sender: "",
        scenario: "",
        urgency: "medium",
        target_audience: "",
      });
      setGenerated(null);
    } catch (error) {
      console.error("Error saving template:", error);
      alert(
        error instanceof Error
          ? `Failed to save template: ${error.message}`
          : "Failed to save template. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Template with AI</DialogTitle>
          <DialogDescription>
            Describe the phishing scenario so the AI can generate a convincing,
            realistic template. The more detail you provide, the better the result.
          </DialogDescription>
        </DialogHeader>

        {!generated ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credential_harvest">
                      Credential Harvest
                    </SelectItem>
                    <SelectItem value="malware_download">
                      Malware Download
                    </SelectItem>
                    <SelectItem value="data_entry">Data Entry</SelectItem>
                    <SelectItem value="link_click">Link Click</SelectItem>
                    <SelectItem value="attachment">Attachment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="impersonated_sender">Impersonated Sender (Optional)</Label>
              <Select
                value={formData.impersonated_sender || "_none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    impersonated_sender: value === "_none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="impersonated_sender">
                  <SelectValue placeholder="Who is the email pretending to be?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Select —</SelectItem>
                  <SelectItem value="IT Support">IT Support</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Executive / CEO">Executive / CEO</SelectItem>
                  <SelectItem value="External service">External service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scenario">Scenario / Hook (Optional)</Label>
              <Input
                id="scenario"
                value={formData.scenario}
                onChange={(e) =>
                  setFormData({ ...formData, scenario: e.target.value })
                }
                placeholder="e.g. IT asking to verify credentials before account lock"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="urgency">Urgency (Optional)</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    urgency: value as "low" | "medium" | "high",
                  })
                }
              >
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="target_audience">Target Audience (Optional)</Label>
              <Input
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) =>
                  setFormData({ ...formData, target_audience: e.target.value })
                }
                placeholder="e.g. All staff, Finance, New hires"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name (Optional)</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                placeholder="e.g., Acme Corporation"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                placeholder="e.g., Technology, Healthcare, Finance"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="additional_context">
                Additional Context (Optional)
              </Label>
              <Textarea
                id="additional_context"
                value={formData.additional_context}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    additional_context: e.target.value,
                  })
                }
                placeholder="Provide any additional context or specific requirements for the template..."
                rows={4}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{generated.subject}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Sender Name
                  </Label>
                  <p className="font-medium">{generated.sender_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Sender Email
                  </Label>
                  <p className="font-medium">{generated.sender_email}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Email Body Preview
                </Label>
                <div className="mt-2 max-h-64 overflow-y-auto rounded border bg-background p-3">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: generated.html_body }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generated ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Generating..." : "Generate"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setGenerated(null)}
                disabled={saving}
              >
                Regenerate
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
