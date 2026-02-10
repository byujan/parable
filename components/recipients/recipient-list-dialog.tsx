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
import { useRouter } from "next/navigation";

interface RecipientListDialogProps {
  children: React.ReactNode;
}

export function RecipientListDialog({ children }: RecipientListDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!name) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("recipient_lists").insert({
        name,
      });

      if (error) throw error;

      setName("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating recipient list:", error);
      alert("Failed to create recipient list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Recipient List</DialogTitle>
          <DialogDescription>
            Create a new list to organize your recipients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">List Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Department, Sales Team"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name) {
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !name}>
            {loading ? "Creating..." : "Create List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
