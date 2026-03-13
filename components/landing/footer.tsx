import Link from "next/link"
import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="w-full min-w-full bg-black flex items-center justify-between px-6 py-4">
      <Link href="/" className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-white" />
        <span className="text-xl font-bold text-white">Parable</span>
      </Link>
      <Button asChild className="bg-orange-500 text-white hover:bg-orange-600">
        <a
          href="https://form.jotform.com/260711750981054"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get in touch
        </a>
      </Button>
    </footer>
  )
}
