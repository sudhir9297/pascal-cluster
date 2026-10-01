'use client'
import { useSyncExternalStore } from 'react'
import { showerControlPresets } from './schema'
export type ControlPresetId = (typeof showerControlPresets)[number]['id']
let preset: ControlPresetId = 'round-lever'
const listeners = new Set<() => void>()
export const setShowerControlPreset = (next: ControlPresetId) => {
  preset = next
  for (const l of listeners) l()
}
export const useShowerControlPreset = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => preset,
    () => 'round-lever' as const,
  )
