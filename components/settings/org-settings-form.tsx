"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Organization } from "@/lib/types"

interface OrgSettingsFormProps {
  org: Organization
}

export function OrgSettingsForm({ org }: OrgSettingsFormProps) {
  const [name, setName] = useState(org.name)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("organizations")
        .update({ name: name.trim() })
        .eq("id", org.id)

      if (error) throw error
      router.refresh()
    } catch (err) {
      console.error("Error updating organization:", err)
      alert("Failed to update organization")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="orgName">Organization Name</Label>
        <Input
          id="orgName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Slug</Label>
        <p className="text-sm text-muted-foreground">{org.slug}</p>
      </div>
      <Button
        onClick={handleSave}
        disabled={loading || name.trim() === org.name}
      >
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  )
}
