'use client'
import { useSyncExternalStore } from 'react'
import { setShowerKitPreset } from '../shower-kit/placement-settings'
import type { ShowerArmNode } from './schema'
let style: ShowerArmNode['style'] = 'round-adjustable'
const listeners = new Set<() => void>()
export function setShowerArmPlacementStyle(next: ShowerArmNode['style']) {
  setShowerKitPreset(null)
  style = next
  for (const listener of listeners) listener()
}
export function useShowerArmPlacementStyle() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'round-adjustable' as const,
  )
}
