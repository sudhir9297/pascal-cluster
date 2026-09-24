import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Vector3 } from 'three'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import { WallArmLightNode } from './schema'
import {
  buildWallArmHousingGeometry,
  buildWallArmLensGeometry,
  buildWallArmUpperSparGeometry,
  resolveWallArmLightLayout,
  WALL_ARM_LIGHT_DIMENSIONS,
  WALL_ARM_LIGHT_HOUSING_SECTIONS,
} from './wall-arm-light-geometry'

describe('architectural wall-arm light', () => {
  test('keeps one shared set of low-profile fixture proportions', () => {
    const layout = resolveWallArmLightLayout()
    const spar = buildWallArmUpperSparGeometry(layout.armLength)
    const housing = buildWallArmHousingGeometry()
    const lens = buildWallArmLensGeometry()
    const sparSize = spar.boundingBox!.getSize(new Vector3())
    const housingSize = housing.boundingBox!.getSize(new Vector3())
    const lensSize = lens.boundingBox!.getSize(new Vector3())

    expect(layout.armLength).toBe(WALL_ARM_LIGHT_DIMENSIONS.defaultArmLength)
    expect(sparSize.x).toBeGreaterThan(0.65)
    expect(housingSize.x).toBeCloseTo(0.86)
    expect(housingSize.z).toBeCloseTo(WALL_ARM_LIGHT_DIMENSIONS.headWidth)
    expect(housingSize.x / housingSize.y).toBeGreaterThan(6)
    expect(lensSize.x).toBeLessThan(housingSize.x)
    expect(lens.boundingBox!.max.y).toBeGreaterThan(housing.boundingBox!.min.y)
    expect(lens.boundingBox!.min.y).toBeLessThan(housing.boundingBox!.min.y)
    expect(housing.boundingBox!.min.y - lens.boundingBox!.min.y).toBeLessThan(0.012)

    spar.dispose()
    housing.dispose()
    lens.dispose()
  })

  test('keeps the custom head surfaces wound toward the exterior', () => {
    for (const geometry of [buildWallArmHousingGeometry(), buildWallArmLensGeometry()]) {
      const normals = geometry.getAttribute('normal')

      expect(normals.getY(1)).toBeGreaterThan(0)
      expect(normals.getY(2)).toBeGreaterThan(0)
      expect(normals.getY(5)).toBeLessThan(0)
      expect(normals.getY(6)).toBeLessThan(0)

      geometry.dispose()
    }
  })

  test('uses one clean rectangular head envelope without floating surface hardware', () => {
    expect(new Set(WALL_ARM_LIGHT_HOUSING_SECTIONS.map(({ halfWidth }) => halfWidth)).size).toBe(1)
    expect(new Set(WALL_ARM_LIGHT_HOUSING_SECTIONS.map(({ top }) => top)).size).toBe(1)
    expect(new Set(WALL_ARM_LIGHT_HOUSING_SECTIONS.map(({ bottom }) => bottom)).size).toBe(1)

    const previousConsoleError = console.error
    console.error = () => {}
    try {
      const node = WallArmLightNode.parse({ lightOn: false })
      const markup = renderToStaticMarkup(createElement(CatalogLampModel, { node }))

      expect(markup).not.toContain('catalog-wall-arm-driver-cover')
      expect(markup).not.toContain('catalog-wall-arm-heat-sink-fin')
      expect(markup).not.toContain('catalog-wall-arm-photocell')
      expect(markup).not.toContain('catalog-wall-arm-side-fastener')
      expect(markup).not.toContain('catalog-wall-arm-service-seam')

      const dimensions = WALL_ARM_LIGHT_DIMENSIONS
      const frameLength = dimensions.lensEndX
        - dimensions.lensStartX
        + dimensions.opticFrameThickness
      const frameDepth = dimensions.lensWidth + dimensions.opticFrameThickness * 2
      expect(markup).toContain(
        `args="${frameLength},${dimensions.opticFrameHeight},${dimensions.opticFrameThickness}"`,
      )
      expect(markup).toContain(
        `args="${dimensions.opticFrameThickness},${dimensions.opticFrameHeight},${frameDepth}"`,
      )
    } finally {
      console.error = previousConsoleError
    }
  })

  test('draws the mounting plate, tapered arm, detailed LED head, and optics in plan', () => {
    const node = WallArmLightNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    const head = polygons.find(
      (child) => child.kind === 'polygon' && child.points.length === WALL_ARM_LIGHT_HOUSING_SECTIONS.length * 2,
    )

    expect(head).toBeDefined()
    expect(polygons.length).toBeGreaterThanOrEqual(7)
    expect(circles.length).toBeGreaterThanOrEqual(4)
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })

  test('emits one downward roadway light only for the committed active fixture', () => {
    const previousConsoleError = console.error
    console.error = () => {}
    try {
      const active = WallArmLightNode.parse({ lightOn: true })
      const inactive = WallArmLightNode.parse({ lightOn: false })
      const activeMarkup = renderToStaticMarkup(createElement(CatalogLampModel, { node: active }))
      const inactiveMarkup = renderToStaticMarkup(createElement(CatalogLampModel, { node: inactive }))
      const ghostMarkup = renderToStaticMarkup(createElement(CatalogLampModel, { ghost: true, node: active }))

      expect((activeMarkup.match(/<spotLight/g) ?? []).length).toBe(1)
      expect(inactiveMarkup).not.toContain('<spotLight')
      expect(ghostMarkup).not.toContain('<spotLight')
    } finally {
      console.error = previousConsoleError
    }
  })

  test('renders the thin head shell and optic window from both sides', () => {
    const previousConsoleError = console.error
    console.error = () => {}
    try {
      const node = WallArmLightNode.parse({ lightOn: false })
      const markup = renderToStaticMarkup(createElement(CatalogLampModel, { node }))
      const meshMarkup = (name: string) => {
        const start = markup.indexOf(`name="${name}"`)
        expect(start).toBeGreaterThanOrEqual(0)
        return markup.slice(start, markup.indexOf('</mesh>', start))
      }

      expect(meshMarkup('catalog-wall-arm-housing')).toContain('side="2"')
      expect(meshMarkup('catalog-wall-arm-optic-window')).toContain('side="2"')
    } finally {
      console.error = previousConsoleError
    }
  })
})
