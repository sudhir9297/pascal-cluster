import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import { resolveDecorativeCandelabraLayout } from './decorative-candelabra-light-geometry'
import { DecorativeCandelabraLightNode } from './schema'

describe('decorative candelabra light', () => {
  test('resolves a hierarchical three-light elevation from the legacy controls', () => {
    const node = DecorativeCandelabraLightNode.parse({ armLength: 1.35, height: 6 })
    const layout = resolveDecorativeCandelabraLayout(node)

    expect(layout.armSpan).toBe(1.35)
    expect(layout.centerLanternY).toBeGreaterThan(layout.sideLanternY)
    expect(layout.sideMountY).toBeLessThan(layout.sideLanternY)
    expect(layout.shaftBottomRadius).toBeGreaterThan(layout.shaftTopRadius)
    expect(layout.baseRadius).toBeGreaterThan(layout.shaftBottomRadius)
  })

  test('draws the pedestal, two-arm bracket, and three framed lanterns in plan', () => {
    const node = DecorativeCandelabraLightNode.parse({
      armLength: 1.25,
      lightOn: true,
      rotation: [0, Math.PI / 4, 0],
    })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    expect(circles).toHaveLength(2)
    expect(lines).toHaveLength(4)
    expect(polygons).toHaveLength(6)
    expect(polygons.every((polygon) => polygon.points.length === 4)).toBe(true)
  })

  test('renders an ornamental pole, paired scrolls, and three four-sided lanterns', () => {
    const node = DecorativeCandelabraLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let committedMarkup = ''
    let ghostMarkup = ''

    try {
      committedMarkup = renderToStaticMarkup(
        createElement(CatalogLampModel, { layer: 1, node }),
      )
      ghostMarkup = renderToStaticMarkup(
        createElement(CatalogLampModel, { ghost: true, layer: 1, node }),
      )
    } finally {
      console.error = previousConsoleError
    }

    expect(committedMarkup).toContain('name="catalog-decorative-candelabra-light"')
    expect(committedMarkup).toContain('name="catalog-candelabra-flared-pedestal"')
    expect((committedMarkup.match(/name="catalog-candelabra-scroll-arm"/g) ?? [])).toHaveLength(2)
    expect((committedMarkup.match(/name="catalog-candelabra-scroll-volute"/g) ?? [])).toHaveLength(2)
    expect((committedMarkup.match(/name="catalog-candelabra-arm-socket-joint"/g) ?? [])).toHaveLength(2)
    expect((committedMarkup.match(/name="catalog-candelabra-lantern"/g) ?? [])).toHaveLength(3)
    expect((committedMarkup.match(/name="catalog-candelabra-glass-pane"/g) ?? [])).toHaveLength(12)
    expect((committedMarkup.match(/name="catalog-candelabra-cage-rail"/g) ?? [])).toHaveLength(12)
    expect((committedMarkup.match(/name="catalog-candelabra-cage-frame"/g) ?? [])).toHaveLength(24)
    expect((committedMarkup.match(/<pointLight/g) ?? [])).toHaveLength(3)
    expect(ghostMarkup).not.toContain('<pointLight')
    expect(ghostMarkup).not.toContain('castShadow="true"')
  })
})
