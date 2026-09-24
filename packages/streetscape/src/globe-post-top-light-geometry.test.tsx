import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import {
  buildGlobePostTopRefractorGeometry,
  GLOBE_POST_TOP_LIGHT_DIMENSIONS,
  GLOBE_POST_TOP_LIGHT_PRISM_LEVELS,
  GLOBE_POST_TOP_LIGHT_RIB_ANGLES,
  resolveGlobePostTopLightLayout,
} from './globe-post-top-light-geometry'
import { GlobePostTopLightNode } from './schema'

describe('globe / acorn post-top light', () => {
  test('uses a 17-inch-class acorn refractor above a cast post-top fitter', () => {
    const dimensions = GLOBE_POST_TOP_LIGHT_DIMENSIONS
    const geometry = buildGlobePostTopRefractorGeometry()
    const size = geometry.boundingBox!.getSize(new Vector3())
    const layout = resolveGlobePostTopLightLayout(4)

    expect(size.x).toBeCloseTo(dimensions.globeMaxRadius * 2, 2)
    expect(size.z).toBeCloseTo(dimensions.globeMaxRadius * 2, 2)
    expect(size.y).toBeCloseTo(dimensions.globeHeight, 2)
    expect(size.y).toBeGreaterThan(size.x)
    expect(layout.globeBottomY).toBeGreaterThan(layout.height)
    expect(layout.totalHeight).toBeGreaterThan(layout.globeCenterY)
    expect(dimensions.capitalRadius).toBeGreaterThan(dimensions.fitterTopRadius)

    geometry.dispose()
  })

  test('draws the anchor base, refractor footprint, fitter, and radial prisms in plan', () => {
    const node = GlobePostTopLightNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')

    expect(polygons).toHaveLength(1)
    expect(circles).toHaveLength(8)
    expect(lines).toHaveLength(GLOBE_POST_TOP_LIGHT_RIB_ANGLES.length)
    if (polygons[0]?.kind !== 'polygon') return

    const xs = polygons[0].points.map(([x]) => x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
      GLOBE_POST_TOP_LIGHT_DIMENSIONS.basePlateSize,
    )
  })

  test('renders a detailed prismatic assembly and only emits light when committed', () => {
    const node = GlobePostTopLightNode.parse({ lightOn: true })
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

    expect(committed).toContain('name="catalog-globe-post-top-light"')
    expect(committed).toContain('name="catalog-globe-prismatic-lens"')
    expect(committed).toContain('name="catalog-globe-cast-fitter"')
    expect(committed).toContain('name="catalog-globe-tapered-shaft"')
    expect(committed).toContain('name="catalog-globe-cast-pedestal"')
    expect((committed.match(/name="catalog-globe-vertical-prism"/g) ?? [])).toHaveLength(
      GLOBE_POST_TOP_LIGHT_RIB_ANGLES.length,
    )
    expect((committed.match(/name="catalog-globe-horizontal-prism"/g) ?? [])).toHaveLength(
      GLOBE_POST_TOP_LIGHT_PRISM_LEVELS.length,
    )
    expect(committed).toContain('pointLight')
    expect(ghost).not.toContain('pointLight')
    expect(ghost).not.toContain('castShadow="true"')
  })
})
