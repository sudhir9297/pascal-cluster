import { Euler, Quaternion, ShapeUtils, Vector2, Vector3 } from 'three'
import { resolvePoolPolygon, type PoolNode } from '../core/schema'
import { getPoolDepthResolver } from './depth-profile'

// Planning assumptions and source limits: docs/pool-fitting-layout.md.
export const POOL_FITTING_RULES = {
  skimmerArea: 25,
  inletArea: 27.870912,
  inletPerimeter: 6.096,
  drainSeparation: 0.9144,
  wallClearance: 0.65,
  inletSkimmerClearance: 1.524,
} as const

type Point = [number, number]
export type WallStation = { wallIndex: number; wallT: number; point: Point }

const metricCache = new Map<string, { area: number; volume: number; perimeter: number }>()

function metricKey(pool: PoolNode) {
  return JSON.stringify([pool.polygon, pool.length, pool.width, pool.floorProfile, pool.depth,
    pool.shallowDepth, pool.deepDepth, pool.slopeStart, pool.slopeEnd, pool.designWaterElevation])
}

/** Summary controls never run the boundary/floor placement search. */
export function getPoolFittingSummary(pool: PoolNode) {
  const key = metricKey(pool)
  let metrics = metricCache.get(key)
  if (!metrics) {
    const polygon = resolvePoolPolygon(pool)
    const points = polygon.map(([x, z]) => new Vector2(x, z))
    const triangles = ShapeUtils.triangulateShape(points, [])
    const area = Math.abs(ShapeUtils.area(points))
    const depth = getPoolDepthResolver(pool, polygon)
    // Triangle-centroid quadrature estimates water volume for sloped floors.
    const volume = triangles.reduce((sum, triangle) => {
      const vertices = triangle.map((i) => points[i]!)
      const x = vertices.reduce((total, point) => total + point.x, 0) / 3
      return sum + Math.abs(ShapeUtils.area(vertices)) * Math.max(0, depth.depthAtX(x) + pool.designWaterElevation)
    }, 0)
    const lengths = polygon.map((start, i) => {
      const end = polygon[(i + 1) % polygon.length]!
      return Math.hypot(end[0] - start[0], end[1] - start[1])
    })
    const perimeter = lengths.reduce((sum, length) => sum + length, 0)
    metrics = { area, volume, perimeter }
    if (metricCache.size >= 64) metricCache.delete(metricCache.keys().next().value!)
    metricCache.set(key, metrics)
  }
  const { area, volume, perimeter } = metrics
  const flow = pool.fittingFlowRate > 0 ? pool.fittingFlowRate : volume / pool.turnoverHours
  const counts = {
    skimmer: Math.max(1, Math.ceil(area / POOL_FITTING_RULES.skimmerArea)),
    inlet: Math.max(2, Math.ceil(area / POOL_FITTING_RULES.inletArea), Math.ceil(perimeter / POOL_FITTING_RULES.inletPerimeter)),
    drain: Math.max(2, Math.ceil(flow / pool.drainFlowCapacity) + 1),
    stair: 1,
  }
  return { ...metrics, flow, counts }
}

