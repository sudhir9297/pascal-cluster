"use client"
import { useSyncExternalStore } from 'react'
import type { CountertopBasinNode, WallHungBasinNode } from './schema'
let shape: CountertopBasinNode['shape'] = 'oval'
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setBasinPlacementShape(next: CountertopBasinNode['shape']) { shape = next; for (const listener of listeners) listener() }
export function useBasinPlacementShape() { return useSyncExternalStore(subscribe, () => shape, () => 'oval' as const) }

let wallDesign: WallHungBasinNode['wallDesign'] = 'sculpted'
export function setWallBasinPlacementDesign(next: WallHungBasinNode['wallDesign']) { wallDesign = next; for (const listener of listeners) listener() }
export function useWallBasinPlacementDesign() { return useSyncExternalStore(subscribe, () => wallDesign, () => 'sculpted' as const) }
