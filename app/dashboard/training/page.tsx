import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrainingModuleDialog } from "@/components/training/training-module-dialog";
import { GraduationCap } from "lucide-react";

export default async function TrainingPage() {
  const supabase = await createClient();

  const [{ data: trainingModules }, { data: templates }] = await Promise.all([
    supabase
      .from("training_modules")
      .select(
        `
        *,
        template:email_templates (name)
      `
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Training Modules</h1>
        <p className="text-muted-foreground mt-2">
          Manage micro-training content shown to recipients after phishing
          simulation failures
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <TrainingModuleDialog templates={templates || []}>
          <Button variant="outline">Generate from Template</Button>
        </TrainingModuleDialog>
        <TrainingModuleDialog templates={templates || []}>
          <Button>New Module</Button>
        </TrainingModuleDialog>
      </div>

      {!trainingModules || trainingModules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No training modules yet
          </h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Create training content to educate recipients after they fall for
            phishing simulations
          </p>
          <TrainingModuleDialog templates={templates || []}>
            <Button>Create Training Module</Button>
          </TrainingModuleDialog>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Linked Template</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingModules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-medium">{module.name}</TableCell>
                  <TableCell>
                    {module.template?.name || "Not linked"}
                  </TableCell>
                  <TableCell>
                    {new Date(module.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <TrainingModuleDialog
                      trainingModule={module}
                      templates={templates || []}
                    >
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TrainingModuleDialog>
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
