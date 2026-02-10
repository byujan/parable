"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Mail,
  Globe,
  Users,
  Send,
  GraduationCap,
  LogOut
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userEmail?: string;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Templates",
    href: "/dashboard/templates",
    icon: Mail,
  },
  {
    name: "Landing Pages",
    href: "/dashboard/landing-pages",
    icon: Globe,
  },
  {
    name: "Recipients",
    href: "/dashboard/recipients",
    icon: Users,
  },
  {
    name: "Campaigns",
    href: "/dashboard/campaigns",
    icon: Send,
  },
  {
    name: "Training",
    href: "/dashboard/training",
    icon: GraduationCap,
  },
];

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="fixed left-0 w-64 h-screen bg-card border-r flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Parable</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                transition-colors hover:bg-accent
                ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}
              `}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-3 border-t">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium truncate">{userEmail}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
