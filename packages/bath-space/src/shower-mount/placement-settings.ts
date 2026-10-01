'use client'
import { useSyncExternalStore } from 'react'
import type { ShowerMountNode } from './schema'
let style: ShowerMountNode['style'] = 'round-holder'
const listeners = new Set<() => void>()
export const setShowerMountStyle = (value: ShowerMountNode['style']) => {
  style = value
  for (const listener of listeners) listener()
}
export const useShowerMountStyle = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'round-holder' as const,
  )
