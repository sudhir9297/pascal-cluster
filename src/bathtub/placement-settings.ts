'use client'
import { useSyncExternalStore } from 'react'
import type { BathtubNode } from './schema'
let shape: BathtubNode['shape'] = 'oval'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function setBathPlacementShape(next: BathtubNode['shape']) {
  shape = next
  for (const listener of listeners) listener()
}
export function useBathPlacementShape() {
  return useSyncExternalStore(
    subscribe,
    () => shape,
    () => 'oval' as const,
  )
}
