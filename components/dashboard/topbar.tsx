"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Shield, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SearchCommand } from "@/components/dashboard/search-command"
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown"
import { UserProfileDropdown } from "@/components/dashboard/user-profile-dropdown"

interface TopbarProps {
  userEmail: string
  fullName?: string | null
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/templates": "Email Templates",
  "/dashboard/landing-pages": "Landing Pages",
  "/dashboard/recipients": "Recipients",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/campaigns/new": "New Campaign",
  "/dashboard/training": "Training Modules",
}

export function Topbar({ userEmail, fullName }: TopbarProps) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd+K / Ctrl+K shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    },
    []
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Derive page title from pathname
  const pageTitle =
    pageTitles[pathname] ||
    (pathname.startsWith("/dashboard/campaigns/") ? "Campaign Details" : "")

  return (
    <>
      {/* Safety banner */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-1.5 text-xs font-medium flex items-center gap-2">
        <Shield className="h-3 w-3 shrink-0" />
        <span>
          For authorized internal simulations only. All content is watermarked
          as SIMULATION TEMPLATE.
        </span>
      </div>

      {/* Main navigation bar */}
      <div className="h-14 border-b bg-background flex items-center justify-between px-6">
        {/* Left: Page breadcrumb */}
        <div className="flex items-center gap-3">
          {pageTitle && (
            <h2 className="text-sm font-semibold text-foreground">
              {pageTitle}
            </h2>
          )}
        </div>

        {/* Center: Search bar trigger */}
        <div className="flex-1 max-w-md mx-4">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground font-normal h-9 px-3"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="mr-2 h-4 w-4 shrink-0" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <NotificationsDropdown />
          <Separator orientation="vertical" className="mx-2 h-6" />
          <UserProfileDropdown userEmail={userEmail} fullName={fullName} />
        </div>
      </div>

      {/* Search dialog */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
