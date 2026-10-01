'use client'
import { useSyncExternalStore } from 'react'
import type { FloorStandingToiletNode } from './schema'
let style: FloorStandingToiletNode['design'] = 'back-to-wall'
const listeners = new Set<() => void>()
export function setToiletPlacementStyle(
  next: FloorStandingToiletNode['design'],
) {
  style = next
  for (const listener of listeners) listener()
}
export function useToiletPlacementStyle() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'back-to-wall' as const,
  )
}
