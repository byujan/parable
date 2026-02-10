"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LogOut,
  Settings,
  User,
  Shield,
  KeyRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface UserProfileDropdownProps {
  userEmail: string
  fullName?: string | null
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return (email || "U")[0].toUpperCase()
}

function getAvatarColor(email: string): string {
  // Deterministic color from email hash
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-fuchsia-600",
  ]
  return colors[Math.abs(hash) % colors.length]
}

export function UserProfileDropdown({
  userEmail,
  fullName,
}: UserProfileDropdownProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = getInitials(fullName, userEmail)
  const avatarColor = getAvatarColor(userEmail)
  const displayName = fullName || userEmail.split("@")[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <div
            className={`h-9 w-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-medium`}
          >
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 shrink-0 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-medium`}
            >
              {initials}
            </div>
            <div className="flex flex-col space-y-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {userEmail}
              </p>
              <Badge
                variant="secondary"
                className="w-fit mt-1 text-[10px] px-1.5 py-0"
              >
                <Shield className="h-2.5 w-2.5 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
