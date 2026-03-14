import { TeamBio } from "@/components/landing/team-bio"

const TEAM = [
  {
    imageSrc: "/images/felix_headshot.jpg",
    name: "Felix Awah",
    title: "",
    imagePosition: "top",
    grayscale: true,
    bio: `Felix Awah is an MBA candidate at MIT Sloan (MBA'27) with a background in Process Engineering and Data Science from McGill University. He previously held senior roles across Big Pharma and Fintech, spanning process engineering, R&D, and technical operations, where he partnered with IT teams to deploy cybersecurity training and operational controls. His work focuses on designing secure, auditable systems and scalable processes in highly regulated environments.
Felix brings operating experience across Africa, North America, and the Middle East, combining rigorous systems thinking with entrepreneurial execution. He has founded multiple ventures, supported startups on go-to-market strategy and growth, and led nonprofits advancing education, entrepreneurship, and humanitarian initiatives.`,
  },
  {
    imageSrc: "/images/jose_headshot.jpg",
    name: "Jose Garcia",
    title: "",
    grayscale: true,
    bio: `Jose Garcia is a first-year undergraduate student at Harvard College, where he studies Computer Science and Statistics.
Jose has experience as a current software engineer for Harvard Tech for Social Good, where he is working within a team to build software solutions for non-profit organizations. Additionally, Jose has prior experience with Harvard Data Analytics Group, where he practiced applied data science and machine learning techniques for client-based insights.
Jose is passionate about using technology to solve real-world problems and is eager to continually develop himself as a better programmer and problem solver.`,
  },
  {
    imageSrc: "/images/luiz_headshot.png",
    name: "Luiz Felipe Neder Reis",
    title: "",
    bio: `Luiz Felipe Neder Reis is a first-year MBA candidate at the MIT Sloan School of Management, where he focuses his studies on Finance and Innovation. He holds a bachelor's degree in economics from Insper.
Prior to Sloan, Luiz worked at YvY Capital, where he focused on evaluating and executing private investments in infrastructure and real assets. Before that, he spent four years at UBS in São Paulo, where he progressed to Associate Director in the Investment Banking division, advising companies on capital markets and M&A transactions.
Through these experiences, Luiz developed strong analytical and problem-solving skills, as well as experience working on complex projects alongside founders, management teams, and investors.`,
  },
  {
    imageSrc: "/images/peter_headshot.png",
    name: "Peter Jang",
    title: "",
    grayscale: true,
    bio: `Peter Jang is a cybersecurity engineer and former U.S. Army Cyber Warfare Officer with experience in software engineering and security engineering supporting defense and national security organizations. He holds a Master's degree in Computer Science from the Georgia Institute of Technology and a Bachelor of Science from the United States Military Academy at West Point. Peter is currently an MBA candidate at the MIT Sloan School of Management and holds multiple cybersecurity certifications`,
  },
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
            imagePosition={member.imagePosition}
            grayscale={member.grayscale}
            bio={member.bio}
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
              src="/images/Harvard_logo.svg"
              alt=""
              className="h-12 w-auto"
            />
          </a>
          
        </div>
      </div>
    </section>
  )
}
