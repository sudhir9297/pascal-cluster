'use client'
import { useSyncExternalStore } from 'react'
import type { HandShowerNode } from './schema'
let style: HandShowerNode['style'] = 'round'
const listeners = new Set<() => void>()
export const setHandShowerStyle = (next: HandShowerNode['style']) => {
  style = next
  for (const listener of listeners) listener()
}
export const useHandShowerStyle = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'round' as const,
  )
