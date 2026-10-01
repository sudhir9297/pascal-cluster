'use client'
import { useSyncExternalStore } from 'react'
import { wallSpoutPresets } from './schema'
export type SpoutPresetId = (typeof wallSpoutPresets)[number]['id']
let preset: SpoutPresetId = 'round'
const listeners = new Set<() => void>()
export const setWallSpoutPreset = (next: SpoutPresetId) => {
  preset = next
  for (const l of listeners) l()
}
export const useWallSpoutPreset = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => preset,
    () => 'round' as const,
  )
