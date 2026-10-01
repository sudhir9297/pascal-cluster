'use client'
import { useSyncExternalStore } from 'react'
import { bodyJetPresets } from './schema'
export type BodyJetPresetId = (typeof bodyJetPresets)[number]['id']
let preset: BodyJetPresetId = 'round-flush'
const listeners = new Set<() => void>()
export const setBodyJetPreset = (next: BodyJetPresetId) => {
  preset = next
  for (const l of listeners) l()
}
export const useBodyJetPreset = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => preset,
    () => 'round-flush' as const,
  )
