import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { HighMastCrownLightNode } from './schema'

export const HIGH_MAST_CROWN_FIXTURE_COUNT = 6

export type HighMastCrownLightLayout = {
  height: number
  crownRadius: number
  carrierRingRadius: number
  carrierY: number
  headFrameY: number
  poleBottomRadius: number
  poleTopRadius: number
  fixtureLength: number
  fixtureWidth: number
  fixtureHeight: number
  fixtureCenterRadius: number
  mountingTubeRadius: number
}

export type HighMastHousingSection = {
  x: number
  top: number
  bottom: number
  halfWidth: number
}

/**
 * Resolve the full high-mast lowering-device layout. `armLength` represents
 * the radius from the mast centreline to each luminaire centre.
 */
export function resolveHighMastCrownLightLayout(
  node: HighMastCrownLightNode,
): HighMastCrownLightLayout {
  const height = Math.max(0.5, node.height ?? 18)
  const crownRadius = Math.max(0.9, node.armLength ?? 1.8)
  const poleTopRadius = Math.min(0.18, 0.11 + height * 0.0028)
  return {
    height,
    crownRadius,
    carrierRingRadius: Math.min(crownRadius * 0.54, crownRadius - 0.42),
    carrierY: height - 0.42,
    headFrameY: height + 0.28,
    poleBottomRadius: Math.min(0.38, poleTopRadius * 2.25),
    poleTopRadius,
    fixtureLength: 0.82,
    fixtureWidth: 0.52,
    fixtureHeight: 0.24,
    fixtureCenterRadius: crownRadius,
    mountingTubeRadius: Math.max(0.038, poleTopRadius * 0.3),
  }
}

export function highMastCrownAngles(
  count = HIGH_MAST_CROWN_FIXTURE_COUNT,
): number[] {
  return Array.from({ length: count }, (_, index) => (index * Math.PI * 2) / count)
}

export function getHighMastHousingSections(
  layout: HighMastCrownLightLayout,
): HighMastHousingSection[] {
  const { fixtureHeight: height, fixtureLength: length, fixtureWidth: width } = layout
  return [
    { x: -length * 0.5, top: height * 0.2, bottom: -height * 0.18, halfWidth: width * 0.25 },
    { x: -length * 0.34, top: height * 0.48, bottom: -height * 0.43, halfWidth: width * 0.46 },
    { x: length * 0.22, top: height * 0.5, bottom: -height * 0.47, halfWidth: width * 0.5 },
    { x: length * 0.45, top: height * 0.28, bottom: -height * 0.38, halfWidth: width * 0.42 },
    { x: length * 0.5, top: height * 0.08, bottom: -height * 0.25, halfWidth: width * 0.3 },
  ]
}

function buildChamferedLoft(
  sections: readonly HighMastHousingSection[],
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

/** Low-profile, die-cast high-output LED housing for the radial crown. */
export function buildHighMastCrownHousingGeometry(
  layout: HighMastCrownLightLayout,
): BufferGeometry {
  return buildChamferedLoft(getHighMastHousingSections(layout), 0.025)
}

/** Recessed full-cutoff optic panel on the underside of the high-mast head. */
export function buildHighMastCrownLensGeometry(
  layout: HighMastCrownLightLayout,
): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  return buildChamferedLoft(
    [
      { x: -length * 0.23, top: -0.132, bottom: -0.156, halfWidth: width * 0.34 },
      { x: -length * 0.14, top: -0.134, bottom: -0.164, halfWidth: width * 0.39 },
      { x: length * 0.34, top: -0.126, bottom: -0.156, halfWidth: width * 0.36 },
      { x: length * 0.4, top: -0.118, bottom: -0.145, halfWidth: width * 0.3 },
    ],
    0.009,
  )
}
