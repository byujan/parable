"use client"

import Image from "next/image"
import { useState } from "react"
import { Shuffle } from "lucide-react"

const SHUFFLE_IMAGES = [
  { src: "/images/fakeemail_mockup.png", alt: "Fake email interface mockup" },
  { src: "/images/emailtemplate_mockup.png", alt: "Email template mockup" },
]

export function FakeEmailFeature() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const image = SHUFFLE_IMAGES[currentIndex]

  return (
    <div className="bg-muted/100 mx-auto flex max-w-4xl flex-col gap-6 rounded-lg px-6 py-8 md:flex-row md:items-center md:justify-center md:gap-8">
      <div className="w-full min-w-0 flex-[1] basis-0">
        <h3 className="text-xl font-semibold md:text-2xl">
          Realistic Phishing Emails, Calls, and Texts
        </h3>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          Reach your team by any means necessary. Our platofrm supports multi medium phishing simulations. 
          Build your own templates or use personalized AI-generated ones.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setCurrentIndex((i) => (i + 1) % 2)}
        className="bg-orange-500 flex shrink-0 items-center justify-center rounded-full border bg-background p-3 shadow-sm transition-colors hover:bg-muted focus:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Shuffle mockup images"
      >
        <Shuffle className="h-6 w-6" />
      </button>
      <div className="flex h-[420px] w-full min-w-0 flex-[2] basis-0 items-center justify-center md:h-[520px]">
        <div
          className={`relative h-full w-full max-w-lg overflow-hidden ${currentIndex === 1 ? "rounded-lg border-2 border-black" : ""}`}
        >
          <div
            key={currentIndex}
            className="relative h-full w-full animate-image-fade-in"
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={1200}
              height={900}
              className="h-full w-full object-contain"
              sizes="(max-width: 768px) 85vw, 32rem"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
