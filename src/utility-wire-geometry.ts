import { QuadraticBezierCurve3, Vector3 } from 'three'
import type { UtilityPoleNode, UtilityWireSpanNode } from './schema'
import {
  resolveUtilityPoleAttachmentPoint,
  type UtilityPoleWireAttachmentId,
} from './utility-pole-geometry'

export const UTILITY_WIRE_PHASE_IDS: readonly UtilityPoleWireAttachmentId[] = [
  'phase-left',
  'phase-center',
  'phase-right',
]

export const UTILITY_WIRE_CONDUCTOR_IDS: readonly UtilityPoleWireAttachmentId[] = [
  ...UTILITY_WIRE_PHASE_IDS,
  'neutral',
]

export type UtilityPolePlacement = {
  node: UtilityPoleNode
  position?: readonly [number, number, number]
  rotationY?: number
}

export type UtilityConductorCurve = {
  id: UtilityPoleWireAttachmentId
  curve: QuadraticBezierCurve3
}

export function buildUtilityConductorCurves(
  span: UtilityWireSpanNode,
  from: UtilityPolePlacement,
  to: UtilityPolePlacement,
): UtilityConductorCurve[] {
  return UTILITY_WIRE_CONDUCTOR_IDS.map((id) => {
    const start = new Vector3(
      ...resolveUtilityPoleAttachmentPoint(
        from.node,
        id,
        from.position,
        from.rotationY,
      ),
    )
    const end = new Vector3(
      ...resolveUtilityPoleAttachmentPoint(to.node, id, to.position, to.rotationY),
    )
    const horizontalDistance = Math.hypot(end.x - start.x, end.z - start.z)
    const sag = Math.min(2.2, Math.max(0.18, horizontalDistance * span.sagRatio))
    const control = start.clone().add(end).multiplyScalar(0.5)
    control.y -= sag * 2
    return { id, curve: new QuadraticBezierCurve3(start, control, end) }
  })
}
