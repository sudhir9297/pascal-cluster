import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BOLLARD_LIGHT_DIMENSIONS,
  resolveBollardLightLayout,
} from './bollard-light-geometry'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import { BollardLightNode } from './schema'

describe('architectural bollard light', () => {
  test('uses pedestrian-scale proportions and migrates legacy catalog heights', () => {
    const layout = resolveBollardLightLayout(BOLLARD_LIGHT_DIMENSIONS.defaultHeight)
    const legacyLayout = resolveBollardLightLayout(6)

    expect(layout.height).toBe(0.72)
    expect(layout.shaftTopY).toBeLessThan(layout.opticCenterY)
    expect(layout.opticCenterY).toBeLessThan(layout.capCenterY)
    expect(layout.louverY).toHaveLength(BOLLARD_LIGHT_DIMENSIONS.louverCount)
    expect(legacyLayout.height).toBeCloseTo(0.9)
    expect(BOLLARD_LIGHT_DIMENSIONS.basePlateRadius * 2).toBeLessThan(layout.height / 2)
  })

  test('renders a serviceable shielded assembly with three glare louvres', () => {
    const node = BollardLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-bollard-light"')
    expect(markup).toContain('name="catalog-bollard-base-plate"')
    expect((markup.match(/name="catalog-bollard-anchor-bolt"/g) ?? [])).toHaveLength(4)
    expect(markup).toContain('name="catalog-bollard-tapered-body"')
    expect(markup).toContain('name="catalog-bollard-service-door"')
    expect((markup.match(/name="catalog-bollard-service-fastener"/g) ?? [])).toHaveLength(2)
    expect(markup).toContain('name="catalog-bollard-optic-diffuser"')
    expect(markup).toContain('name="catalog-bollard-led-core"')
    expect((markup.match(/name="catalog-bollard-optic-support"/g) ?? [])).toHaveLength(4)
    expect((markup.match(/name="catalog-bollard-glare-louvre"/g) ?? [])).toHaveLength(3)
    expect(markup).toContain('name="catalog-bollard-cap"')
    expect((markup.match(/<pointLight/g) ?? [])).toHaveLength(1)
    expect(markup).not.toContain('name="catalog-lamp-pole"')
  })

  test('keeps preview geometry detailed but omits live lighting', () => {
    const node = BollardLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { ghost: true, layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-bollard-glare-louvre"')
    expect(markup).not.toContain('pointLight')
    expect(markup).not.toContain('castShadow="true"')
  })

  test('draws the footprint, optic, anchors, supports, service direction, and light pool in plan', () => {
    const node = BollardLightNode.parse({ lightOn: true })
    const floorplan = buildCatalogLampFloorplan(node, {} as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return

    const circles = floorplan.children.filter((child) => child.kind === 'circle')
    const lines = floorplan.children.filter((child) => child.kind === 'line')
    expect(circles).toHaveLength(9)
    expect(lines).toHaveLength(5)
    expect(circles.some(
      (circle) => circle.kind === 'circle' && circle.r === BOLLARD_LIGHT_DIMENSIONS.lightThrowRadius,
    )).toBe(true)
    expect(circles.some(
      (circle) => circle.kind === 'circle' && circle.r === BOLLARD_LIGHT_DIMENSIONS.basePlateRadius,
    )).toBe(true)
  })
})
