import { describe, expect, test } from 'bun:test'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import {
  FLOODLIGHT_HOUSING_PLAN_PROFILE,
  FLOODLIGHT_POLE_DIMENSIONS,
  resolveFloodlightPoleLayout,
} from './floodlight-pole-geometry'
import { FloodlightPoleNode } from './schema'

describe('floodlight pole proportions', () => {
  test('keeps a shallow projector, tapered shaft, and thirty-degree aim', () => {
    const layout = resolveFloodlightPoleLayout(6, 0.9)

    expect(layout.housingLength / layout.housingHeight).toBe(3)
    expect(layout.housingWidth).toBeGreaterThan(layout.housingHeight * 2)
    expect(layout.shaftBottomRadius).toBeGreaterThan(layout.shaftTopRadius)
    expect(layout.headTilt).toBeCloseTo(Math.PI / 6)
    expect(layout.headCenterY).toBeLessThanOrEqual(layout.height)
    expect(layout.headCenterX).toBeGreaterThan(layout.armLength)
  })

  test('uses the same housing, base, yoke, and beam direction in plan', () => {
    const node = FloodlightPoleNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const housing = polygons.find(
      (child) => child.kind === 'polygon' && child.points.length === FLOODLIGHT_HOUSING_PLAN_PROFILE.length,
    )
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')

    expect(housing).toBeDefined()
    expect(polygons.length).toBeGreaterThanOrEqual(4)
    expect(circles).toHaveLength(1)
    expect(lines).toHaveLength(3)
    if (!housing || housing.kind !== 'polygon') return

    const xs = housing.points.map(([x]) => x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(FLOODLIGHT_POLE_DIMENSIONS.housingLength)
  })
})
