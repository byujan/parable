import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { ButtonProps } from "@/components/ui/button"

export interface LandingButtonProps {
  href: string
  children: ReactNode
  size?: ButtonProps["size"]
  variant?: ButtonProps["variant"]
  className?: string
}

export function LandingButton({
  href,
  children,
  size = "default",
  variant = "default",
  className,
}: LandingButtonProps) {
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
