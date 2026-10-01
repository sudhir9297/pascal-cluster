'use client'
import { useSyncExternalStore } from 'react'
import type { WallFlushPlateNode } from './schema'
let style: WallFlushPlateNode['shape'] = 'rounded'
const listeners = new Set<() => void>()
export function setFlushPlatePlacementShape(next: WallFlushPlateNode['shape']) {
  style = next
  for (const listener of listeners) listener()
}
export function useFlushPlatePlacementShape() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'rounded' as const,
  )
}
