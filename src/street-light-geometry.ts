import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { StreetLightNode } from './schema'

export type StreetLightLayout = {
  height: number
  armLength: number
  poleRadius: number
  armRadius: number
  poleTop: number
  armEndY: number
  socketLength: number
  socketRadius: number
  fixtureStartX: number
  fixtureLength: number
  fixtureWidth: number
  fixtureTopY: number
}

export type StreetLightHousingSection = {
  x: number
  top: number
  bottom: number
  halfWidth: number
}

/** Shared dimensional layout for the procedural street-light model and tests. */
export function resolveStreetLightLayout(node: StreetLightNode): StreetLightLayout {
  const height = Math.max(3, node.height ?? 6)
  const armLength = Math.max(0.3, node.armLength ?? 1.2)
  const poleRadius = Math.min(0.125, 0.078 + height * 0.0045)
  const armRadius = Math.max(0.052, poleRadius * 0.62)
  const armEndY = height - 0.2
  const fixtureLength = 1.08
  return {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTop: height - 0.68,
    armEndY,
    socketLength: 0.28,
    socketRadius: armRadius * 1.35,
    fixtureStartX: armLength + 0.04,
    fixtureLength,
    fixtureWidth: 0.56,
    fixtureTopY: armEndY + 0.165,
  }
}

export function getStreetLightHousingSections(layout: StreetLightLayout): StreetLightHousingSection[] {
  const length = layout.fixtureLength
  const width = layout.fixtureWidth
  return [
    { x: -0.12, top: 0.075, bottom: -0.045, halfWidth: width * 0.23 },
    { x: 0.07, top: 0.165, bottom: -0.12, halfWidth: width * 0.42 },
    { x: length * 0.3, top: 0.13, bottom: -0.1, halfWidth: width * 0.5 },
    { x: length * 0.86, top: 0.07, bottom: -0.075, halfWidth: width * 0.48 },
    { x: length, top: 0.025, bottom: -0.055, halfWidth: width * 0.36 },
  ]
}

function buildChamferedLoft(sections: readonly StreetLightHousingSection[], bevel: number): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const ringSize = 8

  for (const section of sections) {
    const b = Math.min(bevel, section.halfWidth * 0.35, (section.top - section.bottom) * 0.35)
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

/** A chamfered die-cast shell with a substantial service pod and thin optic nose. */
export function buildLampHousingGeometry(layout: StreetLightLayout): BufferGeometry {
  return buildChamferedLoft(getStreetLightHousingSections(layout), 0.025)
}

/** A shallow full-cutoff optic window recessed below the die-cast perimeter. */
export function buildLampLensGeometry(layout: StreetLightLayout): BufferGeometry {
  const length = layout.fixtureLength
  const width = layout.fixtureWidth
  return buildChamferedLoft(
    [
      { x: length * 0.34, top: -0.106, bottom: -0.132, halfWidth: width * 0.34 },
      { x: length * 0.4, top: -0.108, bottom: -0.137, halfWidth: width * 0.38 },
      { x: length * 0.86, top: -0.078, bottom: -0.108, halfWidth: width * 0.34 },
      { x: length * 0.92, top: -0.072, bottom: -0.098, halfWidth: width * 0.28 },
    ],
    0.01,
  )
}