function computePoolFittings(pool: PoolNode) {
  const { area, perimeter, volume, flow, counts } = getPoolFittingSummary(pool)
  const polygon = resolvePoolPolygon(pool)
  const points = polygon.map(([x, z]) => new Vector2(x, z))
  const depth = getPoolDepthResolver(pool, polygon)
  const lengths = polygon.map((start, i) => {
    const end = polygon[(i + 1) % polygon.length]!
    return Math.hypot(end[0] - start[0], end[1] - start[1])
  })
  const minX = Math.min(...polygon.map(([x]) => x))
  const maxX = Math.max(...polygon.map(([x]) => x))
  const minZ = Math.min(...polygon.map(([, z]) => z))
  const maxZ = Math.max(...polygon.map(([, z]) => z))
  const at = (distance: number): WallStation => {
    let remaining = ((distance % perimeter) + perimeter) % perimeter
    for (let i = 0; i < lengths.length; i++) {
      const length = lengths[i]!
      if (length <= 1e-9) continue
      if (remaining <= length || i === lengths.length - 1) {
        const wallT = Math.min(1, remaining / length)
        const start = polygon[i]!
        const end = polygon[(i + 1) % polygon.length]!
        return { wallIndex: i, wallT, point: [start[0] + (end[0] - start[0]) * wallT, start[1] + (end[1] - start[1]) * wallT] }
      }
      remaining -= length
    }
    return { wallIndex: 0, wallT: 0.5, point: polygon[0]! }
  }
  const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const occupied: Point[] = []
  const issues: string[] = []
  // Sample by physical perimeter, so curved outlines do not concentrate fittings
  // on a single tessellated edge. Targets are fitted to the actual boundary.
  const sampleCount = Math.max(64, Math.min(4096, Math.ceil(perimeter / 0.1)))
  const boundary = Array.from({ length: sampleCount }, (_, i) => at((i + 0.5) * perimeter / sampleCount))
  const skimmerPoints: Point[] = []
  const alongX = counts.skimmer >= 3
    ? maxX - minX >= maxZ - minZ
    : maxZ - minZ < counts.skimmer * POOL_FITTING_RULES.wallClearance
  // Group on outward-facing portions of the chosen side, including curved walls.
  // Do not spill a crowded group onto neighboring/opposite walls.
  const winding = ShapeUtils.area(points) >= 0 ? 1 : -1
  const sideAxis = alongX ? 1 : 0
  const sideMid = alongX ? (minZ + maxZ) / 2 : (minX + maxX) / 2
  const onSide = (station: WallStation, sign: number) => {
    const a = polygon[station.wallIndex]!
    const b = polygon[(station.wallIndex + 1) % polygon.length]!
    const dx = b[0] - a[0], dz = b[1] - a[1]
    const outward = alongX ? -dx * winding : dz * winding
    return outward * sign > Math.hypot(dx, dz) * 0.5 && (station.point[sideAxis]! - sideMid) * sign > 0
  }
  const placeNear = (target: Point, side = 0): WallStation | null => {
    let best: WallStation | null = null
    let bestDistance = Infinity
    const projections: WallStation[] = polygon.map((a, wallIndex) => {
      const b = polygon[(wallIndex + 1) % polygon.length]!
      const dx = b[0] - a[0], dz = b[1] - a[1]
      const wallT = Math.max(0, Math.min(1, ((target[0] - a[0]) * dx + (target[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)))
      return { wallIndex, wallT, point: [a[0] + wallT * dx, a[1] + wallT * dz] }
    })
    for (const candidate of [...projections, ...boundary]) {
      if (side === 1 && !onSide(candidate, side)) continue
      if (side < 0 && skimmerPoints.some((point) => distance(point, candidate.point) < POOL_FITTING_RULES.inletSkimmerClearance)) continue
      const score = distance(candidate.point, target)
      if (score >= bestDistance || occupied.some((point) => distance(point, candidate.point) < POOL_FITTING_RULES.wallClearance)) continue
      best = candidate
      bestDistance = score
    }
    if (best) occupied.push(best.point)
    return best
  }
  const skimmers: WallStation[] = []
  const inlets: WallStation[] = []
  for (let i = 0; i < counts.skimmer; i++) {
    const t = (i + 0.5) / counts.skimmer
    const station = placeNear(alongX ? [minX + (maxX - minX) * t, maxZ] : [maxX, minZ + (maxZ - minZ) * t], 1)
    if (station) { skimmers.push(station); skimmerPoints.push(station.point) }
  }
  for (let i = 0; i < counts.inlet; i++) {
    // Returns are spread around the complete perimeter to promote uniform
    // circulation. Skimmers remain grouped on their designated wall.
    const station = placeNear(at((i + 0.5) * perimeter / counts.inlet).point, -1)
    if (station) inlets.push(station)
  }
  // Access does not displace the two circulation groups.
  const stair = placeNear([minX + (maxX - minX) * 0.2, minZ])
  if (skimmers.length !== counts.skimmer || inlets.length < counts.inlet || !stair) {
    issues.push('The selected sides cannot fit all planned fittings at their required clearance. Adjust the outline or use manual placement.')
  }

  const inside = (point: Point) => {
    let hits = false
    let wallDistance = Infinity
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!
      const b = polygon[(i + 1) % polygon.length]!
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) hits = !hits
      const dx = b[0] - a[0], dz = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)))
      wallDistance = Math.min(wallDistance, distance(point, [a[0] + t * dx, a[1] + t * dz]))
    }
    return hits && wallDistance >= 0.11 + pool.coveRadius + 0.05
  }
  const floorCandidates: Point[] = []
  const divisions = 64
  for (let x = 0; x < divisions; x++) {
    for (let z = 0; z < divisions; z++) {
      const point: Point = [minX + (x + 0.5) / divisions * (maxX - minX), minZ + (z + 0.5) / divisions * (maxZ - minZ)]
      if (inside(point)) floorCandidates.push(point)
    }
  }
  const deepStart = depth.profile.kind === 'shallow-to-deep' ? depth.profile.slopeEnd / 100 : 0
  const target: Point = [pool.floorProfile === 'flat' ? (minX + maxX) / 2 : minX + (deepStart + 1) / 2 * (maxX - minX), (minZ + maxZ) / 2]
  const centers = [target, ...floorCandidates]
  centers.sort((a, b) => depth.depthAtX(b[0]) - depth.depthAtX(a[0]) || distance(a, target) - distance(b, target))
  // A centered, evenly spaced row replaces greedy point-by-point placement.
  // One metre is a layout choice above the sourced 0.9144 m minimum.
  const spacing = 1
  const preferredAxis = pool.floorProfile === 'flat' && maxX - minX >= maxZ - minZ ? 0 : 1
  let drains: Point[] = []
  for (const center of centers) {
    for (const axis of [preferredAxis, 1 - preferredAxis]) {
      const row: Point[] = Array.from({ length: counts.drain }, (_, i) => {
        const offset = (i - (counts.drain - 1) / 2) * spacing
        return axis === 0 ? [center[0] + offset, center[1]] : [center[0], center[1] + offset]
      })
      if (!row.every((point) => inside(point) && Math.abs(depth.depthAtX(point[0]) - depth.depthAtX(center[0])) < 1e-8)) continue
      // The whole row must stay in one basin region, not cross a concave notch.
      const first = row[0]!, last = row[row.length - 1]!
      const samples = Math.ceil(distance(first, last) / 0.15)
      let valid = true
      for (let i = 0; i <= samples; i++) {
        const t = i / samples
        if (!inside([first[0] + t * (last[0] - first[0]), first[1] + t * (last[1] - first[1])])) { valid = false; break }
      }
      if (valid) { drains = row; break }
    }
    if (drains.length) break
  }
  if (drains.length !== counts.drain) {
    // Never silently emit a single suction outlet or shrink the minimum spacing.
    drains.length = 0
    issues.push(`Cannot fit a straight row of ${counts.drain} drains at 1 m spacing. Automatic drains are omitted; revise the pool or suction design.`)
  }
  return { area, perimeter, volume, flow, counts, skimmers, inlets, drains, stair, issues }
}

