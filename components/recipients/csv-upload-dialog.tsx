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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { RecipientList } from "@/lib/types";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CsvUploadDialogProps {
  children: React.ReactNode;
  lists: RecipientList[];
  defaultListId?: string;
}

interface ParsedRecipient {
  email: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  group_tag?: string;
}

export function CsvUploadDialog({
  children,
  lists,
  defaultListId,
}: CsvUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState(defaultListId || "");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRecipient[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    successful: number;
    failed: number;
  } | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setParsedData([]);
    setSuccess(false);
    setUploadStats(null);

    Papa.parse<ParsedRecipient>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validationErrors: string[] = [];
        const data = results.data;

        // Check for required email column
        if (data.length > 0 && !data[0].email) {
          validationErrors.push(
            "CSV must include an 'email' column (case-insensitive)"
          );
          setErrors(validationErrors);
          return;
        }

        // Validate emails
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validRecipients: ParsedRecipient[] = [];

        data.forEach((row, index) => {
          if (!row.email) {
            validationErrors.push(`Row ${index + 2}: Missing email`);
          } else if (!emailRegex.test(row.email)) {
            validationErrors.push(`Row ${index + 2}: Invalid email format`);
          } else {
            validRecipients.push({
              email: row.email.toLowerCase().trim(),
              first_name: row.first_name?.trim() || "",
              last_name: row.last_name?.trim() || "",
              department: row.department?.trim() || "",
              group_tag: row.group_tag?.trim() || "",
            });
          }
        });

        if (validationErrors.length > 10) {
          setErrors([
            ...validationErrors.slice(0, 10),
            `...and ${validationErrors.length - 10} more errors`,
          ]);
        } else {
          setErrors(validationErrors);
        }

        setParsedData(validRecipients);
      },
      error: (error) => {
        setErrors([`Failed to parse CSV: ${error.message}`]);
      },
    });
  };

  const handleUpload = async () => {
    if (!selectedListId || parsedData.length === 0) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const recipientsToInsert = parsedData.map((recipient) => ({
        ...recipient,
        list_id: selectedListId,
      }));

      const { data, error } = await supabase
        .from("recipients")
        .insert(recipientsToInsert)
        .select();

      if (error) throw error;

      setSuccess(true);
      setUploadStats({
        total: parsedData.length,
        successful: data?.length || 0,
        failed: parsedData.length - (data?.length || 0),
      });

      setTimeout(() => {
        setOpen(false);
        router.refresh();
        // Reset state
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setSuccess(false);
        setUploadStats(null);
      }, 2000);
    } catch (error) {
      console.error("Error uploading recipients:", error);
      setErrors(["Failed to upload recipients. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setSuccess(false);
    setUploadStats(null);
    setSelectedListId(defaultListId || "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Recipients CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with recipient information. Required column:
            email. Optional: first_name, last_name, department, group_tag
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list">Recipient List</Label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={!selectedListId}
            />
            {!selectedListId && (
              <p className="text-xs text-muted-foreground">
                Select a list first
              </p>
            )}
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">Validation Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {success && uploadStats && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Successfully uploaded {uploadStats.successful} of{" "}
                {uploadStats.total} recipients!
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && !success && (
            <div className="space-y-2">
              <Label>Preview (showing first 5 rows)</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Group Tag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((recipient, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {recipient.email}
                        </TableCell>
                        <TableCell>{recipient.first_name || "-"}</TableCell>
                        <TableCell>{recipient.last_name || "-"}</TableCell>
                        <TableCell>{recipient.department || "-"}</TableCell>
                        <TableCell>{recipient.group_tag || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                Total: {parsedData.length} valid recipients
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              loading ||
              !selectedListId ||
              parsedData.length === 0 ||
              errors.length > 0 ||
              success
            }
          >
            {loading ? (
              "Uploading..."
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {parsedData.length} Recipients
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
