'use client'
import { useSyncExternalStore } from 'react'
let selected: string | null = null
const listeners = new Set<() => void>()
export function setShowerKitPreset(id: string | null) {
  selected = id
  for (const listener of listeners) listener()
}
export function useShowerKitPreset() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => selected,
    () => null,
  )
}
