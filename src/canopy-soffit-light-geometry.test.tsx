import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import {
  CANOPY_SOFFIT_LIGHT_DIMENSIONS,
  canopySoffitOpticOffsets,
  resolveCanopySoffitLightLayout,
} from './canopy-soffit-light-geometry'
import { CatalogLampModel } from './catalog-lamp-model'
import { CanopySoffitLightNode } from './schema'

describe('architectural canopy soffit light', () => {
  test('uses real fixture scale and migrates legacy span values', () => {
    const layout = resolveCanopySoffitLightLayout(0, 0.42)
    const legacyLayout = resolveCanopySoffitLightLayout(0, 1)

    expect(layout.fixtureSize).toBe(0.42)
    expect(legacyLayout.fixtureSize).toBe(0.42)
    expect(layout.height).toBe(0)
    expect(layout.housingTopY).toBeLessThan(CANOPY_SOFFIT_LIGHT_DIMENSIONS.housingDepth)
    expect(layout.opticCoverTopY).toBeLessThan(0)
    expect(canopySoffitOpticOffsets(layout.fixtureSize)).toHaveLength(24)
  })

  test('renders a compact ceiling-hosted fixture and broad downward light', () => {
    const node = CanopySoffitLightNode.parse({ ceilingId: 'ceiling:test', lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-canopy-soffit-light"')
    expect(markup).toContain('name="catalog-canopy-recessed-housing"')
    expect(markup).toContain('name="catalog-canopy-die-cast-trim"')
    expect(markup).toContain('name="catalog-canopy-weather-gasket"')
    expect(markup).toContain('name="catalog-canopy-optical-faceplate"')
    expect((markup.match(/name="catalog-canopy-optic-cover"/g) ?? [])).toHaveLength(2)
    expect(markup).toContain('name="catalog-canopy-service-rail"')
    expect(markup).toContain('name="catalog-canopy-control-sensor"')
    expect(markup).toContain('name="catalog-canopy-service-tag"')
    expect((markup.match(/name="catalog-canopy-optic-cell"/g) ?? [])).toHaveLength(24)
    expect((markup.match(/name="catalog-canopy-trim-fastener"/g) ?? [])).toHaveLength(4)
    expect((markup.match(/<spotLight/g) ?? [])).toHaveLength(1)
    expect(markup).not.toContain('name="catalog-canopy-slab"')
    expect(markup).not.toContain('name="catalog-canopy-column"')
    expect(markup).not.toContain('name="catalog-lamp-pole"')
  })

  test('keeps preview detail but omits live lighting', () => {
    const node = CanopySoffitLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { ghost: true, layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-canopy-optic-cover"')
    expect(markup).not.toContain('spotLight')
    expect(markup).not.toContain('castShadow="true"')
  })

  test('draws only the compact fixture, dual modules, optics, sensor, and light pool in plan', () => {
    const node = CanopySoffitLightNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    expect(polygons).toHaveLength(5)
    expect(circles).toHaveLength(30)
    expect(lines).toHaveLength(1)
    expect(circles.some(
      (circle) => circle.kind === 'circle'
        && circle.r === CANOPY_SOFFIT_LIGHT_DIMENSIONS.lightThrowRadius,
    )).toBe(true)
  })
})
