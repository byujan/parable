import { TeamBio } from "@/components/landing/team-bio"

const TEAM = [
  { imageSrc: "/images/felix_headshot.jpg", name: "Felix Awah", title: "" },
  { imageSrc: "/images/jose_headshot.jpg", name: "Jose Garcia", title: "" },
  { imageSrc: "/images/luiz_headshot.png", name: "Luiz Felipe Neder Reis", title: "" },
  { imageSrc: "/images/peter_headshot.png", name: "Peter Jang", title: "" },
]

export function TeamSection() {
  return (
    <section
      id="team"
      className="flex w-full max-w-full flex-col items-center gap-8 py-16 px-6"
    >
      <h2 className="text-2xl font-semibold">Our team</h2>
      <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {TEAM.map((member) => (
          <TeamBio
            key={member.name}
            imageSrc={member.imageSrc}
            name={member.name}
            title={member.title}
          />
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center gap-6">
        <p className="text-lg font-medium text-muted-foreground">Built by founders at</p>
        <div className="flex flex-wrap items-center justify-center gap-12">
          <a
            href="https://www.mit.edu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="MIT"
            className="grayscale transition-[filter] duration-300 hover:grayscale-0"
          >
            <img
              src="/images/MIT_logo.svg"
              alt=""
              className="h-12 w-auto"
            />
          </a>
          <a
            href="https://www.harvard.edu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Harvard University"
            className="grayscale transition-[filter] duration-300 hover:grayscale-0"
          >
            <img
              src="/images/harvard_logo.svg"
              alt=""
              className="h-12 w-auto"
            />
          </a>
          
        </div>
      </div>
    </section>
  )
}
