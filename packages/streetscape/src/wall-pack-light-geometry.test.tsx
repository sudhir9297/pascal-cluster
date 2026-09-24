import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import { WallPackLightNode } from './schema'
import {
  buildWallPackHousingGeometry,
  getWallPackPlanProfile,
  resolveWallPackLightLayout,
  WALL_PACK_LIGHT_DIMENSIONS,
} from './wall-pack-light-geometry'

describe('full-cutoff wall-pack light', () => {
  test('uses a compact tapered casting with a recessed, downward-facing optic', () => {
    const layout = resolveWallPackLightLayout(WALL_PACK_LIGHT_DIMENSIONS.defaultDepth)
    const housing = buildWallPackHousingGeometry(layout.depth)
    const size = housing.boundingBox!.getSize(new Vector3())

    // Wall fixtures in this catalog face local +X: the cursor is the centre
    // of the wall plate, X is projection, and Z is width.
    expect(size.x).toBeCloseTo(layout.depth - 0.018)
    expect(size.y).toBeCloseTo(WALL_PACK_LIGHT_DIMENSIONS.housingHeight, 2)
    expect(size.z).toBeCloseTo(WALL_PACK_LIGHT_DIMENSIONS.width)
    expect(layout.opticAngle).toBeGreaterThan(0)
    expect(layout.opticCenterY).toBeLessThan(0)
    expect(layout.opticCenterX).toBeGreaterThan(WALL_PACK_LIGHT_DIMENSIONS.opticInset)
    expect(getWallPackPlanProfile(layout.depth)).toHaveLength(8)

    housing.dispose()
  })

  test('anchors the backplate on the cursor and rotates in the same direction as Three.js', () => {
    const layout = resolveWallPackLightLayout(WALL_PACK_LIGHT_DIMENSIONS.defaultDepth)
    const profile = getWallPackPlanProfile(layout.depth)
    const localXs = profile.map(([localX]) => localX)
    const localZs = profile.map(([, localZ]) => localZ)

    expect(Math.min(...localXs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...localXs)).toBeCloseTo(layout.depth)
    expect(Math.max(...localZs) - Math.min(...localZs)).toBeCloseTo(WALL_PACK_LIGHT_DIMENSIONS.width)

    const rotatedNode = WallPackLightNode.parse({
      position: [4, 0, 7],
      rotation: [0, Math.PI / 2, 0],
    })
    const floorplan = buildCatalogLampFloorplan(rotatedNode, {} as never)
    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const housing = floorplan.children.find(
      (child) => child.kind === 'polygon' && child.points.length === 8,
    )
    expect(housing?.kind).toBe('polygon')
    if (!housing || housing.kind !== 'polygon') return
    const centroidX = housing.points.reduce((sum, [pointX]) => sum + pointX, 0) / housing.points.length
    const centroidZ = housing.points.reduce((sum, [, pointZ]) => sum + pointZ, 0) / housing.points.length

    expect(centroidX).toBeCloseTo(4)
    expect(centroidZ).toBeLessThan(7)
  })

  test('resolves an attached wall pack from its wall-local cursor anchor', () => {
    const node = WallPackLightNode.parse({
      position: [1, 1.75, 0.1],
      rotation: [0, -Math.PI / 2, 0],
      wallId: 'wall:test',
      wallT: 0.25,
      side: 'front',
    })
    const floorplan = buildCatalogLampFloorplan(node, {
      parent: {
        id: 'wall:test',
        type: 'wall',
        start: [10, 20],
        end: [14, 20],
        thickness: 0.2,
      },
    } as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const backplate = floorplan.children.find(
      (child) => child.kind === 'polygon' && child.points.length === 4,
    )
    expect(backplate?.kind).toBe('polygon')
    if (!backplate || backplate.kind !== 'polygon') return
    const centerX = backplate.points.reduce((sum, [x]) => sum + x, 0) / 4
    const centerZ = backplate.points.reduce((sum, [, z]) => sum + z, 0) / 4

    expect(centerX).toBeCloseTo(11)
    expect(centerZ).toBeCloseTo(20.1)
  })

  test('renders the mounting hardware, shielded optic, controls, and live downlight', () => {
    const node = WallPackLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-wall-pack-light"')
    expect(markup).toContain('name="catalog-wall-pack-light" position="0,0,0"')
    expect(markup).toContain('name="catalog-wall-pack-backplate"')
    expect((markup.match(/name="catalog-wall-pack-mounting-bolt"/g) ?? [])).toHaveLength(4)
    expect(markup).toContain('name="catalog-wall-pack-optic-bezel"')
    expect(markup).toContain('name="catalog-wall-pack-optic-window"')
    expect((markup.match(/name="catalog-wall-pack-optic-cell"/g) ?? [])).toHaveLength(10)
    expect((markup.match(/name="catalog-wall-pack-heat-sink-fin"/g) ?? [])).toHaveLength(5)
    expect(markup).toContain('name="catalog-wall-pack-photocell"')
    expect((markup.match(/name="catalog-wall-pack-side-fastener"/g) ?? [])).toHaveLength(2)
    expect(markup).toContain('<spotLight')
    expect(markup).not.toContain('name="catalog-lamp-pole"')
    const materialTags = markup.match(/<meshStandardMaterial\b[^>]*>/g) ?? []
    expect(materialTags.length).toBeGreaterThan(0)
    expect(materialTags.every((tag) => tag.includes('side="2"'))).toBe(true)
  })

  test('keeps the complete fixture visible in placement preview without live lighting', () => {
    const node = WallPackLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { ghost: true, layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-wall-pack-housing"')
    expect(markup).toContain('name="catalog-wall-pack-optic-window"')
    expect(markup).toContain('name="catalog-wall-pack-light" position="0,0,0"')
    expect(markup).not.toContain('name="catalog-wall-pack-placement-guide"')
    expect(markup).not.toContain('name="catalog-wall-pack-cursor-anchor"')
    expect(markup).not.toContain('spotLight')
    expect(markup).not.toContain('castShadow="true"')
  })

  test('draws the wall, tapered housing, service details, optic, and light throw in plan', () => {
    const node = WallPackLightNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    expect(polygons).toHaveLength(3)
    expect(lines).toHaveLength(WALL_PACK_LIGHT_DIMENSIONS.heatSinkFinCount + 2)
    expect(circles).toHaveLength(1)
    expect(polygons.some(
      (polygon) => polygon.kind === 'polygon' && polygon.points.length === 8,
    )).toBe(true)
    expect(lines.some(
      (line) => line.kind === 'line' && line.strokeWidth === 0.07,
    )).toBe(true)
  })
})
