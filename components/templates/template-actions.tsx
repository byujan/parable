"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Edit, Trash2, Sparkles, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { TemplateFormDialog } from "./template-form-dialog";
import type { Template } from "@/lib/types";

interface TemplateActionsProps {
  template: Template;
}

interface VariantTemplate {
  subject: string;
  sender_name: string;
  sender_email: string;
  html_body: string;
  text_body: string;
}

export function TemplateActions({ template }: TemplateActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [savingVariants, setSavingVariants] = useState(false);
  const [variants, setVariants] = useState<VariantTemplate[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template. Please try again.");
    }
  };

  const handleGenerateVariants = async () => {
    setGeneratingVariants(true);
    setVariants([]);

    try {
      const response = await fetch("/api/ai/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: template.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate variants");
      }

      const data = await response.json();
      setVariants(data.variants);
      setVariantsDialogOpen(true);
    } catch (error) {
      console.error("Error generating variants:", error);
      alert("Failed to generate variants. Please try again.");
    } finally {
      setGeneratingVariants(false);
    }
  };

  const handleSaveAllVariants = async () => {
    setSavingVariants(true);

    try {
      const timestamp = new Date().toLocaleString();
      const variantsToInsert = variants.map((variant, index) => ({
        name: `${template.name} - Variant ${index + 1} - ${timestamp}`,
        subject: variant.subject,
        sender_name: variant.sender_name,
        sender_email: variant.sender_email,
        category: template.category,
        difficulty: template.difficulty,
        html_body: variant.html_body,
        text_body: variant.text_body,
        is_ai_generated: true,
      }));

      const { error } = await supabase
        .from("templates")
        .insert(variantsToInsert);

      if (error) throw error;

      setVariantsDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving variants:", error);
      alert("Failed to save variants. Please try again.");
    } finally {
      setSavingVariants(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleGenerateVariants}
            disabled={generatingVariants}
          >
            {generatingVariants ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Variants
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
            <DialogDescription>
              Template preview &mdash;{" "}
              {template.category.replace(/_/g, " ")} &bull;{" "}
              {template.difficulty} difficulty
              {template.is_ai_generated ? " \u00B7 AI generated" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{template.subject}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Sender Name
                  </Label>
                  <p className="font-medium">{template.sender_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Sender Email
                  </Label>
                  <p className="font-mono text-sm">{template.sender_email}</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Email Body (HTML Preview)
              </Label>
              <div className="max-h-80 overflow-y-auto rounded-lg border bg-background p-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: template.html_body }}
                />
              </div>
            </div>

            {template.text_body && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Plain Text Version
                </Label>
                <pre className="max-h-40 overflow-y-auto rounded-lg border bg-muted p-4 text-sm whitespace-pre-wrap font-mono">
                  {template.text_body}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                setEditDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <TemplateFormDialog
              template={template}
              onSaved={() => {
                setEditDialogOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template &ldquo;{template.name}&rdquo;. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variants Dialog */}
      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Variants</DialogTitle>
            <DialogDescription>
              Review the AI-generated variants of &ldquo;{template.name}&rdquo;. You can save
              all variants as separate templates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div
                key={index}
                className="rounded-lg border bg-muted/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Variant {index + 1}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Subject
                  </Label>
                  <p className="font-medium">{variant.subject}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Sender Name
                    </Label>
                    <p className="font-medium">{variant.sender_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Sender Email
                    </Label>
                    <p className="font-medium">{variant.sender_email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Body Preview
                  </Label>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded border bg-background p-3">
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: variant.html_body }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVariantsDialogOpen(false)}
              disabled={savingVariants}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAllVariants} disabled={savingVariants}>
              {savingVariants && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {savingVariants ? "Saving..." : "Save All Variants"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`block text-sm font-medium ${className || ""}`}>
      {children}
    </span>
  );
}
