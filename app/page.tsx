import Link from "next/link"
import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { TeamSection } from "@/components/landing/team-section"
import { Footer } from "@/components/landing/footer"
import { LandingButton } from "@/components/landing/landing-button"

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Parable</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-orange-500 text-white hover:bg-orange-600">
            <a
              href="https://form.jotform.com/260711750981054"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get in touch
            </a>
          </Button>
          <LandingButton href="/signup">Sign up</LandingButton>
        </div>
      </header>
      <main className="flex flex-col items-center">
        <HeroSection />
        <FeaturesSection />
        <TeamSection />
      </main>
      <Footer />
    </>
  )
}
