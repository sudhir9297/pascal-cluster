'use client'
import { useSyncExternalStore } from 'react'
let preset = 'pressure-balance'
const listeners = new Set<() => void>()
export function setShowerValvePreset(id: string) {
  preset = id
  for (const l of listeners) l()
}
export function useShowerValvePreset() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => preset,
    () => 'pressure-balance',
  )
}
