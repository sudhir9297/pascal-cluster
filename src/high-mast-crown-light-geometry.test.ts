import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import {
  buildHighMastCrownHousingGeometry,
  buildHighMastCrownLensGeometry,
  highMastCrownAngles,
  resolveHighMastCrownLightLayout,
} from './high-mast-crown-light-geometry'
import { HighMastCrownLightNode } from './schema'

describe('high-mast lowering crown geometry', () => {
  test('uses a true high-mast scale and a carrier ring inside the fixture radius', () => {
    const layout = resolveHighMastCrownLightLayout(HighMastCrownLightNode.parse({}))

    expect(layout.height).toBe(18)
    expect(layout.crownRadius).toBe(1.8)
    expect(layout.carrierRingRadius).toBeLessThan(layout.fixtureCenterRadius)
    expect(layout.carrierY).toBeLessThan(layout.height)
    expect(layout.headFrameY).toBeGreaterThan(layout.height)
    expect(layout.poleBottomRadius).toBeGreaterThan(layout.poleTopRadius * 2)
  })

  test('builds six evenly spaced outward fixture positions', () => {
    const angles = highMastCrownAngles()
    expect(angles).toHaveLength(6)
    for (let index = 1; index < angles.length; index += 1) {
      expect(angles[index]! - angles[index - 1]!).toBeCloseTo(Math.PI / 3)
    }
  })

  test('keeps the LED optic recessed below the die-cast housing', () => {
    const layout = resolveHighMastCrownLightLayout(HighMastCrownLightNode.parse({}))
    const housing = buildHighMastCrownHousingGeometry(layout)
    const lens = buildHighMastCrownLensGeometry(layout)
    const housingSize = housing.boundingBox!.getSize(new Vector3())

    expect(housingSize.x / housingSize.y).toBeGreaterThan(3)
    expect(housingSize.x / housingSize.z).toBeGreaterThan(1.4)
    expect(lens.boundingBox!.max.y).toBeLessThan(housing.boundingBox!.min.y + 0.005)

    housing.dispose()
    lens.dispose()
  })

  test('draws the carrier ring, centering spokes, six arms, and six heads in plan', () => {
    const floorplan = buildCatalogLampFloorplan(HighMastCrownLightNode.parse({}), {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    expect(circles).toHaveLength(2)
    expect(lines).toHaveLength(9)
    expect(polygons).toHaveLength(12)
    expect(polygons.filter((child) => child.kind === 'polygon' && child.points.length === 10)).toHaveLength(6)
  })
})
