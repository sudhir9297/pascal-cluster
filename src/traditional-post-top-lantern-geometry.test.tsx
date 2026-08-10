import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseCatalogLamp } from './catalog-lamp-config'
import { traditionalPostTopLanternDefinition } from './catalog-lamp-definition'
import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { CatalogLampModel } from './catalog-lamp-model'
import {
  getTraditionalLanternBulbSocketClearance,
  resolveTraditionalPostTopLanternLayout,
  TRADITIONAL_LANTERN_DIMENSIONS,
} from './traditional-post-top-lantern-geometry'

describe('traditional post-top lantern', () => {
  test('seats the bulb inside the lamp holder without a visible air gap', () => {
    expect(getTraditionalLanternBulbSocketClearance()).toBeLessThanOrEqual(0)
  })

  test('keeps the fixture proportions and editor footprint in sync', () => {
    const node = parseCatalogLamp('streetscape:traditional-post-top-lantern', {
      height: 4,
      visualStyle: 'lantern',
    })
    const layout = resolveTraditionalPostTopLanternLayout(node)
    const footprint = traditionalPostTopLanternDefinition.capabilities.floorPlaced.footprint(node)

    expect(layout.chamberTopY - layout.chamberBottomY).toBeCloseTo(
      TRADITIONAL_LANTERN_DIMENSIONS.chamberHeight,
    )
    expect(footprint.dimensions).toEqual([
      TRADITIONAL_LANTERN_DIMENSIONS.roofWidth,
      layout.totalHeight,
      TRADITIONAL_LANTERN_DIMENSIONS.roofWidth,
    ])
  })

  test('renders a complete four-sided heritage assembly', () => {
    const node = parseCatalogLamp('streetscape:traditional-post-top-lantern', {
      height: 4,
      lightOn: true,
      visualStyle: 'lantern',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-traditional-post-top-lantern"')
    expect(markup).toContain('name="traditional-lantern-base-plinth"')
    expect(markup).toContain('name="traditional-lantern-glazing"')
    expect((markup.match(/name="traditional-lantern-corner-mullion"/g) ?? [])).toHaveLength(4)
    expect(markup).toContain('name="traditional-lantern-pitched-roof"')
    expect(markup).toContain('name="traditional-lantern-finial-spire"')
    expect(markup).toContain('name="traditional-lantern-lamp-holder-rim"')
    expect(markup).toContain('name="traditional-lantern-bulb-connector"')
    expect((markup.match(/name="traditional-lantern-bulb-thread"/g) ?? [])).toHaveLength(3)
    expect(markup).toContain('name="traditional-lantern-bulb-filament-stem"')
    expect(markup).toContain('name="traditional-lantern-bulb"')
    expect(markup).toContain('latheGeometry')
    expect((markup.match(/<pointLight/g) ?? [])).toHaveLength(1)
  })

  test('uses a dedicated roof-and-pane plan symbol', () => {
    const node = parseCatalogLamp('streetscape:traditional-post-top-lantern', {
      lightOn: true,
      position: [2, 0, 3],
      rotation: [0, Math.PI / 4, 0],
      visualStyle: 'lantern',
    })
    const floorplan = buildCatalogLampFloorplan(node, {
      viewState: { selected: false },
    } as never)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    expect(floorplan.children.filter((child) => child.kind === 'polygon')).toHaveLength(3)
    expect(floorplan.children.filter((child) => child.kind === 'line')).toHaveLength(4)
    expect(floorplan.children.filter((child) => child.kind === 'circle').length).toBeGreaterThanOrEqual(7)
  })
})
