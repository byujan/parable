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
import { Badge } from "@/components/ui/badge";
import { LandingPageDialog } from "@/components/landing-pages/landing-page-dialog";
import { LandingPageActions } from "@/components/landing-pages/landing-page-actions";
import { FileText } from "lucide-react";

export default async function LandingPagesPage() {
  const supabase = await createClient();

  const { data: landingPages, error } = await supabase
    .from("landing_pages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching landing pages:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landing Pages</h1>
        <p className="text-muted-foreground mt-2">
          Manage simulation landing pages that recipients see when they click phishing links
        </p>
      </div>

      <div className="flex justify-end">
        <LandingPageDialog>
          <Button>New Landing Page</Button>
        </LandingPageDialog>
      </div>

      {!landingPages || landingPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No landing pages yet</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Create your first landing page to use in phishing simulations
          </p>
          <LandingPageDialog>
            <Button>Create Landing Page</Button>
          </LandingPageDialog>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Has Form</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {landingPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.name}</TableCell>
                  <TableCell>
                    {page.has_form ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(page.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <LandingPageActions landingPage={page} />
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
