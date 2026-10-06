'use client'
import { useSyncExternalStore } from 'react'
import type { WallLightNode } from './schema'
let style: WallLightNode['shape'] = 'bar'
const listeners = new Set<() => void>()
export function setWallLightPlacementShape(next: WallLightNode['shape']) {
  style = next
  for (const listener of listeners) listener()
}
export function useWallLightPlacementShape() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'bar' as const,
  )
}
