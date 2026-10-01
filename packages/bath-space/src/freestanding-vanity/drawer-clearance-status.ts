'use client'
import { useSyncExternalStore } from 'react'

const statuses = new Map<string, string>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setDrawerClearanceStatus(id: string, blocked: readonly string[]) {
  const message = blocked.length ? `${blocked.length} storage front${blocked.length === 1 ? '' : 's'} cannot open because the basin leaves insufficient clearance. Move or resize the basin, or change the storage layout.` : ''
  if ((statuses.get(id) ?? '') === message) return
  if (message) statuses.set(id, message); else statuses.delete(id)
  for (const listener of listeners) listener()
}
export function useDrawerClearanceStatus(id: string) { return useSyncExternalStore(subscribe, () => statuses.get(id) ?? '', () => '') }
