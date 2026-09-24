import { CubicBezierCurve3, CurvePath, Vector3 } from 'three'
import type { HeritageCrookLightNode } from './schema'

export type HeritageCrookLightLayout = {
  height: number
  armReach: number
  baseRadius: number
  poleBottomRadius: number
  poleTopRadius: number
  straightPoleTopY: number
  armEndY: number
  armRadius: number
  hangerLength: number
  lampCenterY: number
  lensRadius: number
  lensHeight: number
}

/** Shared dimensions for the Bishop's Crook pole and pendant lamp. */
export function resolveHeritageCrookLightLayout(
  node: HeritageCrookLightNode,
): HeritageCrookLightLayout {
  const height = Math.max(3, Math.min(7, node.height ?? 4.5))
  const armReach = Math.max(0.5, Math.min(1.5, node.armReach ?? 0.9))
  const poleBottomRadius = Math.min(0.14, 0.105 + height * 0.004)
  const lensHeight = 0.46
  return {
    height,
    armReach,
    baseRadius: 0.24,
    poleBottomRadius,
    poleTopRadius: poleBottomRadius * 0.64,
    straightPoleTopY: height - 0.48,
    armEndY: height - 0.48,
    armRadius: Math.max(0.038, poleBottomRadius * 0.42),
    hangerLength: 0.16,
    lampCenterY: height - 0.48 - 0.16 - lensHeight * 0.57,
    lensRadius: 0.19,
    lensHeight,
  }
}

/** Curve paths used by both the renderer and geometry regression tests. */
export function buildHeritageCrookCurves(layout: HeritageCrookLightLayout) {
  const { armEndY, armReach, height, straightPoleTopY } = layout
  const start = new Vector3(0, straightPoleTopY, 0)
  const crown = new Vector3(armReach * 0.5, height, 0)
  const end = new Vector3(armReach, armEndY, 0)
  const crookCurve = new CurvePath<Vector3>()
  crookCurve.add(
    new CubicBezierCurve3(
      start,
      new Vector3(0, height - 0.17, 0),
      new Vector3(armReach * 0.16, height, 0),
      crown,
    ),
  )
  crookCurve.add(
    new CubicBezierCurve3(
      crown,
      new Vector3(armReach * 0.84, height, 0),
      new Vector3(armReach, height - 0.17, 0),
      end,
    ),
  )
  const braceEnd = crookCurve.getPointAt(0.7)
  const braceCurve = new CubicBezierCurve3(
    new Vector3(0, height - 0.7, 0),
    new Vector3(armReach * 0.16, height - 0.5, 0),
    new Vector3(armReach * 0.43, braceEnd.y - 0.1, 0),
    braceEnd,
  )
  return { crookCurve, braceCurve }
}
