"use client"

import { useEffect, useRef, useState } from "react"

const TARGET = "Parable"
const CHARS =
  "$%&#@*!<}{][()_+-=?.,;:'\"\\|"
  // 23456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

export function ScrambleTitle() {
  const [chars, setChars] = useState<string[]>(() => Array(TARGET.length).fill(""))
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const runLetter = (i: number) => {
      if (i >= TARGET.length) return

      setChars((prev) => {
        const next = [...prev]
        next[i] = randomChar()
        return next
      })

      const duration = 300 + Math.random() * 300

      intervalRef.current = setInterval(() => {
        setChars((prev) => {
          const next = [...prev]
          next[i] = randomChar()
          return next
        })
      }, 60)

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setChars((prev) => {
          const next = [...prev]
          next[i] = TARGET[i]
          return next
        })
        if (i === TARGET.length - 1) {
          setIsComplete(true)
        }
        runLetter(i + 1)
      }, duration)
    }

    runLetter(0)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <h1
      className={`text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight ${isComplete ? "animate-bounce-once" : ""}`}
    >
      {chars.map((c, i) => (
        <span key={i}>{c || "\u00A0"}</span>
      ))}
    </h1>
  )
}
