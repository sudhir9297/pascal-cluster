'use client'
import { useSyncExternalStore } from 'react'
import { showerAssemblyPresets } from './schema'
export type AssemblyPresetId = (typeof showerAssemblyPresets)[number]['id']
let selected: AssemblyPresetId = 'round-column'
const listeners = new Set<() => void>()
export const setAssemblyPreset = (id: AssemblyPresetId) => {
  selected = id
  for (const fn of listeners) fn()
}
export const useAssemblyPreset = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => selected,
    () => 'round-column' as const,
  )
