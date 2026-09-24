import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import {
  buildSolarStreetLightHousingGeometry,
  buildSolarStreetLightPanelGeometry,
  createSolarStreetLightPanelTexture,
  resolveSolarStreetLightLayout,
  SOLAR_PANEL_COLUMNS,
  SOLAR_PANEL_ROWS,
  SOLAR_STREET_LIGHT_DIMENSIONS,
  SOLAR_STREET_LIGHT_HOUSING_SECTIONS,
} from './solar-street-light-geometry'
import { SolarStreetLightNode } from './schema'

describe('integrated solar street-light proportions', () => {
  test('matches the low-profile one-metre all-in-one luminaire class', () => {
    const housing = buildSolarStreetLightHousingGeometry()
    const size = housing.boundingBox!.getSize(new Vector3())

    expect(size.x).toBeCloseTo(0.965)
    expect(size.z).toBeCloseTo(0.48)
    expect(size.y).toBeGreaterThan(0.23)
    expect(size.y).toBeLessThanOrEqual(SOLAR_STREET_LIGHT_DIMENSIONS.housingHeight)
    expect(size.x / size.y).toBeGreaterThan(3.8)

    housing.dispose()
  })

  test('keeps the upswept arm below the integrated head', () => {
    const layout = resolveSolarStreetLightLayout(6, 1.3)

    expect(layout.headX).toBe(1.3)
    expect(layout.headY).toBeGreaterThan(layout.height)
    expect(layout.armControlY).toBeGreaterThan(layout.headY)
    expect(layout.armStartY).toBeLessThan(layout.height)
  })

  test('tiles the Editor photovoltaic texture at the shared 160 mm cell scale', () => {
    const panel = buildSolarStreetLightPanelGeometry()
    const uv = panel.getAttribute('uv')
    const uValues = Array.from({ length: uv.count }, (_, index) => uv.getX(index))
    const vValues = Array.from({ length: uv.count }, (_, index) => uv.getY(index))

    expect(Math.max(...uValues)).toBe(SOLAR_PANEL_COLUMNS)
    expect(Math.max(...vValues)).toBe(SOLAR_PANEL_ROWS)
    expect(createSolarStreetLightPanelTexture()).toBeNull()

    panel.dispose()
  })

  test('draws the same housing, solar-cell grid, pole and anchor plate in plan', () => {
    const floorplan = buildCatalogLampFloorplan(SolarStreetLightNode.parse({}), {} as never)
    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const housings = polygons.filter(
      (child) => child.kind === 'polygon' && child.points.length === SOLAR_STREET_LIGHT_HOUSING_SECTIONS.length * 2,
    )

    expect(polygons).toHaveLength(3)
    expect(circles).toHaveLength(5)
    expect(lines).toHaveLength(1 + (SOLAR_PANEL_COLUMNS - 1) + (SOLAR_PANEL_ROWS - 1) + 1)
    expect(housings).toHaveLength(1)
  })
})