// Water appearance and transform edits do not require another geometric search.
const layoutCache = new Map<string, ReturnType<typeof computePoolFittings>>()
export function planPoolFittings(pool: PoolNode) {
  const key = JSON.stringify([
    pool.polygon, pool.length, pool.width, pool.floorProfile, pool.depth,
    pool.shallowDepth, pool.deepDepth, pool.slopeStart, pool.slopeEnd,
    pool.coveRadius, getPoolFittingSummary(pool).counts,
  ])
  const cached = layoutCache.get(key)
  if (cached) return { ...cached, ...getPoolFittingSummary(pool) }
  const layout = computePoolFittings(pool)
  if (layoutCache.size >= 32) layoutCache.delete(layoutCache.keys().next().value!)
  layoutCache.set(key, layout)
  return layout
}

/** Check placed stations in linear/quadratic fitting count, without searching a new layout. */
export function placedPoolFittingIssues(pool: PoolNode, values: readonly unknown[]) {
  const polygon = resolvePoolPolygon(pool)
  const fittings = values.flatMap(value => {
    if (!value || typeof value !== 'object') return []
    const node = value as { type?: string; position?: Point | [number, number, number]; parentId?: string; wallIndex?: number; wallT?: number }
    if (!['pool:skimmer', 'pool:inlet', 'pool:drain'].includes(node.type ?? '')) return []
    if (node.type !== 'pool:drain' && node.wallIndex !== undefined && node.wallT !== undefined) {
      const a = polygon[node.wallIndex], b = polygon[(node.wallIndex + 1) % polygon.length]
      if (a && b) return [{ type: node.type, point: [a[0] + (b[0] - a[0]) * node.wallT, a[1] + (b[1] - a[1]) * node.wallT] as Point }]
    }
    if (!node.position || node.position.length !== 3) return []
    const point = new Vector3(...node.position)
    if (node.parentId !== pool.id) point.sub(new Vector3(...pool.position)).applyQuaternion(new Quaternion().setFromEuler(new Euler(...pool.rotation)).invert())
    return [{ type: node.type, point: [point.x, point.z] as Point }]
  })
  const issues = new Set<string>()
  for (let i = 0; i < fittings.length; i++) for (let j = i + 1; j < fittings.length; j++) {
    const a = fittings[i]!, b = fittings[j]!
    const distance = Math.hypot(a.point[0] - b.point[0], a.point[1] - b.point[1])
    if (a.type === 'pool:drain' || b.type === 'pool:drain') {
      if (a.type === b.type && distance < POOL_FITTING_RULES.drainSeparation) issues.add('Placed drains are too close together.')
      continue
    }
    const separation = a.type === b.type ? POOL_FITTING_RULES.wallClearance : POOL_FITTING_RULES.inletSkimmerClearance
    if (distance < separation) issues.add('Placed wall fittings need more clearance.')
  }
  return [...issues]
}
