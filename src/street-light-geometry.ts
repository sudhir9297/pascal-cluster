import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
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

/** Shared dimensional layout for the procedural street-light model and tests. */
export function resolveStreetLightLayout(node: StreetLightNode): StreetLightLayout {
  const height = Math.max(3, node.height ?? 6)
  const armLength = Math.max(0.3, node.armLength ?? 1.2)
  const poleRadius = Math.min(0.115, 0.072 + height * 0.004)
  const armRadius = Math.max(0.045, poleRadius * 0.6)
  const armEndY = height - 0.2
  const socketLength = 0.24
  const fixtureLength = 0.86
  return {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTop: height - 0.58,
    armEndY,
    socketLength,
    socketRadius: armRadius * 1.28,
    fixtureStartX: armLength + socketLength - 0.05,
    fixtureLength,
    fixtureWidth: 0.36,
    fixtureTopY: armEndY + 0.11,
  }
}

type Section = {
  x: number
  top: number
  bottom: number
  halfWidth: number
}

function point(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z)
}

function pushTriangle(positions: number[], a: Vector3, b: Vector3, c: Vector3): void {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

function pushQuad(
  positions: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
): void {
  pushTriangle(positions, a, b, c)
  pushTriangle(positions, a, c, d)
}

function finishGeometry(positions: number[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** A faceted, tapered LED housing authored with its socket at local x=0. */
export function buildLampHousingGeometry(layout: StreetLightLayout): BufferGeometry {
  const length = layout.fixtureLength
  const width = layout.fixtureWidth
  const sections: Section[] = [
    { x: 0, top: 0.075, bottom: -0.075, halfWidth: width * 0.34 },
    { x: length * 0.18, top: 0.11, bottom: -0.1, halfWidth: width * 0.5 },
    { x: length, top: 0.015, bottom: -0.145, halfWidth: width * 0.34 },
  ]
  const positions: number[] = []

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = sections[i]!
    const b = sections[i + 1]!
    const atp = point(a.x, a.top, a.halfWidth)
    const atn = point(a.x, a.top, -a.halfWidth)
    const abp = point(a.x, a.bottom, a.halfWidth)
    const abn = point(a.x, a.bottom, -a.halfWidth)
    const btp = point(b.x, b.top, b.halfWidth)
    const btn = point(b.x, b.top, -b.halfWidth)
    const bbp = point(b.x, b.bottom, b.halfWidth)
    const bbn = point(b.x, b.bottom, -b.halfWidth)

    pushQuad(positions, atp, btp, btn, atn)
    pushQuad(positions, abp, abn, bbn, bbp)
    pushQuad(positions, abp, bbp, btp, atp)
    pushQuad(positions, abn, atn, btn, bbn)
  }

  const rear = sections[0]!
  pushQuad(
    positions,
    point(rear.x, rear.top, rear.halfWidth),
    point(rear.x, rear.top, -rear.halfWidth),
    point(rear.x, rear.bottom, -rear.halfWidth),
    point(rear.x, rear.bottom, rear.halfWidth),
  )
  const front = sections[sections.length - 1]!
  pushQuad(
    positions,
    point(front.x, front.top, front.halfWidth),
    point(front.x, front.bottom, front.halfWidth),
    point(front.x, front.bottom, -front.halfWidth),
    point(front.x, front.top, -front.halfWidth),
  )

  return finishGeometry(positions)
}

/** Recessed luminous panel following the tapered underside of the housing. */
export function buildLampLensGeometry(layout: StreetLightLayout): BufferGeometry {
  const length = layout.fixtureLength
  const width = layout.fixtureWidth
  const rearX = length * 0.24
  const frontX = length * 0.84
  const rearY = -0.112
  const frontY = -0.142
  const rearHalfWidth = width * 0.38
  const frontHalfWidth = width * 0.28
  const positions: number[] = []
  pushQuad(
    positions,
    point(rearX, rearY, rearHalfWidth),
    point(rearX, rearY, -rearHalfWidth),
    point(frontX, frontY, -frontHalfWidth),
    point(frontX, frontY, frontHalfWidth),
  )
  return finishGeometry(positions)
}
