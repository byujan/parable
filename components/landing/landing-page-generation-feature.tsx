"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

const LOOP_PATH =
  "M 10,50 C 30,50 40,15 55,15 C 70,15 75,50 60,55 C 45,60 45,30 60,25 C 75,20 85,45 100,45 L 130,45"
const PATH_LENGTH = 280

function LoopyArrow({ animate }: { animate: boolean }) {
  return (
    <svg
      viewBox="0 0 150 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-16 w-28 md:h-20 md:w-36"
      aria-hidden
    >
      <path
        d={LOOP_PATH}
        stroke="#000000"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={PATH_LENGTH}
        strokeDashoffset={animate ? PATH_LENGTH : 0}
        className={animate ? "animate-draw-line" : ""}
        style={
          animate
            ? { strokeDashoffset: PATH_LENGTH }
            : { strokeDashoffset: 0 }
        }
      />
      <polygon
        points="128,38 140,45 128,52"
        fill="#000000"
        className={animate ? "animate-arrowhead" : "opacity-100"}
      />
    </svg>
  )
}

export function LandingPageGenerationFeature() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true)
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div
        ref={sectionRef}
        className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-6"
      >
        <div className="w-full min-w-0 flex-[5] basis-0">
          <Image
            src="/images/createmockpage_mockup.png"
            alt="Create mock page interface"
            width={1200}
            height={900}
            className="w-full rounded-lg border shadow-lg"
            sizes="(max-width: 768px) 95vw, 45vw"
            priority
          />
        </div>
        <div className="flex shrink-0 items-center justify-center px-2">
          <LoopyArrow animate={isInView} />
        </div>
        <div className="w-full min-w-0 flex-[5] basis-0">
          <Image
            src="/images/mockpage_mockup.png"
            alt="Mock page preview"
            width={1200}
            height={900}
            className="w-full rounded-lg border shadow-lg"
            sizes="(max-width: 768px) 95vw, 45vw"
            priority
          />
        </div>
      </div>
      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-xl font-semibold md:text-2xl">
          Fake Landing Page Generation
        </h3>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          Create simulation landing pages such as fake login or document-download
          that recipients see when they click links in your phishing simulations.
          These pages can be AI built and previewed before send out to your teams.
        </p>
      </div>
    </div>
  )
}
