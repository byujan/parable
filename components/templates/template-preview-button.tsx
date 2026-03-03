"use client"

import { useState } from "react"
import { Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Template } from "@/lib/types"

interface TemplatePreviewButtonProps {
  template: Template
  children: React.ReactNode
}

export function TemplatePreviewButton({
  template,
  children,
}: TemplatePreviewButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left hover:underline cursor-pointer font-medium"
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
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
                <span className="block text-xs font-medium text-muted-foreground">
                  Subject
                </span>
                <p className="font-medium">{template.subject}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">
                    Sender Name
                  </span>
                  <p className="font-medium">{template.sender_name}</p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted-foreground">
                    Sender Email
                  </span>
                  <p className="font-mono text-sm">{template.sender_email}</p>
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-muted-foreground mb-2">
                Email Body (HTML Preview)
              </span>
              <div className="max-h-80 overflow-y-auto rounded-lg border bg-background p-4">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: template.html_body }}
                />
              </div>
            </div>

            {template.text_body && (
              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-2">
                  Plain Text Version
                </span>
                <pre className="max-h-40 overflow-y-auto rounded-lg border bg-muted p-4 text-sm whitespace-pre-wrap font-mono">
                  {template.text_body}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
