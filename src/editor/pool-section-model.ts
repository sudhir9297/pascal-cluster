import type { PoolNode } from '../core/schema'
import { resolvePoolPolygon } from '../core/schema'
import { getPoolDepthResolver } from '../design/depth-profile'
import type { PoolPoint } from '../core/schema-primitives'

type Point = readonly [number, number]

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function boundaryPoint(points: PoolPoint[], t: number): Point {
  const lengths = points.map((point, index) => {
    const next = points[(index + 1) % points.length]!
    return Math.hypot(next[0] - point[0], next[1] - point[1])
  })
  const perimeter = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = ((t % 1) + 1) % 1 * perimeter
  for (let index = 0; index < points.length; index += 1) {
    const length = lengths[index]!
    if (remaining <= length || index === points.length - 1) {
      const start = points[index]!
      const end = points[(index + 1) % points.length]!
      const fraction = length > 0 ? remaining / length : 0
      return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction]
    }
    remaining -= length
  }
  return points[0]!
}

function polygonPerimeter(points: PoolPoint[]) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!
    return sum + Math.hypot(next[0] - point[0], next[1] - point[1])
  }, 0)
}

export function buildPoolSectionModel(pool: PoolNode) {
  const polygon = resolvePoolPolygon(pool)
  const depth = getPoolDepthResolver(pool, polygon)
  const zs = polygon.map((point) => point[1])
  const minimumZ = Math.min(...zs)
  const maximumZ = Math.max(...zs)
  const length = Math.max(0.001, depth.maximumX - depth.minimumX)
  const width = Math.max(0.001, maximumZ - minimumZ)
  const maximumDepth = depth.profile.kind === 'flat' ? depth.profile.depth : depth.profile.deepDepth
  const scale = depth.profile.kind === 'flat'
    ? 80 / Math.max(1, maximumDepth + pool.floorThickness)
    : 22
  const deckY = 22
  const waterY = clamp(deckY + (pool.finishedDeckElevation - pool.designWaterElevation) * scale, 14, 130)
  const baseDepth = (fraction: number) => depth.depthAtX(depth.minimumX + length * fraction)
  const entryFraction = pool.entryFeature === 'none' ? 0 : Math.min(pool.entryLength, length * 0.6) / length
  const entryEndDepth = baseDepth(entryFraction)
  const entryTopDepth = Math.min(pool.entryWaterDepth, entryEndDepth * 0.8)
  const benchWidth = Math.min(pool.benchWidth, Math.min(pool.length, pool.width) * 0.3)
  const benchFraction = clamp(benchWidth / length, 0, 0.2)
  const benchPoint = boundaryPoint(polygon, pool.benchBoundaryT)
  const benchAtLeft = pool.benchEnabled && (pool.benchStyle === 'perimeter' || benchPoint[0] - depth.minimumX < benchWidth * 1.4)
  const benchAtRight = pool.benchEnabled && (pool.benchStyle === 'perimeter' || depth.maximumX - benchPoint[0] < benchWidth * 1.4)
  const visibleDepth = (fraction: number) => {
    const base = baseDepth(fraction)
    let result = base
    if (entryFraction > 0 && fraction < entryFraction) {
      if (pool.entryFeature === 'steps') {
        const count = clamp(Math.round(pool.stepCount), 2, 6)
        const step = Math.min(count - 1, Math.floor(fraction / entryFraction * count))
        result = entryTopDepth + (entryEndDepth - entryTopDepth) * step / count
      } else if (pool.entryFeature === 'tanning-shelf') {
        result = entryTopDepth
      } else if (pool.entryFeature === 'beach-entry') {
        result = entryEndDepth * fraction / entryFraction
      }
    }
    if (benchAtLeft && fraction <= benchFraction) result = Math.min(result, pool.benchWaterDepth, base * 0.8)
    if (benchAtRight && fraction >= 1 - benchFraction) result = Math.min(result, pool.benchWaterDepth, base * 0.8)
    return result
  }
  const samples = Array.from({ length: 121 }, (_, index) => {
    const fraction = index / 120
    const x = 12 + 576 * fraction
    return { x, baseY: deckY + baseDepth(fraction) * scale, visibleY: deckY + visibleDepth(fraction) * scale }
  })
  const line = (values: { x: number; y: number }[]) => values.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const baseLine = line(samples.map(({ x, baseY }) => ({ x, y: baseY })))
  const visibleLine = line(samples.map(({ x, visibleY }) => ({ x, y: visibleY })))
  const shellBottom = line([...samples].reverse().map(({ x, baseY }) => ({ x, y: baseY + Math.max(3, pool.floorThickness * scale) })))
  const waterBottom = line([...samples].reverse().map(({ x, visibleY }) => ({ x, y: Math.max(waterY, visibleY) })))
  const baseBack = line([...samples].reverse().map(({ x, baseY }) => ({ x, y: baseY })))

  const planScale = Math.min(152 / length, 100 / width)
  const planX = (x: number) => 90 + (x - (depth.minimumX + depth.maximumX) / 2) * planScale
  const planY = (z: number) => 62 + (z - (minimumZ + maximumZ) / 2) * planScale
  const planPath = `${polygon.map(([x, z], index) => `${index ? 'L' : 'M'}${planX(x).toFixed(1)},${planY(z).toFixed(1)}`).join(' ')} Z`
  const perimeter = polygonPerimeter(polygon)
  const benchSpan = Math.min(pool.benchLength, perimeter * 0.8) / perimeter
  const benchPath = pool.benchEnabled && pool.benchStyle === 'end'
    ? line(Array.from({ length: 25 }, (_, index) => {
        const point = boundaryPoint(polygon, pool.benchBoundaryT - benchSpan / 2 + benchSpan * index / 24)
        return { x: planX(point[0]), y: planY(point[1]) }
      }))
    : null

  return {
    planPath,
    planScale,
    planX,
    planY,
    planLeft: planX(depth.minimumX),
    entryPlanWidth: entryFraction * length * planScale,
    benchPath,
    entryFraction,
    entryTopDepth,
    entryEndDepth,
    benchAtLeft,
    benchAtRight,
    benchFraction,
    waterY,
    deckY,
    depthScale: scale,
    baseLine,
    visibleLine,
    shellPath: `${baseLine} ${shellBottom.replace(/^M/, 'L')} Z`,
    waterPath: `M12,${waterY.toFixed(1)} H588 ${waterBottom.replace(/^M/, 'L')} Z`,
    featurePath: `${visibleLine} ${baseBack.replace(/^M/, 'L')} Z`,
    firstDepth: baseDepth(0),
    lastDepth: baseDepth(1),
    length,
    width,
  }
}
