import type { AnyNode } from '@pascal-app/core'
import { WALL_HUNG_TOILET } from '../wall-hung-toilet/schema'
import { FLOOR_STANDING_TOILET } from '../floor-standing-toilet/schema'
import { TOILET_PAPER_HOLDER } from '../toilet-paper-holder/schema'
import { toiletFlushControls } from '../flush-control/attachment'
export type ToiletStep = 'toilet' | 'flush' | 'holder' | 'complete'
export type ToiletFlow = {
  step: ToiletStep
  mounting: 'wall' | 'floor' | null
  toiletId: string | null
  holderId: string | null
  holderSkipped: boolean
}
export const toiletMetadataKey = 'bathSpaceToilet'
export const emptyToilet: ToiletFlow = {
  step: 'toilet',
  mounting: null,
  toiletId: null,
  holderId: null,
  holderSkipped: false,
}
export function readToilet(value: unknown): ToiletFlow {
  if (!value || typeof value !== 'object') return { ...emptyToilet }
  const flow = value as Partial<ToiletFlow>
  if (!['toilet', 'flush', 'holder', 'complete'].includes(flow.step ?? ''))
    return { ...emptyToilet }
  return {
    step: flow.step!,
    mounting:
      flow.mounting === 'wall' || flow.mounting === 'floor'
        ? flow.mounting
        : null,
    toiletId: typeof flow.toiletId === 'string' ? flow.toiletId : null,
    holderId: typeof flow.holderId === 'string' ? flow.holderId : null,
    holderSkipped: flow.holderSkipped === true,
  }
}
export function reconcileToilet(
  flow: ToiletFlow,
  nodes: Readonly<Record<string, AnyNode>>,
): ToiletFlow {
  if (
    !flow.toiletId ||
    ![WALL_HUNG_TOILET, FLOOR_STANDING_TOILET].includes(
      String(nodes[flow.toiletId]?.type),
    )
  )
    return { ...emptyToilet, mounting: flow.mounting }
  if (
    flow.step !== 'toilet' &&
    !toiletFlushControls(flow.toiletId, nodes).length
  )
    return { ...flow, step: 'flush' }
  if (
    flow.holderId &&
    String(nodes[flow.holderId]?.type) !== TOILET_PAPER_HOLDER
  )
    return {
      ...flow,
      holderId: null,
      step: flow.step === 'complete' ? 'holder' : flow.step,
    }
  return flow
}
export function acceptToiletPlacement(
  flow: ToiletFlow,
  node: AnyNode,
): ToiletFlow | null {
  const kind = String(node.type)
  if (
    flow.step === 'toilet' &&
    kind ===
      (flow.mounting === 'wall'
        ? WALL_HUNG_TOILET
        : flow.mounting === 'floor'
          ? FLOOR_STANDING_TOILET
          : '')
  )
    return { ...flow, toiletId: node.id, holderId: null, holderSkipped: false }
  if (flow.step === 'holder' && kind === TOILET_PAPER_HOLDER)
    return {
      ...flow,
      holderId: node.id,
      holderSkipped: false,
      step: 'complete',
    }
  return null
}
