'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
const SizingMode = createContext<{enabled: boolean; setEnabled: (enabled: boolean) => void} | null>(null)
export const useSectionSizingMode = () => useContext(SizingMode)
export function SectionSizingProvider({children}: {children: ReactNode}) {
  const [enabled, setEnabled] = useState(true)
  return <SizingMode.Provider value={{enabled, setEnabled}}>{children}</SizingMode.Provider>
}
