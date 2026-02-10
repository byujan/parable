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
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/lib/types";
import { Eye } from "lucide-react";

interface LandingPageDialogProps {
  children: React.ReactNode;
  landingPage?: LandingPage;
}

const STARTER_TEMPLATES = {
  fakeLogin: {
    name: "Fake Login Page",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In - Corporate Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #333; font-size: 24px; margin: 0 0 10px 0;">Corporate Portal</h1>
      <p style="color: #666; margin: 0;">Sign in to your account</p>
    </div>
    <form action="/api/track/submit" method="POST">
      <input type="hidden" name="token" value="" />
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #333; font-weight: 500; margin-bottom: 8px;">Username</label>
        <input type="text" name="username" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="Enter your username" required />
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #333; font-weight: 500; margin-bottom: 8px;">Password</label>
        <input type="password" name="password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="Enter your password" required />
      </div>
      <button type="submit" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer;">Sign In</button>
    </form>
    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">Forgot your password? Contact IT support</p>
  </div>
</body>
</html>`,
    hasForm: true,
  },
  fakeDownload: {
    name: "Fake Document Download",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="background: white; padding: 60px 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 500px; text-align: center;">
    <input type="hidden" name="token" value="" />
    <div style="width: 80px; height: 80px; background: #4CAF50; border-radius: 50%; margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
      </svg>
    </div>
    <h1 style="color: #333; font-size: 28px; margin: 0 0 15px 0;">Your Document is Ready</h1>
    <p style="color: #666; margin: 0 0 30px 0; font-size: 16px;">Click the button below to download your secure document</p>
    <form action="/api/track/submit" method="POST">
      <input type="hidden" name="token" value="" />
      <button type="submit" style="padding: 15px 40px; background: #2196F3; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 5px rgba(33,150,243,0.3);">Download Document</button>
    </form>
    <p style="color: #999; font-size: 13px; margin-top: 30px;">This link will expire in 24 hours</p>
  </div>
</body>
</html>`,
    hasForm: true,
  },
  fakeVerification: {
    name: "Fake Account Verification",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 450px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 60px; height: 60px; background: #ff9800; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h1 style="color: #333; font-size: 24px; margin: 0 0 10px 0;">Account Verification Required</h1>
      <p style="color: #666; margin: 0;">For your security, please verify your account details</p>
    </div>
    <form action="/api/track/submit" method="POST">
      <input type="hidden" name="token" value="" />
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #333; font-weight: 500; margin-bottom: 8px;">Email Address</label>
        <input type="email" name="email" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="your.email@company.com" required />
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; color: #333; font-weight: 500; margin-bottom: 8px;">Employee ID</label>
        <input type="text" name="employee_id" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="Enter your employee ID" required />
      </div>
      <div style="margin-bottom: 25px;">
        <label style="display: block; color: #333; font-weight: 500; margin-bottom: 8px;">Verification Code</label>
        <input type="text" name="code" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;" placeholder="Enter code from email" required />
      </div>
      <button type="submit" style="width: 100%; padding: 12px; background: #ff9800; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer;">Verify Account</button>
    </form>
    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">Your account will be suspended if not verified within 24 hours</p>
  </div>
</body>
</html>`,
    hasForm: true,
  },
};

export function LandingPageDialog({
  children,
  landingPage,
}: LandingPageDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(landingPage?.name || "");
  const [htmlContent, setHtmlContent] = useState(
    landingPage?.html_content || ""
  );
  const [hasForm, setHasForm] = useState(landingPage?.has_form || false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTemplateSelect = (
    template: keyof typeof STARTER_TEMPLATES
  ) => {
    const selected = STARTER_TEMPLATES[template];
    if (!name) setName(selected.name);
    setHtmlContent(selected.html);
    setHasForm(selected.hasForm);
  };

  const handleSave = async () => {
    if (!name || !htmlContent) return;

    setLoading(true);
    const supabase = createClient();

    try {
      if (landingPage) {
        const { error } = await supabase
          .from("landing_pages")
          .update({
            name,
            html_content: htmlContent,
            has_form: hasForm,
            updated_at: new Date().toISOString(),
          })
          .eq("id", landingPage.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("landing_pages").insert({
          name,
          html_content: htmlContent,
          has_form: hasForm,
        });

        if (error) throw error;
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving landing page:", error);
      alert("Failed to save landing page");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {landingPage ? "Edit Landing Page" : "New Landing Page"}
            </DialogTitle>
            <DialogDescription>
              Create a landing page that recipients will see when they click
              phishing links
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!landingPage && (
              <div className="space-y-2">
                <Label>Starter Templates</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect("fakeLogin")}
                  >
                    Fake Login Page
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect("fakeDownload")}
                  >
                    Fake Document Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplateSelect("fakeVerification")}
                  >
                    Fake Account Verification
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Generic Login Page"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="html_content">HTML Content</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
              <Textarea
                id="html_content"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Enter HTML content..."
                className="font-mono text-sm min-h-[400px]"
              />
              <p className="text-xs text-muted-foreground">
                Include a hidden input with name=&quot;token&quot; for tracking. Forms
                should post to /api/track/submit
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_form"
                checked={hasForm}
                onCheckedChange={(checked) => setHasForm(checked as boolean)}
              />
              <Label htmlFor="has_form" className="cursor-pointer">
                This page contains a form that captures data
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !name || !htmlContent}>
              {loading ? "Saving..." : "Save Landing Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={htmlContent}
              className="w-full h-[600px]"
              title="Landing Page Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
