"use client"

import { createContext, useContext } from "react"

interface OrgContextValue {
  orgId: string
  orgName: string
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({
  orgId,
  orgName,
  children,
}: {
  orgId: string
  orgName: string
  children: React.ReactNode
}) {
  return (
    <OrgContext.Provider value={{ orgId, orgName }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider")
  }
  return ctx
}
