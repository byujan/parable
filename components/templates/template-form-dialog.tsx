"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import type { Template, TemplateCategory, TemplateDifficulty } from "@/lib/types";

interface TemplateFormDialogProps {
  template?: Template;
  onSaved?: () => void;
}

export function TemplateFormDialog({ template, onSaved }: TemplateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState<{
    name: string;
    subject: string;
    sender_name: string;
    sender_email: string;
    category: TemplateCategory;
    difficulty: TemplateDifficulty;
    html_body: string;
    text_body: string;
  }>({
    name: template?.name || "",
    subject: template?.subject || "",
    sender_name: template?.sender_name || "",
    sender_email: template?.sender_email || "",
    category: template?.category || "credential_harvest",
    difficulty: template?.difficulty || "medium",
    html_body: template?.html_body || "",
    text_body: template?.text_body || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (template) {
        // Update existing template
        const { error } = await supabase
          .from("templates")
          .update(formData)
          .eq("id", template.id);

        if (error) throw error;
      } else {
        // Insert new template
        const { error } = await supabase
          .from("templates")
          .insert([{ ...formData, ai_generated: false }]);

        if (error) throw error;
      }

      setOpen(false);
      router.refresh();
      if (onSaved) onSaved();

      // Reset form if creating new
      if (!template) {
        setFormData({
          name: "",
          subject: "",
          sender_name: "",
          sender_email: "",
          category: "credential_harvest",
          difficulty: "medium",
          html_body: "",
          text_body: "",
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={template ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          {template ? "Edit" : "New Template"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            {template
              ? "Update the template details below."
              : "Create a custom phishing simulation template."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Urgent IT Security Alert"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="e.g., Action Required: Verify Your Account"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sender_name">Sender Name</Label>
                <Input
                  id="sender_name"
                  value={formData.sender_name}
                  onChange={(e) =>
                    setFormData({ ...formData, sender_name: e.target.value })
                  }
                  placeholder="e.g., IT Security Team"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sender_email">Sender Email</Label>
                <Input
                  id="sender_email"
                  type="email"
                  value={formData.sender_email}
                  onChange={(e) =>
                    setFormData({ ...formData, sender_email: e.target.value })
                  }
                  placeholder="e.g., security@company.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as TemplateCategory })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credential_harvest">
                      Credential Harvest
                    </SelectItem>
                    <SelectItem value="malware_download">Malware Download</SelectItem>
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
                    setFormData({ ...formData, difficulty: value as TemplateDifficulty })
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
              <Label htmlFor="html_body">HTML Body</Label>
              <Textarea
                id="html_body"
                value={formData.html_body}
                onChange={(e) =>
                  setFormData({ ...formData, html_body: e.target.value })
                }
                placeholder="Enter the HTML content of the email..."
                rows={8}
                className="font-mono text-sm"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="text_body">Text Body (Plain Text)</Label>
              <Textarea
                id="text_body"
                value={formData.text_body}
                onChange={(e) =>
                  setFormData({ ...formData, text_body: e.target.value })
                }
                placeholder="Enter the plain text version of the email..."
                rows={6}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : template ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
