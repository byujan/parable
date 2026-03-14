import Image from "next/image"

export interface TeamBioProps {
  imageSrc: string
  name: string
  title: string
  imagePosition?: string
  grayscale?: boolean
  bio?: string
}

export function TeamBio({ imageSrc, name, title, imagePosition, grayscale, bio }: TeamBioProps) {
  return (
    <div className="group flex flex-col items-center gap-3 rounded-lg p-2">
      <div className="relative w-full aspect-square overflow-hidden rounded-lg border-2 border-border bg-muted/30">
        <Image
          src={imageSrc}
          alt={name}
          fill
          className={`object-cover transition-[filter] duration-300 group-hover:blur-xl ${grayscale ? "grayscale" : ""}`}
          style={{ objectPosition: imagePosition ?? "center" }}
          sizes="(max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="text-center text-sm text-white">
            {bio || "Bio coming soon"}
          </p>
        </div>
      </div>
      <p className="font-semibold text-center">{name}</p>
      <p className="text-center text-sm text-muted-foreground">{title}</p>
    </div>
  )
}
