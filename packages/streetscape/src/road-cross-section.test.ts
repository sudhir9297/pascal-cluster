import { describe, expect, test } from 'bun:test'
import { RoadStylePreset } from './schema'
import {
  buildRoadCrossSection,
  buildRoadJunctionBands,
  resolveRoadSideComponents,
  withRoadSideComponents,
} from './road-cross-section'

function style(overrides: Record<string, unknown> = {}) {
  return RoadStylePreset.parse({ id: 'test', name: 'Test', ...overrides })
}

describe('road cross sections', () => {
  test('preserves legacy symmetric sidewalks when per-side data is absent', () => {
    const legacy = style({ sidewalkWidth: 0.8 })
    const section = buildRoadCrossSection(legacy)

    expect(resolveRoadSideComponents(legacy, 'left').sidewalkWidth).toBe(0.8)
    expect(section.sides.left.components.map((component) => component.kind)).toEqual(['sidewalk'])
    expect(section.sides.right.components.map((component) => component.kind)).toEqual(['sidewalk'])
    expect(section.totalWidth).toBeCloseTo(section.carriagewayWidth + 1.6)
  })

  test('orders asymmetric components outward and mirrors their signed offsets', () => {
    const section = buildRoadCrossSection(style({
      leftSide: {
        parkingLaneWidth: 2.2,
        bikeLaneWidth: 1.6,
        gutterWidth: 0.4,
        curbWidth: 0.15,
        vergeWidth: 0.8,
        sidewalkWidth: 1.5,
      },
      rightSide: {
        parkingLaneWidth: 0,
        bikeLaneWidth: 1.2,
        gutterWidth: 0.3,
        curbWidth: 0.12,
        vergeWidth: 0,
        sidewalkWidth: 1,
      },
    }))

    expect(section.sides.left.components.map((component) => component.kind)).toEqual([
      'parking-lane', 'bike-lane', 'gutter', 'curb', 'verge', 'sidewalk',
    ])
    expect(section.sides.right.components.map((component) => component.kind)).toEqual([
      'bike-lane', 'gutter', 'curb', 'sidewalk',
    ])
    expect(section.sides.left.components.every((component) => component.lateralOffset > 0)).toBe(true)
    expect(section.sides.right.components.every((component) => component.lateralOffset < 0)).toBe(true)
    expect(section.sides.left.width).toBeCloseTo(6.65)
    expect(section.sides.right.width).toBeCloseTo(2.62)
  })

  test('builds cumulative junction bands from the widest incident side', () => {
    const bands = buildRoadJunctionBands([style({
      leftSide: { bikeLaneWidth: 1.5, curbWidth: 0.15, sidewalkWidth: 1.2 },
      rightSide: { gutterWidth: 0.4, curbWidth: 0.2, vergeWidth: 0.7 },
    })])

    expect(bands.map((band) => band.kind)).toEqual([
      'bike-lane', 'gutter', 'curb', 'verge', 'sidewalk',
    ])
    expect(bands.at(-1)?.outerWidth).toBeCloseTo(4)
  })

  test('authors each side without mutating the source style or draft values', () => {
    const source = style({
      leftSide: { sidewalkWidth: 0.5 },
      rightSide: { sidewalkWidth: 0.5 },
    })
    const sides = {
      left: { ...source.leftSide!, sidewalkWidth: 2.2 },
      right: { ...source.rightSide!, bikeLaneWidth: 1.4 },
    }

    const authored = withRoadSideComponents(source, sides)
    sides.left.sidewalkWidth = 3.5

    expect(authored).not.toBe(source)
    expect(authored.leftSide?.sidewalkWidth).toBe(2.2)
    expect(authored.rightSide?.bikeLaneWidth).toBe(1.4)
    expect(source.leftSide?.sidewalkWidth).toBe(0.5)
  })
})
