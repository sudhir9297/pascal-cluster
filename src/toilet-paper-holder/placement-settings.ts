'use client'
import { useSyncExternalStore } from 'react'
import type { ToiletPaperHolderNode } from './schema'
let style: ToiletPaperHolderNode['shape'] = 'open'
const listeners = new Set<() => void>()
export function setHolderPlacementShape(next: ToiletPaperHolderNode['shape']) {
  style = next
  for (const listener of listeners) listener()
}
export function useHolderPlacementShape() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'open' as const,
  )
}
