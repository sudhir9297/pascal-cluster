import type { AnyNode } from '@pascal-app/core'
import { isBasinKind, WALL_HUNG_BASIN, FULL_PEDESTAL_BASIN, HALF_PEDESTAL_BASIN } from '../countertop-basin/schema'
import { FREESTANDING_VANITY, WALL_MOUNTED_VANITY, CORNER_VANITY } from '../freestanding-vanity/schema'
import { TAP } from '../taps/schema'
import { tapOccupancySlot } from '../countertop-basin/tap-attachment'

export type WashAreaStep = 'vanity' | 'basin' | 'tap' | 'complete'
export type WashAreaFlow = {
  step: WashAreaStep
  withoutVanity: boolean
  vanityId: string | null
  basinId: string | null
}
export const emptyWashArea: WashAreaFlow = { step: 'vanity', withoutVanity: false, vanityId: null, basinId: null }
export const washAreaMetadataKey = 'bathSpaceWashArea'

export function readWashArea(value: unknown): WashAreaFlow {
  if (!value || typeof value !== 'object') return { ...emptyWashArea }
  const flow = value as Partial<WashAreaFlow>
  if (!['vanity', 'basin', 'tap', 'complete'].includes(flow.step ?? '') || typeof flow.withoutVanity !== 'boolean') return { ...emptyWashArea }
  return { step: flow.step!, withoutVanity: flow.withoutVanity, vanityId: typeof flow.vanityId === 'string' ? flow.vanityId : null, basinId: typeof flow.basinId === 'string' ? flow.basinId : null }
}

export function washAreaTap(flow: WashAreaFlow, nodes: Readonly<Record<string, AnyNode>>) {
  return Object.values(nodes).find(node => String(node.type) === TAP && tapOccupancySlot(node)?.hostId === flow.basinId)
}

export function reconcileWashArea(flow: WashAreaFlow, nodes: Readonly<Record<string, AnyNode>>): WashAreaFlow {
  if (!flow.withoutVanity && (!flow.vanityId || !nodes[flow.vanityId])) return { ...emptyWashArea }
  if (!flow.basinId || !nodes[flow.basinId]) return { ...flow, step: flow.step === 'vanity' ? 'vanity' : 'basin', basinId: null }
  if (flow.step === 'complete' && !washAreaTap(flow, nodes)) return { ...flow, step: 'tap' }
  return flow
}

export function acceptWashAreaPlacement(flow: WashAreaFlow, node: AnyNode): WashAreaFlow | null {
  if (flow.step === 'vanity' && [FREESTANDING_VANITY, WALL_MOUNTED_VANITY, CORNER_VANITY].includes(String(node.type))) return { ...flow, vanityId: node.id, basinId: null, step: 'basin' }
  if (flow.step === 'basin' && isBasinKind(String(node.type))) {
    const wallBasin = [WALL_HUNG_BASIN, FULL_PEDESTAL_BASIN, HALF_PEDESTAL_BASIN].includes(String(node.type))
    if (flow.withoutVanity ? !wallBasin : node.parentId !== flow.vanityId) return null
    return { ...flow, basinId: node.id, step: 'tap' }
  }
  if (flow.step === 'tap' && String(node.type) === TAP && tapOccupancySlot(node)?.hostId === flow.basinId) return { ...flow, step: 'complete' }
  return null
}
