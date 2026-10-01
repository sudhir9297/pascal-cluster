'use client'
import { useSyncExternalStore } from 'react'
let preset = 'coupling'
const listeners = new Set<() => void>()
export function setShowerConnectorPreset(id: string) {
  preset = id
  for (const l of listeners) l()
}
export function useShowerConnectorPreset() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => preset,
    () => 'coupling',
  )
}
