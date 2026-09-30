'use client'

import { useSyncExternalStore } from 'react'
import type { VanityPresetId } from './presets'

let presetId: VanityPresetId = 'shaker'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setVanityPlacementPreset(id: VanityPresetId) {
  presetId = id
  for (const listener of listeners) listener()
}

export function useVanityPlacementPreset() {
  return useSyncExternalStore(subscribe, () => presetId, () => 'shaker' as VanityPresetId)
}
