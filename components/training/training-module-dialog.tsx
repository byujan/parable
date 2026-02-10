"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Template, TrainingModule } from "@/lib/types";
import { Sparkles, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TrainingModuleDialogProps {
  children: React.ReactNode;
  trainingModule?: TrainingModule;
  templates: Template[];
}

export function TrainingModuleDialog({
  children,
  trainingModule,
  templates,
}: TrainingModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(trainingModule?.name || "");
  const [contentHtml, setContentHtml] = useState(
    trainingModule?.content_html || ""
  );
  const [linkedTemplateId, setLinkedTemplateId] = useState(
    trainingModule?.linked_template_id || ""
  );
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerateWithAi = async () => {
    if (!linkedTemplateId) {
      setError("Please select a template first");
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: linkedTemplateId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate training content");
      }

      const data = await response.json();
      setContentHtml(data.content);

      // Auto-set name if empty
      if (!name) {
        const template = templates.find((t) => t.id === linkedTemplateId);
        if (template) {
          setName(`Training: ${template.name}`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !contentHtml) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (trainingModule) {
        const { error: updateError } = await supabase
          .from("training_modules")
          .update({
            name,
            content_html: contentHtml,
            linked_template_id: linkedTemplateId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", trainingModule.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("training_modules")
          .insert({
            name,
            content_html: contentHtml,
            linked_template_id: linkedTemplateId || null,
          });

        if (insertError) throw insertError;
      }

      setOpen(false);
      router.refresh();

      // Reset form
      if (!trainingModule) {
        setName("");
        setContentHtml("");
        setLinkedTemplateId("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trainingModule ? "Edit Training Module" : "New Training Module"}
          </DialogTitle>
          <DialogDescription>
            Create educational content to help recipients learn about phishing
            threats
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Module Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., How to Spot Phishing Emails"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedTemplate">Linked Template (Optional)</Label>
            <Select
              value={linkedTemplateId}
              onValueChange={setLinkedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template to link" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link this module to a specific phishing template
            </p>
          </div>

          {linkedTemplateId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateWithAi}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          )}

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="space-y-2">
              <Label htmlFor="content">Training Content (HTML) *</Label>
              <Textarea
                id="content"
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="Enter HTML content for the training module..."
                className="font-mono text-sm min-h-[400px]"
              />
              <p className="text-xs text-muted-foreground">
                Use HTML to create rich, interactive training content
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded-lg p-6 min-h-[400px] bg-white">
                {contentHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                ) : (
                  <p className="text-muted-foreground text-center py-20">
                    No content to preview. Add HTML content in the Edit tab.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !name || !contentHtml}>
            {loading ? "Saving..." : "Save Training Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
