import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { TwinArmMedianLightNode } from './schema'

export type TwinArmMedianLightLayout = {
  height: number
  armLength: number
  poleRadius: number
  armRadius: number
  poleTopY: number
  crownY: number
  armY: number
  socketLength: number
  socketRadius: number
  fixtureStartX: number
  fixtureLength: number
  fixtureWidth: number
  fixtureTopY: number
}

export function resolveTwinArmMedianLightLayout(
  node: Pick<TwinArmMedianLightNode, 'height' | 'armLength'>,
): TwinArmMedianLightLayout {
  const height = Math.max(4, Math.min(16, node.height ?? 6))
  const armLength = Math.max(0.5, Math.min(3, node.armLength ?? 1.35))
  const poleRadius = Math.min(0.15, 0.092 + height * 0.004)
  const armRadius = Math.max(0.05, poleRadius * 0.46)
  const armY = height - 0.1
  const socketLength = 0.12
  const fixtureLength = 1.02
  return {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTopY: height - 0.68,
    crownY: height - 0.58,
    armY,
    socketLength,
    socketRadius: armRadius * 1.08,
    fixtureStartX: armLength + 0.04,
    fixtureLength,
    fixtureWidth: 0.38,
    fixtureTopY: armY + 0.042,
  }
}

type Section = {
  x: number
  top: number
  bottom: number
  halfWidth: number
}

function signedPower(value: number, power: number): number {
  return Math.sign(value) * Math.abs(value) ** power
}

function buildRoundedLoft(
  sections: Section[],
  radialSegments = 20,
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
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments
      const nextSection = section + 1
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

/** Slim, aerodynamic LED housing authored from its inner slip-fitter toward the roadway. */
export function buildTwinArmMedianHousingGeometry(
  layout: TwinArmMedianLightLayout,
): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  return buildRoundedLoft([
    { x: -0.08, top: 0.05, bottom: -0.05, halfWidth: 0.058 },
    { x: 0, top: 0.042, bottom: -0.044, halfWidth: width * 0.22 },
    { x: length * 0.16, top: 0.04, bottom: -0.048, halfWidth: width * 0.45 },
    { x: length * 0.5, top: 0.038, bottom: -0.05, halfWidth: width * 0.5 },
    { x: length * 0.78, top: 0.028, bottom: -0.046, halfWidth: width * 0.42 },
    { x: length * 0.94, top: 0.005, bottom: -0.035, halfWidth: width * 0.25 },
    { x: length, top: -0.012, bottom: -0.025, halfWidth: width * 0.08 },
  ], 24, 0.46)
}

/** Recessed flat optic sized for a modern full-cutoff roadway distribution. */
export function buildTwinArmMedianLensGeometry(
  layout: TwinArmMedianLightLayout,
): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  return buildRoundedLoft([
    { x: length * 0.2, top: -0.046, bottom: -0.068, halfWidth: width * 0.3 },
    { x: length * 0.3, top: -0.052, bottom: -0.088, halfWidth: width * 0.39 },
    { x: length * 0.68, top: -0.053, bottom: -0.092, halfWidth: width * 0.38 },
    { x: length * 0.86, top: -0.044, bottom: -0.075, halfWidth: width * 0.25 },
  ], 20, 0.58)
}
