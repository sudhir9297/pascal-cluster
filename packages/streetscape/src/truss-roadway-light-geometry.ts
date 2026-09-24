import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { TrussRoadwayLightNode } from './schema'

export type TrussRoadwayLightLayout = {
  height: number
  armLength: number
  braceDepth: number
  poleRadius: number
  poleTopY: number
  upperMountY: number
  lowerMountY: number
  armY: number
  armRadius: number
  braceRadius: number
  trussJointX: number
  trussJointY: number
  socketLength: number
  socketRadius: number
  fixtureStartX: number
  fixtureLength: number
  fixtureWidth: number
  fixtureTopY: number
}

export type TrussRoadwayHousingSection = {
  x: number
  top: number
  bottom: number
  halfWidth: number
}

/** Dimensional layout for a pipe-truss roadway pole and side-entry LED head. */
export function resolveTrussRoadwayLightLayout(
  node: TrussRoadwayLightNode,
): TrussRoadwayLightLayout {
  const height = Math.max(3, node.height ?? 6)
  const armLength = Math.max(0.8, node.armLength ?? 2)
  const braceDepth = Math.max(0.35, Math.min(1.2, node.braceDepth ?? 0.75))
  const poleRadius = Math.min(0.15, 0.09 + height * 0.005)
  const armRadius = Math.max(0.048, poleRadius * 0.46)
  const upperMountY = height - 0.82
  const armY = height - 0.26
  const fixtureLength = 0.96
  return {
    height,
    armLength,
    braceDepth,
    poleRadius,
    poleTopY: height - 0.44,
    upperMountY,
    lowerMountY: upperMountY - braceDepth,
    armY,
    armRadius,
    braceRadius: armRadius * 0.72,
    trussJointX: armLength * 0.74,
    trussJointY: upperMountY + (armY - upperMountY) * 0.82,
    socketLength: 0.24,
    socketRadius: armRadius * 1.18,
    fixtureStartX: armLength + 0.08,
    fixtureLength,
    fixtureWidth: 0.48,
    fixtureTopY: armY + 0.13,
  }
}

export function getTrussRoadwayHousingSections(
  layout: TrussRoadwayLightLayout,
): TrussRoadwayHousingSection[] {
  const length = layout.fixtureLength
  const width = layout.fixtureWidth
  return [
    { x: -0.1, top: 0.055, bottom: -0.045, halfWidth: width * 0.22 },
    { x: 0.05, top: 0.14, bottom: -0.105, halfWidth: width * 0.42 },
    { x: length * 0.34, top: 0.12, bottom: -0.105, halfWidth: width * 0.5 },
    { x: length * 0.82, top: 0.065, bottom: -0.075, halfWidth: width * 0.46 },
    { x: length, top: 0.018, bottom: -0.05, halfWidth: width * 0.32 },
  ]
}

function buildChamferedLoft(
  sections: readonly TrussRoadwayHousingSection[],
  bevel: number,
): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const ringSize = 8

  for (const section of sections) {
    const sectionHeight = section.top - section.bottom
    const b = Math.min(bevel, section.halfWidth * 0.32, sectionHeight * 0.32)
    const ring = [
      [section.top - b, -section.halfWidth],
      [section.top, -section.halfWidth + b],
      [section.top, section.halfWidth - b],
      [section.top - b, section.halfWidth],
      [section.bottom + b, section.halfWidth],
      [section.bottom, section.halfWidth - b],
      [section.bottom, -section.halfWidth + b],
      [section.bottom + b, -section.halfWidth],
    ]
    for (const [y, z] of ring) positions.push(section.x, y ?? 0, z ?? 0)
  }

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    const current = sectionIndex * ringSize
    const next = current + ringSize
    for (let ringIndex = 0; ringIndex < ringSize; ringIndex += 1) {
      const following = (ringIndex + 1) % ringSize
      indices.push(
        current + ringIndex,
        next + ringIndex,
        next + following,
        current + ringIndex,
        next + following,
        current + following,
      )
    }
  }

  for (let index = 1; index < ringSize - 1; index += 1) {
    indices.push(0, index + 1, index)
    const end = (sections.length - 1) * ringSize
    indices.push(end, end + index, end + index + 1)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Compact die-cast shell designed specifically for the truss assembly. */
export function buildTrussRoadwayHousingGeometry(
  layout: TrussRoadwayLightLayout,
): BufferGeometry {
  return buildChamferedLoft(getTrussRoadwayHousingSections(layout), 0.024)
}

/** Shallow recessed full-cutoff optic window. */
export function buildTrussRoadwayLensGeometry(
  layout: TrussRoadwayLightLayout,
): BufferGeometry {
  const length = layout.fixtureLength
  const width = layout.fixtureWidth
  return buildChamferedLoft(
    [
      { x: length * 0.34, top: -0.108, bottom: -0.13, halfWidth: width * 0.34 },
      { x: length * 0.42, top: -0.109, bottom: -0.136, halfWidth: width * 0.39 },
      { x: length * 0.84, top: -0.077, bottom: -0.104, halfWidth: width * 0.33 },
      { x: length * 0.9, top: -0.07, bottom: -0.096, halfWidth: width * 0.27 },
    ],
    0.009,
  )
}
