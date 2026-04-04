'use client'

import { createContext, useContext } from 'react'
import type { AcademiaInfoPublic } from '@/lib/academia-info'

const AcademiaInfoContext = createContext<AcademiaInfoPublic | null>(null)

export function AcademiaInfoProvider({
  value,
  children,
}: {
  value: AcademiaInfoPublic
  children: React.ReactNode
}) {
  return <AcademiaInfoContext.Provider value={value}>{children}</AcademiaInfoContext.Provider>
}

export function useAcademiaInfo() {
  const context = useContext(AcademiaInfoContext)

  if (!context) {
    throw new Error('AcademiaInfoProvider is required to read academia info.')
  }

  return context
}
