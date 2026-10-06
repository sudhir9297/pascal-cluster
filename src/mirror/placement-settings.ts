'use client'
import { useSyncExternalStore } from 'react'
import type { MirrorNode } from './schema'
let style: MirrorNode['shape'] = 'rectangle'
const listeners = new Set<() => void>()
export function setMirrorPlacementShape(next: MirrorNode['shape']) {
  style = next
  for (const listener of listeners) listener()
}
export function useMirrorPlacementShape() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'rectangle' as const,
  )
}
