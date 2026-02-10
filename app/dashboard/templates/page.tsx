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
import { Sparkles, Plus } from "lucide-react";
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";
import { AIGenerateDialog } from "@/components/templates/ai-generate-dialog";
import { TemplateActions } from "@/components/templates/template-actions";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      credential_harvest: "destructive",
      malware: "destructive",
      urgency: "default",
      curiosity: "secondary",
      authority: "default",
      other: "outline",
    };
    return colors[category] || "outline";
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      easy: "secondary",
      medium: "default",
      hard: "destructive",
    };
    return colors[difficulty] || "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            AI-generated and custom phishing simulation templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TemplateFormDialog />
          <AIGenerateDialog />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Error loading templates: {error.message}
          </p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Create your first template manually or use AI to generate one based on your requirements.
          </p>
          <div className="flex items-center gap-2">
            <TemplateFormDialog />
            <AIGenerateDialog />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>AI Generated</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getCategoryColor(template.category)}>
                      {template.category.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getDifficultyColor(template.difficulty)}>
                      {template.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.ai_generated ? (
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(template.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <TemplateActions template={template} />
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
