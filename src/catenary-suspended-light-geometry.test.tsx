import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import {
  buildCatenaryCableCurve,
  buildCatenaryHousingGeometry,
  CATENARY_SUSPENDED_LIGHT_DIMENSIONS,
  catenaryHeightAt,
  resolveCatenarySuspendedLightLayout,
} from './catenary-suspended-light-geometry'
import { CatenaryStreetLightNode } from './schema'

describe('catenary suspended street light', () => {
  test('builds a true symmetric catenary at the requested span and a compact roadway housing', () => {
    const layout = resolveCatenarySuspendedLightLayout(6, 6)
    const curve = buildCatenaryCableCurve(layout)
    const housing = buildCatenaryHousingGeometry()
    const housingSize = housing.boundingBox!.getSize(new Vector3())

    expect(layout.span).toBe(6)
    expect(layout.sag).toBeCloseTo(0.33)
    expect(catenaryHeightAt(-3, layout)).toBeCloseTo(6, 5)
    expect(catenaryHeightAt(0, layout)).toBeCloseTo(6 - layout.sag, 5)
    expect(catenaryHeightAt(3, layout)).toBeCloseTo(6, 5)
    expect(curve.points).toHaveLength(33)
    expect(housingSize.x).toBeCloseTo(CATENARY_SUSPENDED_LIGHT_DIMENSIONS.bodyLength, 1)
    expect(housingSize.z).toBeCloseTo(CATENARY_SUSPENDED_LIGHT_DIMENSIONS.bodyWidth, 1)
    expect(housingSize.y).toBeLessThan(housingSize.z)
    expect(layout.fixtureCenterY).toBeLessThan(layout.cableCenterY)

    housing.dispose()
  })

  test('renders the complete support, suspension, service, and twin-optic assembly', () => {
    const node = CatenaryStreetLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let committed = ''
    let ghost = ''

    try {
      committed = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
      ghost = renderToStaticMarkup(createElement(CatalogLampModel, { ghost: true, layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(committed).toContain('name="catalog-catenary-lamp"')
    expect((committed.match(/name="catalog-catenary-support-pole"/g) ?? [])).toHaveLength(2)
    expect((committed.match(/name="catalog-catenary-base-plate"/g) ?? [])).toHaveLength(2)
    expect((committed.match(/name="catalog-catenary-anchor-bolt"/g) ?? [])).toHaveLength(8)
    expect((committed.match(/name="catalog-catenary-end-anchor"/g) ?? [])).toHaveLength(2)
    expect(committed).toContain('name="catalog-catenary-span"')
    expect((committed.match(/name="catalog-catenary-cable-clamp"/g) ?? [])).toHaveLength(2)
    expect((committed.match(/name="catalog-catenary-suspension-yoke"/g) ?? [])).toHaveLength(2)
    expect(committed).toContain('name="catalog-catenary-yoke-bridge"')
    expect((committed.match(/name="catalog-catenary-yoke-joint-pin"/g) ?? [])).toHaveLength(2)
    expect(committed).toContain('name="catalog-catenary-aero-housing"')
    expect(committed).toContain('name="catalog-catenary-service-cover"')
    expect(committed).toContain('name="catalog-catenary-protector"')
    expect((committed.match(/name="catalog-catenary-optic-module"/g) ?? [])).toHaveLength(2)
    expect((committed.match(/name="catalog-catenary-optic-cell"/g) ?? [])).toHaveLength(18)
    expect((committed.match(/<spotLight/g) ?? [])).toHaveLength(1)
    expect(ghost).not.toContain('spotLight')
    expect(ghost).not.toContain('castShadow="true"')
  })

  test('draws a rotated engineering-style plan symbol with bases, hardware, housing, and optics', () => {
    const node = CatenaryStreetLightNode.parse({
      armLength: 6,
      lightOn: true,
      position: [2, 0, 3],
      rotation: [0, Math.PI / 2, 0],
    })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const cable = lines.reduce((longest, line) => {
      if (line.kind !== 'line' || longest.kind !== 'line') return longest
      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1)
      const longestLength = Math.hypot(longest.x2 - longest.x1, longest.y2 - longest.y1)
      return length > longestLength ? line : longest
    })

    expect(polygons).toHaveLength(5)
    expect(lines).toHaveLength(4)
    expect(circles).toHaveLength(31)
    expect(cable.kind).toBe('line')
    if (cable.kind !== 'line') return
    expect(cable.x1).toBeCloseTo(cable.x2)
    expect(Math.abs(cable.y2 - cable.y1)).toBeCloseTo(6)
    expect(circles.some((circle) =>
      circle.kind === 'circle' && circle.r === CATENARY_SUSPENDED_LIGHT_DIMENSIONS.lightPoolRadius,
    )).toBe(true)
  })
})
