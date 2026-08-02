import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { CobraHeadLightNode } from './schema'

export type CobraHeadLightLayout = {
  height: number
  armLength: number
  poleRadius: number
  armRadius: number
  poleTopY: number
  armY: number
  socketLength: number
  socketRadius: number
  fixtureStartX: number
  fixtureLength: number
  fixtureWidth: number
  fixtureTopY: number
}

export function resolveCobraHeadLightLayout(
  node: Pick<CobraHeadLightNode, 'height' | 'armLength'>,
): CobraHeadLightLayout {
  const height = Math.max(4, Math.min(14, node.height ?? 7.5))
  const armLength = Math.max(0.5, Math.min(3.5, node.armLength ?? 1.25))
  const poleRadius = Math.min(0.135, 0.082 + height * 0.0038)
  const armRadius = Math.max(0.052, poleRadius * 0.57)
  const armY = height - 0.12
  const fixtureLength = 1.14
  return {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTopY: height - 0.72,
    armY,
    socketLength: 0.16,
    socketRadius: armRadius * 1.1,
    fixtureStartX: armLength + 0.06,
    fixtureLength,
    fixtureWidth: 0.56,
    fixtureTopY: armY + 0.135,
  }
}

type Section = {
  x: number
  top: number
  bottom: number
  halfWidth: number
}

/**
 * Lofts rounded elliptical sections along X. The varied top and bottom radii
 * let the fixture keep the characteristic deep lens without becoming faceted.
 */
function signedPower(value: number, power: number): number {
  return Math.sign(value) * Math.abs(value) ** power
}

function buildRoundedLoft(
  sections: Section[],
  radialSegments = 24,
  profilePower = 0.5,
): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []

  for (const section of sections) {
    const centerY = (section.top + section.bottom) / 2
    const halfHeight = (section.top - section.bottom) / 2
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2
      positions.push(
        section.x,
        centerY + signedPower(Math.cos(angle), profilePower) * halfHeight,
        signedPower(Math.sin(angle), profilePower) * section.halfWidth,
      )
    }
  }

  for (let section = 0; section < sections.length - 1; section += 1) {
    const nextSection = section + 1
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments
      const a = section * radialSegments + segment
      const b = section * radialSegments + nextSegment
      const c = nextSection * radialSegments + nextSegment
      const d = nextSection * radialSegments + segment
      indices.push(a, b, c, a, c, d)
    }
  }

  const rearCenter = positions.length / 3
  const rear = sections[0]!
  positions.push(rear.x, (rear.top + rear.bottom) / 2, 0)
  const frontCenter = positions.length / 3
  const front = sections[sections.length - 1]!
  positions.push(front.x, (front.top + front.bottom) / 2, 0)
  const frontOffset = (sections.length - 1) * radialSegments

  for (let segment = 0; segment < radialSegments; segment += 1) {
    const nextSegment = (segment + 1) % radialSegments
    indices.push(rearCenter, nextSegment, segment)
    indices.push(frontCenter, frontOffset + segment, frontOffset + nextSegment)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Smooth die-cast shell with the broad shoulder and tapered nose of an HID cobrahead. */
export function buildCobraHeadHousingGeometry(layout: CobraHeadLightLayout): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  return buildRoundedLoft([
    { x: -0.09, top: 0.06, bottom: -0.06, halfWidth: 0.065 },
    { x: 0, top: 0.085, bottom: -0.07, halfWidth: width * 0.28 },
    { x: length * 0.16, top: 0.13, bottom: -0.1, halfWidth: width * 0.48 },
    { x: length * 0.5, top: 0.135, bottom: -0.11, halfWidth: width * 0.5 },
    { x: length * 0.78, top: 0.09, bottom: -0.105, halfWidth: width * 0.42 },
    { x: length * 0.94, top: 0.035, bottom: -0.075, halfWidth: width * 0.24 },
    { x: length, top: -0.01, bottom: -0.035, halfWidth: width * 0.09 },
  ], 28, 0.5)
}

/** A closed, gently dropped prismatic lens rather than a paper-thin luminous plane. */
export function buildCobraHeadLensGeometry(layout: CobraHeadLightLayout): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  return buildRoundedLoft([
    { x: length * 0.18, top: -0.08, bottom: -0.105, halfWidth: width * 0.3 },
    { x: length * 0.28, top: -0.095, bottom: -0.135, halfWidth: width * 0.43 },
    { x: length * 0.68, top: -0.105, bottom: -0.15, halfWidth: width * 0.4 },
    { x: length * 0.88, top: -0.075, bottom: -0.11, halfWidth: width * 0.23 },
  ], 22, 0.58)
}
