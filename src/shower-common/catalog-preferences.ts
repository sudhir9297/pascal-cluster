'use client'

import { useSyncExternalStore } from 'react'

const storageKey = 'pascal:bathspace:catalog:v1'
type Preferences = { recent: string[] }
const empty: Preferences = { recent: [] }
let snapshot = empty
const listeners = new Set<() => void>()

export function parseCatalogPreferences(value: string | null): Preferences {
  try {
    const data: unknown = JSON.parse(value || '{}')
    if (!data || typeof data !== 'object') return empty
    const clean = (input: unknown) => Array.isArray(input)
      ? [...new Set(input.filter((id): id is string => typeof id === 'string' && id.length > 0))] : []
    const record = data as Record<string, unknown>
    return { recent: clean(record.recent).slice(0, 20) }
  } catch { return empty }
}

function emit() { for (const listener of listeners) listener() }
function load() {
  try { snapshot = parseCatalogPreferences(localStorage.getItem(storageKey)) } catch { /* Storage is optional. */ }
}
function storageChanged(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) { load(); emit() }
}
function subscribe(listener: () => void) {
  if (!listeners.size) { load(); window.addEventListener('storage', storageChanged) }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.removeEventListener('storage', storageChanged)
  }
}
function update(next: Preferences) {
  snapshot = next
  try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Keep session preferences when storage is unavailable. */ }
  emit()
}

export function useCatalogPreferences() {
  const preferences = useSyncExternalStore(subscribe, () => snapshot, () => empty)
  return {
    ...preferences,
    remember: (id: string) => update({ ...snapshot, recent: [id, ...snapshot.recent.filter(item => item !== id)].slice(0, 20) }),
  }
}
