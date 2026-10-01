'use client'
import { useSyncExternalStore } from 'react'
import type { ShowerHoseNode } from './schema'
let style: ShowerHoseNode['style'] = 'smooth'
const listeners = new Set<() => void>()
export const setShowerHoseStyle = (next: ShowerHoseNode['style']) => {
  style = next
  for (const listener of listeners) listener()
}
export const useShowerHoseStyle = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => style,
    () => 'smooth' as const,
  )

let stage = 'Click a supply outlet, then a mounted handset.'
const stageListeners = new Set<() => void>()
export const setShowerHoseStage = (next: string) => {
  stage = next
  for (const l of stageListeners) l()
}
export const useShowerHoseStage = () =>
  useSyncExternalStore(
    (l) => {
      stageListeners.add(l)
      return () => {
        stageListeners.delete(l)
      }
    },
    () => stage,
    () => stage,
  )
