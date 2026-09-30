import { describe, expect, test } from 'bun:test'
import { advanceFreehandPoolStroke, buildFreehandPoolOutline } from './freehand-outline'
import { getPoolPolygonDimensions, isPoolPolygonPlaceable } from './shapes'

type Point = [number, number]

function sampleOutline(outline: Point[], spacing = 0.02): Point[] {
  return outline.flatMap((start, index) => {
    const end = outline[(index + 1) % outline.length]!
    const steps = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / spacing))
    return Array.from({ length: steps }, (_, sample): Point => [
      start[0] + (end[0] - start[0]) * sample / steps,
      start[1] + (end[1] - start[1]) * sample / steps,
    ])
  })
}

function maximumDeviation(source: Point[], target: Point[]): number {
  return Math.max(...sampleOutline(source, 0.01).map((point) => Math.min(...target.map((start, index) => {
    const end = target[(index + 1) % target.length]!
    const dx = end[0] - start[0], dy = end[1] - start[1]
    const squared = dx * dx + dy * dy
    const t = squared === 0 ? 0 : Math.max(0, Math.min(1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / squared))
    return Math.hypot(point[0] - start[0] - t * dx, point[1] - start[1] - t * dy)
  }))))
}

describe('freehand pool outlines', () => {
  test('ignores pointer samples that are too close together', () => {
    const points: Array<[number, number]> = [[0, 0]]
    const result = advanceFreehandPoolStroke(points, [0.01, 0], {
      closeDistance: 0.1,
      sampleDistance: 0.1,
    })

    expect(result.points).toEqual(points)
    expect(result.points).not.toBe(points)
    expect(result.closed).toBeNull()
  })

  test('closes near the first point and creates a usable smooth polygon', () => {
    const raw: Array<[number, number]> = [
      [0, 0], [4, 0], [4, 3], [0, 3], [0.03, 0.02],
    ]
    const outline = buildFreehandPoolOutline(raw, {
      closeDistance: 0.1,
      simplifyTolerance: 0.02,
      segmentsPerSpan: 6,
    })

    expect(outline?.anchors).toHaveLength(4)
    expect(outline?.polygon).toHaveLength(24)
    expect(isPoolPolygonPlaceable(outline!.polygon)).toBe(true)
    expect(getPoolPolygonDimensions(outline!.polygon).length).toBeGreaterThan(3.9)
  })

  test('uses a crossing of the earlier stroke as a valid closure', () => {
    const points: Array<[number, number]> = [[0, 0], [4, 0], [4, 4], [0, 4]]
    const result = advanceFreehandPoolStroke(points, [2, -1], {
      closeDistance: 0.1,
      sampleDistance: 0.1,
    })

    expect(result.closed?.[0]?.[0]).toBeCloseTo(1.6)
    expect(result.closed?.[0]?.[1]).toBeCloseTo(0)
    expect(result.closed).toHaveLength(4)
  })

  test('rejects open and self-intersecting outlines', () => {
    expect(buildFreehandPoolOutline([[0, 0], [4, 0], [4, 4]], {
      closeDistance: 0.1,
      simplifyTolerance: 0.02,
    })).toBeNull()
    expect(buildFreehandPoolOutline([
      [0, 0], [4, 4], [0, 4], [4, 0], [0.01, 0.01],
    ], {
      closeDistance: 0.1,
      simplifyTolerance: 0,
    })).toBeNull()
  })

  test('keeps a narrow inward bend on a large pool while removing redundant samples', () => {
    const drawn: Point[] = [
      [0, 0], [10, 0], [10, 8], [5.2, 8], [5.2, 7.4],
      [4.95, 7.4], [4.95, 8], [0, 8],
    ]
    const raw = sampleOutline(drawn, 0.03)
    const outline = buildFreehandPoolOutline([...raw, raw[0]!], {
      closeDistance: 0.1,
      simplifyTolerance: 0.04,
    })!

    expect(outline).not.toBeNull()
    expect(outline.anchors.length).toBeLessThan(raw.length / 10)
    expect(maximumDeviation(drawn, outline.polygon)).toBeLessThanOrEqual(0.04)
    expect(maximumDeviation(outline.polygon, drawn)).toBeLessThanOrEqual(0.04)
  })

  test('optimizes a dense curved stroke without expanding or shrinking its outline', () => {
    const raw: Point[] = Array.from({ length: 240 }, (_, index) => {
      const angle = index * 2 * Math.PI / 240
      return [6 * Math.cos(angle), 3 * Math.sin(angle)]
    })
    const outline = buildFreehandPoolOutline([...raw, raw[0]!], {
      closeDistance: 0.1,
      simplifyTolerance: 0.04,
    })!

    expect(outline.anchors.length).toBeLessThan(raw.length / 3)
    expect(maximumDeviation(raw, outline.polygon)).toBeLessThanOrEqual(0.04)
    expect(maximumDeviation(outline.polygon, raw)).toBeLessThanOrEqual(0.04)
  })

  test('does not round drawn corners when the permitted deviation is zero', () => {
    const drawn: Point[] = [[0, 0], [5, 0], [5, 3], [0, 3]]
    const raw = sampleOutline(drawn, 0.1)
    const outline = buildFreehandPoolOutline([...raw, raw[0]!], {
      closeDistance: 0.1,
      simplifyTolerance: 0,
    })!

    expect(outline.anchors).toHaveLength(4)
    expect(maximumDeviation(outline.polygon, drawn)).toBeLessThan(1e-8)
    expect(maximumDeviation(drawn, outline.polygon)).toBeLessThan(1e-8)
  })
})
