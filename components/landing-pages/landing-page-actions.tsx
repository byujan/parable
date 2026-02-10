"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { LandingPageDialog } from "./landing-page-dialog";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/lib/types";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";

interface LandingPageActionsProps {
  landingPage: LandingPage;
}

export function LandingPageActions({ landingPage }: LandingPageActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", landingPage.id);

      if (error) throw error;

      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting landing page:", error);
      alert("Failed to delete landing page");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </DropdownMenuItem>
          <LandingPageDialog landingPage={landingPage}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </LandingPageDialog>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{landingPage.name}</DialogTitle>
            <DialogDescription>Landing Page Preview</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={landingPage.html_content}
              className="w-full h-[600px]"
              title="Landing Page Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{landingPage.name}&rdquo;? This action
              cannot be undone and may affect existing campaigns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
