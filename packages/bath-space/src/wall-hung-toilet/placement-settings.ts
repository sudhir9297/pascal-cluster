'use client'
import { useSyncExternalStore } from 'react'
import type { WallHungToiletNode } from './schema'
type ToiletPlacementStyle = WallHungToiletNode['style']
let style: ToiletPlacementStyle = 'd-shaped'
const listeners = new Set<() => void>()
export function setToiletPlacementStyle(next: ToiletPlacementStyle) {
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
    () => 'd-shaped' as const,
  )
}
