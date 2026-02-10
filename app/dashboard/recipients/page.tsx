import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RecipientListDialog } from "@/components/recipients/recipient-list-dialog"
import { CsvUploadDialog } from "@/components/recipients/csv-upload-dialog"
import { RecipientTable } from "@/components/recipients/recipient-table"
import { Users, Upload } from "lucide-react"

export default async function RecipientsPage() {
  const supabase = await createClient()

  const { data: recipientLists, error } = await supabase
    .from("recipient_lists")
    .select(
      `
      *,
      recipients (
        id,
        email,
        first_name,
        last_name,
        department,
        group_tag
      )
    `
    )
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching recipient lists:", error)
  }

  const listsWithStats = recipientLists?.map((list) => {
    const recipients = list.recipients || []
    const departments = new Set(
      recipients
        .map((r: { department: string | null }) => r.department)
        .filter(Boolean)
    )

    return {
      ...list,
      recipientCount: recipients.length,
      departmentsSummary: departments.size
        ? Array.from(departments).slice(0, 3).join(", ") +
          (departments.size > 3 ? `, +${departments.size - 3} more` : "")
        : "No departments",
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recipients</h1>
        <p className="text-muted-foreground mt-2">
          Manage recipient lists for your phishing simulation campaigns.
          Add recipients directly in the table, use bulk add, or import via CSV.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <CsvUploadDialog lists={recipientLists || []}>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </CsvUploadDialog>
        <RecipientListDialog>
          <Button>New List</Button>
        </RecipientListDialog>
      </div>

      {!listsWithStats || listsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No recipient lists yet</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Create a recipient list, then add recipients directly in the table or import from CSV.
          </p>
          <RecipientListDialog>
            <Button>Create Recipient List</Button>
          </RecipientListDialog>
        </div>
      ) : (
        <div className="space-y-4">
          {listsWithStats.map((list) => (
            <Card key={list.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{list.name}</CardTitle>
                    <CardDescription>
                      {list.recipientCount}{" "}
                      {list.recipientCount === 1 ? "recipient" : "recipients"} &bull;{" "}
                      {list.departmentsSummary} &bull;{" "}
                      Created {new Date(list.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <CsvUploadDialog
                    lists={recipientLists || []}
                    defaultListId={list.id}
                  >
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                  </CsvUploadDialog>
                </div>
              </CardHeader>
              <CardContent>
                <RecipientTable
                  listId={list.id}
                  recipients={list.recipients || []}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
