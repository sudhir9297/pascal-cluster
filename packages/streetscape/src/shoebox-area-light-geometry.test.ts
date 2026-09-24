import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import {
  buildShoeboxAreaLightHousingGeometry,
  buildShoeboxAreaLightLensGeometry,
  SHOEBOX_AREA_LIGHT_DIMENSIONS,
  SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS,
} from './shoebox-area-light-geometry'
import { ShoeboxAreaLightNode } from './schema'

describe('shoebox area-light proportions', () => {
  test('keeps the housing low-profile and the optic panel recessed', () => {
    const housing = buildShoeboxAreaLightHousingGeometry()
    const lens = buildShoeboxAreaLightLensGeometry()
    const housingSize = housing.boundingBox!.getSize(new Vector3())
    const lensSize = lens.boundingBox!.getSize(new Vector3())

    expect(housingSize.x).toBeCloseTo(0.9)
    expect(housingSize.z).toBeCloseTo(0.34)
    expect(housingSize.y).toBeCloseTo(0.1)
    expect(housingSize.x / housingSize.z).toBeGreaterThan(2.6)
    expect(housingSize.x / housingSize.y).toBeGreaterThan(8.9)
    expect(lensSize.x).toBeLessThan(housingSize.x * 0.7)
    expect(lens.boundingBox!.max.y).toBeLessThan(housing.boundingBox!.min.y + 0.005)
    expect(SHOEBOX_AREA_LIGHT_DIMENSIONS.defaultArmLength).toBeLessThan(housingSize.x)

    housing.dispose()
    lens.dispose()
  })

  test('uses the same tapered housing and optic proportions in plan', () => {
    const node = ShoeboxAreaLightNode.parse({})
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const housings = polygons.filter(
      (child) => child.kind === 'polygon' && child.points.length === SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS.length * 2,
    )
    const housing = housings[0]
    expect(polygons).toHaveLength(8)
    expect(housings).toHaveLength(1)
    if (!housing || housing.kind !== 'polygon') return

    const xs = housing.points.map(([x]) => x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
      SHOEBOX_AREA_LIGHT_DIMENSIONS.housingEndX - SHOEBOX_AREA_LIGHT_DIMENSIONS.housingStartX,
    )
  })
})
