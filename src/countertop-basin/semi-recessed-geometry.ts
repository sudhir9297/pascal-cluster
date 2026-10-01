import { drillBasinTapHoles } from './tap-holes'
import { basinDepth, type SemiRecessedBasinNode } from './schema'
import { buildBasinShell, type BasinRing } from './uv'

/** Round-front designs have a broad, flattened rear for the integrated tap deck. */
export function semiRecessedOutline(shape: SemiRecessedBasinNode['shape'], width: number, depth: number, count = 96): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count, c = Math.cos(angle), s = Math.sin(angle)
    const power = shape === 'rectangle' ? 0.25 : s > 0 ? 0.45 : 1
    return [Math.sign(c) * Math.abs(c) ** power * width / 2, Math.sign(s) * Math.abs(s) ** power * depth / 2]
  })
}
export function semiRecessedDeckDepth(node: SemiRecessedBasinNode) { return Math.min(0.095, basinDepth(node) * 0.24) }
export function semiRecessedDrainZ(node: SemiRecessedBasinNode) { return -semiRecessedDeckDepth(node) / 2 }

/** One closed ceramic shell: apron, rounded rim, integral deck, inner bowl and drain. */
export function buildSemiRecessedShell(node: SemiRecessedBasinNode) {
  const depth = basinDepth(node), t = node.wallThickness, h = node.height, radius = Math.min(t / 2, 0.006)
  const deck = semiRecessedDeckDepth(node), shift = -deck / 2, floor = t * 1.5
  const rings: BasinRing[] = []
  const outer = (w: number, d: number, y: number) => rings.push({ y, points: semiRecessedOutline(node.shape, w, d) })
  const inner = (w: number, d: number, y: number) => rings.push({ y, points: semiRecessedOutline(node.shape, w, d).map(([x, z]) => [x, z + shift]) })
  // A tall, nearly vertical ceramic apron replaces the generic vessel's flared exterior.
  const reduction = node.shape === 'rectangle' ? 0.035 + node.taper * 0.12 : 0.07 + node.taper * 0.18
  const baseW = node.width * (1 - reduction), baseD = depth * (1 - reduction)
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, roundedFoot = Math.sin(Math.min(1, u / 0.3) * Math.PI / 2)
    outer(baseW + (node.width - baseW) * roundedFoot, baseD + (depth - baseD) * roundedFoot, u * (h - radius))
  }
  for (let i = 1; i <= 6; i++) {
    const a = i * Math.PI / 12, inset = radius * (1 - Math.cos(a))
    outer(node.width - inset * 2, depth - inset * 2, h - radius + radius * Math.sin(a))
  }
  const exteriorEnd = rings.length - 1
  const openingW = node.width - t * 2, openingD = depth - deck - t * 2
  const lip = rings.at(-1)!.points
  const mouth = semiRecessedOutline(node.shape, openingW, openingD).map(([x, z]): [number, number] => [x, z + shift])
  for (let i = 1; i <= 6; i++) {
    const u = i / 6
    rings.push({ y: h, points: lip.map(([x, z], j) => [x * (1 - u) + mouth[j]![0] * u, z * (1 - u) + mouth[j]![1] * u]) })
  }
  const deckEnd = rings.length - 1
  const floorW = openingW * (node.shape === 'rectangle' ? 0.65 : 0.55), floorD = openingD * 0.55
  for (let i = 1; i <= 24; i++) {
    const u = i / 24, curve = Math.cos(u * Math.PI / 2)
    inner(floorW + (openingW - floorW) * curve, floorD + (openingD - floorD) * curve, floor + (h - floor) * (1 - u) ** 2)
  }
  const wallEnd = rings.length - 1, floorPoints = rings.at(-1)!.points
  const hole = Array.from({ length: 96 }, (_, i): [number, number] => [Math.cos(i * Math.PI / 48) * node.drainDiameter / 2, Math.sin(i * Math.PI / 48) * node.drainDiameter / 2 + shift])
  for (let i = 1; i <= 8; i++) {
    const u = i / 8
    rings.push({ y: floor - 0.003 * u, points: floorPoints.map(([x, z], j) => [x * (1 - u) + hole[j]![0] * u, z * (1 - u) + hole[j]![1] * u]) })
  }
  const floorEnd = rings.length - 1
  rings.push({ y: 0, points: hole }); outer(baseW, baseD, 0)
  const source = buildBasinShell(rings, [
    { start: 0, end: exteriorEnd, mapping: 'curved' }, { start: exteriorEnd, end: deckEnd, mapping: 'planar' },
    { start: deckEnd, end: wallEnd, mapping: 'curved' }, { start: wallEnd, end: floorEnd, mapping: 'planar' },
    { start: floorEnd, end: floorEnd + 1, mapping: 'curved' }, { start: floorEnd + 1, end: floorEnd + 2, mapping: 'planar' },
  ])
  return drillBasinTapHoles(source, node, h / 2, h + .04)
}
