'use client'
import { useSyncExternalStore } from 'react'
import type { TowelRailNode } from './schema'
let style: TowelRailNode['shape'] = 'single'
const listeners = new Set<() => void>()
export function setTowelRailPlacementShape(next: TowelRailNode['shape']) {
  style = next
  for (const listener of listeners) listener()
}
export function useTowelRailPlacementShape() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'single' as const,
  )
}
