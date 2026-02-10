"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  LayoutDashboard,
  Mail,
  Globe,
  Users,
  Send,
  GraduationCap,
  Search,
  FileText,
  HelpCircle,
  BookOpen,
  ArrowRight,
} from "lucide-react"

interface SearchItem {
  id: string
  label: string
  description: string
  icon: React.ElementType
  href?: string
  category: "navigation" | "action" | "help"
}

const searchItems: SearchItem[] = [
  // Navigation
  {
    id: "nav-dashboard",
    label: "Dashboard",
    description: "Overview and statistics",
    icon: LayoutDashboard,
    href: "/dashboard",
    category: "navigation",
  },
  {
    id: "nav-templates",
    label: "Email Templates",
    description: "Manage phishing simulation templates",
    icon: Mail,
    href: "/dashboard/templates",
    category: "navigation",
  },
  {
    id: "nav-landing-pages",
    label: "Landing Pages",
    description: "Manage simulation landing pages",
    icon: Globe,
    href: "/dashboard/landing-pages",
    category: "navigation",
  },
  {
    id: "nav-recipients",
    label: "Recipients",
    description: "Manage recipient lists and groups",
    icon: Users,
    href: "/dashboard/recipients",
    category: "navigation",
  },
  {
    id: "nav-campaigns",
    label: "Campaigns",
    description: "View and manage campaigns",
    icon: Send,
    href: "/dashboard/campaigns",
    category: "navigation",
  },
  {
    id: "nav-campaigns-new",
    label: "Create Campaign",
    description: "Start a new phishing simulation campaign",
    icon: Send,
    href: "/dashboard/campaigns/new",
    category: "navigation",
  },
  {
    id: "nav-training",
    label: "Training Modules",
    description: "Manage micro-training content",
    icon: GraduationCap,
    href: "/dashboard/training",
    category: "navigation",
  },
  // Actions
  {
    id: "action-generate-template",
    label: "Generate Template with AI",
    description: "Use AI to create a new phishing simulation template",
    icon: FileText,
    href: "/dashboard/templates",
    category: "action",
  },
  {
    id: "action-upload-csv",
    label: "Upload Recipients CSV",
    description: "Import recipients from a CSV file",
    icon: Users,
    href: "/dashboard/recipients",
    category: "action",
  },
  // Help
  {
    id: "help-getting-started",
    label: "Getting Started",
    description: "Learn how to set up your first campaign",
    icon: BookOpen,
    category: "help",
  },
  {
    id: "help-templates",
    label: "Template Variables",
    description: "Available merge fields: {{first_name}}, {{last_name}}, {{email}}",
    icon: HelpCircle,
    category: "help",
  },
  {
    id: "help-tracking",
    label: "How Tracking Works",
    description: "Open pixels, click tracking, form submissions, and reporting",
    icon: HelpCircle,
    category: "help",
  },
]

const categoryLabels: Record<string, string> = {
  navigation: "Go to",
  action: "Actions",
  help: "Help",
}

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = query.length === 0
    ? searchItems
    : searchItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )

  // Group by category
  const grouped = filtered.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const flatFiltered = Object.values(grouped).flat()

  const handleSelect = useCallback(
    (item: SearchItem) => {
      onOpenChange(false)
      setQuery("")
      setSelectedIndex(0)
      if (item.href) {
        router.push(item.href)
      }
    },
    [onOpenChange, router]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
        e.preventDefault()
        handleSelect(flatFiltered[selectedIndex])
      }
    },
    [flatFiltered, selectedIndex, handleSelect]
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  let runningIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search pages, actions, and help..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
            autoFocus
          />
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ESC
          </kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {categoryLabels[category] || category}
                </div>
                {items.map((item) => {
                  runningIndex++
                  const isSelected = runningIndex === selectedIndex
                  const Icon = item.icon
                  const currentIndex = runningIndex

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`
                        w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm cursor-pointer
                        ${isSelected ? "bg-accent text-accent-foreground" : "text-foreground"}
                      `}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                      {item.href && (
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
