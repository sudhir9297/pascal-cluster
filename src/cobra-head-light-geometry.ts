import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
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
  const poleRadius = Math.min(0.13, 0.08 + height * 0.0035)
  const armRadius = Math.max(0.05, poleRadius * 0.58)
  const armY = height - 0.42
  return {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTopY: height - 0.55,
    armY,
    socketLength: 0.24,
    socketRadius: armRadius * 1.25,
    fixtureStartX: armLength + 0.2,
    fixtureLength: 0.98,
    fixtureWidth: 0.48,
    fixtureTopY: armY + 0.16,
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

/** Bulky, faceted housing used by older cobra-head roadway luminaires. */
export function buildCobraHeadHousingGeometry(layout: CobraHeadLightLayout): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  const sections: Section[] = [
    { x: 0, top: 0.08, bottom: -0.08, halfWidth: width * 0.34 },
    { x: length * 0.18, top: 0.16, bottom: -0.13, halfWidth: width * 0.5 },
    { x: length * 0.72, top: 0.1, bottom: -0.17, halfWidth: width * 0.48 },
    { x: length, top: -0.02, bottom: -0.12, halfWidth: width * 0.31 },
  ]
  const positions: number[] = []
  for (let index = 0; index < sections.length - 1; index += 1) {
    const a = sections[index]!
    const b = sections[index + 1]!
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

export function buildCobraHeadLensGeometry(layout: CobraHeadLightLayout): BufferGeometry {
  const { fixtureLength: length, fixtureWidth: width } = layout
  const positions: number[] = []
  const rearX = length * 0.2
  const frontX = length * 0.82
  const rearY = -0.11
  const frontY = -0.16
  const rearHalfWidth = width * 0.39
  const frontHalfWidth = width * 0.27
  pushQuad(
    positions,
    point(rearX, rearY, rearHalfWidth),
    point(rearX, rearY, -rearHalfWidth),
    point(frontX, frontY, -frontHalfWidth),
    point(frontX, frontY, frontHalfWidth),
  )
  return finishGeometry(positions)
}
