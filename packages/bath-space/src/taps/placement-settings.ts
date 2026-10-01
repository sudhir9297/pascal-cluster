'use client'
import { useSyncExternalStore } from 'react'
import type { TapPresetId } from './presets'
let presetId: TapPresetId = 'tap-001'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setTapPlacementPreset(next: TapPresetId) { presetId = next; for (const listener of listeners) listener() }
export function useTapPlacementPreset() { return useSyncExternalStore(subscribe, () => presetId, () => 'tap-001' as const) }
