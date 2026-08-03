import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { TunnelLuminaireNode } from './schema'
import { TunnelLuminaireModel } from './tunnel-luminaire-model'
import {
  buildTunnelLuminaireHousingGeometry,
  resolveTunnelLuminaireLayout,
  TUNNEL_LUMINAIRE_DIMENSIONS,
} from './tunnel-luminaire-geometry'

describe('tunnel luminaire geometry', () => {
  test('uses the editable reach as the real optical-unit length', () => {
    const layout = resolveTunnelLuminaireLayout(2.2, 6)

    expect(layout.length).toBe(2.2)
    expect(layout.bodyWidth).toBe(0.13)
    expect(layout.bodyHeight).toBe(0.077)
    expect(layout.opticStripOffsets).toEqual([
      -TUNNEL_LUMINAIRE_DIMENSIONS.opticStripOffset,
      TUNNEL_LUMINAIRE_DIMENSIONS.opticStripOffset,
    ])
    expect(layout.moduleCenters).toHaveLength(12)
    expect(layout.mountingClipCenters[0]).toBeCloseTo(-layout.mountingClipCenters[1])
    expect(layout.fixtureCenterY).toBeLessThan(6)
  })

  test('hangs below a ceiling-local mounting plane', () => {
    const layout = resolveTunnelLuminaireLayout(2.2, 0)

    expect(layout.fixtureCenterY).toBeLessThan(0)
    expect(layout.fixtureCenterY + layout.bodyHeight / 2).toBeLessThan(0)
  })

  test('builds a closed chamfered extrusion with computed bounds', () => {
    const geometry = buildTunnelLuminaireHousingGeometry(1.2)

    expect(geometry.getAttribute('position').count).toBe(16)
    expect(geometry.index?.count).toBe(84)
    expect(geometry.boundingBox?.min.x).toBeCloseTo(-0.6)
    expect(geometry.boundingBox?.max.x).toBeCloseTo(0.6)
    expect(geometry.boundingSphere).not.toBeNull()
    geometry.dispose()
  })

  test('draws the plan symbol at the node centre with matching dual optics', () => {
    const node = TunnelLuminaireNode.parse({
      armLength: 1.2,
      lightOn: true,
      position: [4, 0, 7],
      rotation: [0, Math.PI / 4, 0],
    })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') throw new Error('expected group')

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const layout = resolveTunnelLuminaireLayout(1.2)

    // glow, body, two optic channels, and two mounting clips
    expect(polygons).toHaveLength(6)
    expect(circles).toHaveLength(layout.moduleCenters.length * 2 + 1)
    expect(lines).toHaveLength(1)
    const housing = polygons[1]
    if (housing?.kind !== 'polygon') throw new Error('expected housing polygon')
    expect(housing.points[0]?.[0]).not.toBe(4)
    expect(housing.points[0]?.[1]).not.toBe(7)
  })

  test('emits one downward beam only for a committed active fixture', () => {
    const node = TunnelLuminaireNode.parse({ armLength: 2, height: 5.5, lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let committed = ''
    let ghost = ''
    try {
      committed = renderToStaticMarkup(createElement(TunnelLuminaireModel, { node }))
      ghost = renderToStaticMarkup(createElement(TunnelLuminaireModel, { ghost: true, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect((committed.match(/<spotLight/g) ?? [])).toHaveLength(1)
    expect(ghost).not.toContain('spotLight')
    expect(ghost).not.toContain('castShadow="true"')
  })
})
