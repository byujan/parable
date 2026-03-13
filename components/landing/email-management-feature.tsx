import Image from "next/image"

export function EmailManagementFeature() {
  return (
    <div className="bg-muted/100 mx-auto flex max-w-6xl flex-col gap-6 rounded-lg px-6 py-8 md:flex-row md:items-center md:gap-8">
      <div className="flex min-h-[520px] w-full min-w-0 flex-[3] basis-0 items-center justify-center md:min-h-[640px]">
        <div className="relative h-full w-full">
          <Image
            src="/images/emailmanagement_mockup.png"
            alt="Email management interface showing recipient lists"
            width={1200}
            height={900}
            className="h-full w-full object-contain"
            sizes="(max-width: 768px) 95vw, 60vw"
          />
        </div>
      </div>
      <div className="w-full min-w-0 flex-[2] basis-0">
        <h1 className="text-xl font-semibold md:text-4xl">
          No more loose ends
        </h1>
        <h3 className="text-xl font-semibold md:text-2xl">
          Employee Management
        </h3>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          Keep track of your recipients and their responses to your phishing simulations.
        </p>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          Recipients can be sorted by department, group, or other tags. Data can be
          easily exported to CSV for further analysis.
        </p>
      </div>
    </div>
  )
}
