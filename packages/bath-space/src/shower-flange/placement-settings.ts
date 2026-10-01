'use client'
import { useSyncExternalStore } from 'react'
let preset = 'round-plate'
const listeners = new Set<() => void>()
export function setShowerFlangePreset(id: string) {
  preset = id
  for (const l of listeners) l()
}
export function useShowerFlangePreset() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => preset,
    () => 'round-plate',
  )
}
