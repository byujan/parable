"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { Recipient } from "@/lib/types"
import {
  Search,
  Trash2,
  Plus,
  Check,
  X,
  Pencil,
  ListPlus,
} from "lucide-react"

interface RecipientTableProps {
  listId: string
  recipients: Recipient[]
}

interface InlineRow {
  email: string
  first_name: string
  last_name: string
  department: string
  group_tag: string
}

const emptyRow = (): InlineRow => ({
  email: "",
  first_name: "",
  last_name: "",
  department: "",
  group_tag: "",
})

export function RecipientTable({ listId, recipients }: RecipientTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(
    null
  )
  const [loading, setLoading] = useState(false)

  // Inline add row state
  const [addingRow, setAddingRow] = useState(false)
  const [newRow, setNewRow] = useState<InlineRow>(emptyRow())

  // Bulk add state
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkRows, setBulkRows] = useState<InlineRow[]>([emptyRow(), emptyRow(), emptyRow()])

  // Edit-in-place state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<InlineRow>(emptyRow())

  const emailInputRef = useRef<HTMLInputElement>(null)
  const bulkFirstRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Focus email input when inline add row appears
  useEffect(() => {
    if (addingRow && emailInputRef.current) {
      emailInputRef.current.focus()
    }
  }, [addingRow])

  useEffect(() => {
    if (bulkMode && bulkFirstRef.current) {
      bulkFirstRef.current.focus()
    }
  }, [bulkMode])

  const filteredRecipients = recipients.filter((recipient) => {
    const search = searchTerm.toLowerCase()
    return (
      recipient.email.toLowerCase().includes(search) ||
      recipient.first_name?.toLowerCase().includes(search) ||
      recipient.last_name?.toLowerCase().includes(search) ||
      recipient.department?.toLowerCase().includes(search)
    )
  })

  // --- Add single recipient inline ---
  const handleInlineAdd = async () => {
    if (!newRow.email.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("recipients").insert({
        email: newRow.email.toLowerCase().trim(),
        first_name: newRow.first_name.trim(),
        last_name: newRow.last_name.trim(),
        department: newRow.department.trim() || null,
        group_tag: newRow.group_tag.trim() || null,
        list_id: listId,
      })

      if (error) throw error

      setNewRow(emptyRow())
      // Keep the add row open for rapid entry
      router.refresh()
    } catch (error) {
      console.error("Error adding recipient:", error)
      alert("Failed to add recipient. Check for duplicate email.")
    } finally {
      setLoading(false)
    }
  }

  const handleInlineAddKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && newRow.email.trim()) {
        e.preventDefault()
        handleInlineAdd()
      } else if (e.key === "Escape") {
        setAddingRow(false)
        setNewRow(emptyRow())
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newRow]
  )

  // --- Bulk add ---
  const handleBulkRowChange = (index: number, field: keyof InlineRow, value: string) => {
    setBulkRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addBulkRow = () => {
    setBulkRows((prev) => [...prev, emptyRow()])
  }

  const removeBulkRow = (index: number) => {
    setBulkRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleBulkSubmit = async () => {
    const validRows = bulkRows.filter((row) => row.email.trim())
    if (validRows.length === 0) return

    setLoading(true)
    const supabase = createClient()

    try {
      const toInsert = validRows.map((row) => ({
        email: row.email.toLowerCase().trim(),
        first_name: row.first_name.trim(),
        last_name: row.last_name.trim(),
        department: row.department.trim() || null,
        group_tag: row.group_tag.trim() || null,
        list_id: listId,
      }))

      const { error } = await supabase.from("recipients").insert(toInsert)

      if (error) throw error

      setBulkMode(false)
      setBulkRows([emptyRow(), emptyRow(), emptyRow()])
      router.refresh()
    } catch (error) {
      console.error("Error adding recipients:", error)
      alert("Failed to add recipients. Check for duplicate emails.")
    } finally {
      setLoading(false)
    }
  }

  // --- Edit in place ---
  const startEdit = (recipient: Recipient) => {
    setEditingId(recipient.id)
    setEditRow({
      email: recipient.email,
      first_name: recipient.first_name || "",
      last_name: recipient.last_name || "",
      department: recipient.department || "",
      group_tag: recipient.group_tag || "",
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRow(emptyRow())
  }

  const saveEdit = async () => {
    if (!editingId || !editRow.email.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("recipients")
        .update({
          email: editRow.email.toLowerCase().trim(),
          first_name: editRow.first_name.trim(),
          last_name: editRow.last_name.trim(),
          department: editRow.department.trim() || null,
          group_tag: editRow.group_tag.trim() || null,
        })
        .eq("id", editingId)

      if (error) throw error

      setEditingId(null)
      setEditRow(emptyRow())
      router.refresh()
    } catch (error) {
      console.error("Error updating recipient:", error)
      alert("Failed to update recipient")
    } finally {
      setLoading(false)
    }
  }

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        saveEdit()
      } else if (e.key === "Escape") {
        cancelEdit()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editRow, editingId]
  )

  // --- Delete ---
  const handleDeleteRecipient = async () => {
    if (!selectedRecipient) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("recipients")
        .delete()
        .eq("id", selectedRecipient.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setSelectedRecipient(null)
      router.refresh()
    } catch (error) {
      console.error("Error deleting recipient:", error)
      alert("Failed to delete recipient")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setBulkMode(true)
            setAddingRow(false)
          }}
          disabled={bulkMode}
        >
          <ListPlus className="h-4 w-4 mr-2" />
          Bulk Add
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAddingRow(true)
            setBulkMode(false)
          }}
          disabled={addingRow}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>

      {/* Bulk add mode */}
      {bulkMode && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Bulk Add Recipients
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulkMode(false)
                setBulkRows([emptyRow(), emptyRow(), emptyRow()])
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {/* Header labels */}
            <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr_0.7fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Email *</span>
              <span>First Name</span>
              <span>Last Name</span>
              <span>Department</span>
              <span>Group Tag</span>
              <span className="w-8" />
            </div>
            {bulkRows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr_0.7fr_auto] gap-2"
              >
                <Input
                  ref={index === 0 ? bulkFirstRef : undefined}
                  placeholder="email@example.com"
                  value={row.email}
                  onChange={(e) =>
                    handleBulkRowChange(index, "email", e.target.value)
                  }
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="First"
                  value={row.first_name}
                  onChange={(e) =>
                    handleBulkRowChange(index, "first_name", e.target.value)
                  }
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Last"
                  value={row.last_name}
                  onChange={(e) =>
                    handleBulkRowChange(index, "last_name", e.target.value)
                  }
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Dept"
                  value={row.department}
                  onChange={(e) =>
                    handleBulkRowChange(index, "department", e.target.value)
                  }
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Tag"
                  value={row.group_tag}
                  onChange={(e) =>
                    handleBulkRowChange(index, "group_tag", e.target.value)
                  }
                  className="h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => removeBulkRow(index)}
                  disabled={bulkRows.length <= 1}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={addBulkRow}>
              <Plus className="h-3 w-3 mr-1" />
              Add Row
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkMode(false)
                  setBulkRows([emptyRow(), emptyRow(), emptyRow()])
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBulkSubmit}
                disabled={
                  loading || bulkRows.every((r) => !r.email.trim())
                }
              >
                {loading
                  ? "Adding..."
                  : `Add ${bulkRows.filter((r) => r.email.trim()).length} Recipients`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Group Tag</TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecipients.length === 0 && !addingRow ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchTerm
                    ? "No recipients match your search"
                    : "No recipients yet. Click Add Row or Bulk Add to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRecipients.map((recipient) =>
                editingId === recipient.id ? (
                  // Edit-in-place row
                  <TableRow key={recipient.id} className="bg-accent/20">
                    <TableCell>
                      <Input
                        value={editRow.email}
                        onChange={(e) =>
                          setEditRow((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        onKeyDown={handleEditKeyDown}
                        className="h-7 text-sm font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.first_name}
                        onChange={(e) =>
                          setEditRow((prev) => ({
                            ...prev,
                            first_name: e.target.value,
                          }))
                        }
                        onKeyDown={handleEditKeyDown}
                        className="h-7 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.last_name}
                        onChange={(e) =>
                          setEditRow((prev) => ({
                            ...prev,
                            last_name: e.target.value,
                          }))
                        }
                        onKeyDown={handleEditKeyDown}
                        className="h-7 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.department}
                        onChange={(e) =>
                          setEditRow((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        onKeyDown={handleEditKeyDown}
                        className="h-7 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.group_tag}
                        onChange={(e) =>
                          setEditRow((prev) => ({
                            ...prev,
                            group_tag: e.target.value,
                          }))
                        }
                        onKeyDown={handleEditKeyDown}
                        className="h-7 text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={saveEdit}
                          disabled={loading}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Normal display row
                  <TableRow key={recipient.id}>
                    <TableCell className="font-mono text-sm">
                      {recipient.email}
                    </TableCell>
                    <TableCell>{recipient.first_name || "-"}</TableCell>
                    <TableCell>{recipient.last_name || "-"}</TableCell>
                    <TableCell>{recipient.department || "-"}</TableCell>
                    <TableCell>
                      {recipient.group_tag ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                          {recipient.group_tag}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => startEdit(recipient)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedRecipient(recipient)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )
            )}

            {/* Inline add row at bottom of table */}
            {addingRow && (
              <TableRow className="bg-accent/10">
                <TableCell>
                  <Input
                    ref={emailInputRef}
                    placeholder="email@example.com"
                    value={newRow.email}
                    onChange={(e) =>
                      setNewRow((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    onKeyDown={handleInlineAddKeyDown}
                    className="h-7 text-sm font-mono"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="First"
                    value={newRow.first_name}
                    onChange={(e) =>
                      setNewRow((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    onKeyDown={handleInlineAddKeyDown}
                    className="h-7 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Last"
                    value={newRow.last_name}
                    onChange={(e) =>
                      setNewRow((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    onKeyDown={handleInlineAddKeyDown}
                    className="h-7 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Department"
                    value={newRow.department}
                    onChange={(e) =>
                      setNewRow((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    onKeyDown={handleInlineAddKeyDown}
                    className="h-7 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Tag"
                    value={newRow.group_tag}
                    onChange={(e) =>
                      setNewRow((prev) => ({
                        ...prev,
                        group_tag: e.target.value,
                      }))
                    }
                    onKeyDown={handleInlineAddKeyDown}
                    className="h-7 text-sm"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleInlineAdd}
                      disabled={loading || !newRow.email.trim()}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setAddingRow(false)
                        setNewRow(emptyRow())
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {recipients.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {searchTerm
            ? `Showing ${filteredRecipients.length} of ${recipients.length} recipients`
            : `${recipients.length} ${recipients.length === 1 ? "recipient" : "recipients"}`}
        </p>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRecipient?.email}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRecipient(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecipient}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
