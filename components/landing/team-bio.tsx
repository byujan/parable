import Image from "next/image"

export interface TeamBioProps {
  imageSrc: string
  name: string
  title: string
}

export function TeamBio({ imageSrc, name, title }: TeamBioProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg p-2">
      <div className="relative w-full aspect-square overflow-hidden rounded-lg border-2 border-border bg-muted/30">
        <Image
          src={imageSrc}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 25vw"
        />
      </div>
      <p className="font-semibold text-center">{name}</p>
      <p className="text-center text-sm text-muted-foreground">{title}</p>
    </div>
  )
}
