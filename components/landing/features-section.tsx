import { EmailManagementFeature } from "@/components/landing/email-management-feature"
import { FakeEmailFeature } from "@/components/landing/fake-email-feature"
import { LandingPageGenerationFeature } from "@/components/landing/landing-page-generation-feature"

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="flex w-full flex-col items-center gap-6 py-16 px-6"
    >
      <h2 className="text-2xl font-bold">Agentic generated defense training like no other</h2>
      <div className="mt-8 flex w-[95vw] max-w-[1600px] flex-col gap-12">
        <FakeEmailFeature />
        <LandingPageGenerationFeature />
        <EmailManagementFeature />
      </div>
    </section>
  )
}
