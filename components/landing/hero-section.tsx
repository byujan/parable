import Image from "next/image"
import { LandingButton } from "@/components/landing/landing-button"
import { ScrambleTitle } from "@/components/landing/scramble-title"

export function HeroSection() {
  return (
    <section className="flex flex-col items-center pt-16">
      <ScrambleTitle />
      <div className="mt-6 flex flex-col items-center gap-4">
        <p className="max-w-xl text-center text-xl text-muted-foreground">
          Prepare Your Team For Tomorrow&apos;s Threats.
        </p>
        <p className="max-w-xl text-center text-muted-foreground">
          Our dynamic simulation-based cybersecurity training platform helps you
          train your team to identify and respond to phishing attacks. Training
          is carried out in adaptive environments that reflect
          real-world attack patterns.
        </p>
        <LandingButton href="/signup" size="lg">
          Sign up
        </LandingButton>
      </div>
      <div className="mt-10 w-[95vw] max-w-7xl min-h-[50vh] px-2">
        <Image
          src="/images/dashboard_mockup.png"
          alt="Parable dashboard showing campaign metrics and recent campaigns"
          width={1200}
          height={800}
          className="w-full min-h-[50vh] max-w-full rounded-lg border shadow-lg object-contain object-center"
          sizes="95vw"
        />
      </div>
    </section>
  )
}
