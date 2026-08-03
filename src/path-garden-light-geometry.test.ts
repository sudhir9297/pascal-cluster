import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import {
  PATH_GARDEN_LIGHT_DIMENSIONS,
  resolvePathGardenLightLayout,
} from './path-garden-light-geometry'
import { PathGardenLightNode } from './schema'

describe('twin-head path and garden light', () => {
  test('uses a substantial professional path-light scale and migrates legacy values', () => {
    const layout = resolvePathGardenLightLayout()
    const legacyLayout = resolvePathGardenLightLayout(6, 0.46)

    expect(layout.height).toBe(PATH_GARDEN_LIGHT_DIMENSIONS.defaultHeight)
    expect(layout.headSpan).toBe(PATH_GARDEN_LIGHT_DIMENSIONS.defaultHeadSpan)
    expect(layout.headSpan / layout.height).toBeCloseTo(0.59, 2)
    expect(layout.headCenterOffset).toBeGreaterThan(PATH_GARDEN_LIGHT_DIMENSIONS.hubRadius)
    expect(layout.stemTopY).toBeLessThan(layout.headY)
    expect(
      layout.bezelY + PATH_GARDEN_LIGHT_DIMENSIONS.opticBezelThickness / 2,
    ).toBeGreaterThan(layout.headBottomY)
    expect(
      layout.lightY + PATH_GARDEN_LIGHT_DIMENSIONS.lensThickness / 2,
    ).toBeGreaterThan(
      layout.bezelY - PATH_GARDEN_LIGHT_DIMENSIONS.opticBezelThickness / 2,
    )
    expect(legacyLayout.height).toBeCloseTo(0.78)
  })

  test('renders two complete opposed heads and two independent downward beams', () => {
    const node = PathGardenLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-path-garden-light"')
    expect(markup).toContain('name="catalog-path-base-plate"')
    expect(markup).toContain('name="catalog-path-tapered-stem"')
    expect(markup).toContain('name="catalog-path-service-door"')
    expect(markup).toContain('name="catalog-path-head-hub"')
    expect((markup.match(/name="catalog-path-head-side"/g) ?? [])).toHaveLength(2)
    expect((markup.match(/name="catalog-path-head-brace"/g) ?? [])).toHaveLength(2)
    expect((markup.match(/name="catalog-path-head-housing"/g) ?? [])).toHaveLength(2)
    expect((markup.match(/name="catalog-path-head-optic-bezel"/g) ?? [])).toHaveLength(2)
    expect((markup.match(/name="catalog-path-head-lens"/g) ?? [])).toHaveLength(2)
    expect((markup.match(/name="catalog-path-head-end-cap"/g) ?? [])).toHaveLength(2)
    expect((markup.match(/<spotLight/g) ?? [])).toHaveLength(2)
    expect(markup).not.toContain('name="catalog-lamp-pole"')
  })

  test('draws both heads, both light pools, braces, hub, stem, and base in plan', () => {
    const node = PathGardenLightNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    expect(circles).toHaveLength(5)
    expect(lines).toHaveLength(2)
    expect(polygons).toHaveLength(4)

    const headWidths = polygons
      .filter((polygon) => polygon.kind === 'polygon')
      .map((polygon) => {
        const xs = polygon.points.map(([pointX]) => pointX)
        return Math.max(...xs) - Math.min(...xs)
      })
    expect(Math.max(...headWidths)).toBeCloseTo(
      (PATH_GARDEN_LIGHT_DIMENSIONS.defaultHeadSpan - PATH_GARDEN_LIGHT_DIMENSIONS.headGap) / 2,
    )
  })
})
