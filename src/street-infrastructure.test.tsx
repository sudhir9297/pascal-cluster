import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
} from './schema'
import {
  STREET_INFRASTRUCTURE_VARIANTS,
  parseStreetInfrastructure,
} from './street-infrastructure-config'
import {
  drainageInletDefinition,
  fireHydrantDefinition,
  manholeCoverDefinition,
  trafficSignalDefinition,
} from './street-infrastructure-definition'
import { buildStreetInfrastructureFloorplan } from './street-infrastructure-floorplan'
import {
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
  resolveTrafficSignalHeadLayout,
  resolveTrafficSignalLayout,
} from './street-infrastructure-geometry'
import { StreetInfrastructureModel } from './street-infrastructure-model'

describe('street infrastructure catalog', () => {
  test('registers four stable utility-menu asset families', () => {
    expect(STREET_INFRASTRUCTURE_VARIANTS.map((variant) => variant.kind)).toEqual([
      'environment:traffic-signal',
      'environment:drainage-inlet',
      'environment:manhole-cover',
      'environment:fire-hydrant',
    ])
    for (const definition of [
      trafficSignalDefinition,
      drainageInletDefinition,
      manholeCoverDefinition,
      fireHydrantDefinition,
    ]) {
      expect(definition.renderer).toBeDefined()
      expect(definition.preview).toBeDefined()
      expect(definition.tool).toBeDefined()
      expect(definition.floorplan).toBeDefined()
      expect(definition.parametrics).toBeDefined()
    }
  })

  test('keeps all new cards inside the existing Utilities category', () => {
    const panel = readFileSync(new URL('./presets-panel.tsx', import.meta.url), 'utf8')
    expect(panel).toContain("panelCategory === 'utilities'")
    expect(panel).toContain('STREET_INFRASTRUCTURE_VARIANTS.map')
    expect(panel).toContain('{variant.family}')
    expect(panel).not.toContain("value: 'infrastructure'")
  })

  test('parses safe defaults for every new node', () => {
    expect(TrafficSignalNode.parse({})).toMatchObject({
      type: 'environment:traffic-signal',
      mount: 'mast-arm',
      headLayout: 'three-section',
      headCount: 'two',
      signalState: 'red',
      backplate: true,
      reflectiveBorder: true,
      redColor: '#f13b32',
      yellowColor: '#ffc338',
      greenColor: '#35c76d',
    })
    expect(DrainageInletNode.parse({})).toMatchObject({
      type: 'environment:drainage-inlet',
      inletType: 'combination',
      gratePattern: 'bicycle-safe',
    })
    expect(ManholeCoverNode.parse({})).toMatchObject({
      type: 'environment:manhole-cover',
      utilityLegend: 'storm',
      treadPattern: 'radial',
    })
    expect(FireHydrantNode.parse({})).toMatchObject({
      type: 'environment:fire-hydrant',
      outletLayout: 'two-hose-one-pumper',
      protectiveGuards: false,
    })
    for (const variant of STREET_INFRASTRUCTURE_VARIANTS) {
      expect(parseStreetInfrastructure(variant.kind, {}).type).toBe(variant.kind)
    }
  })

  test('resolves finite layouts for all visible variants', () => {
    for (const mount of ['post', 'mast-arm', 'span-wire'] as const) {
      const layout = resolveTrafficSignalLayout(TrafficSignalNode.parse({ mount }))
      expect(layout.supportHeight).toBeGreaterThan(2)
      expect(layout.faceCenters.every((center) => center.every(Number.isFinite))).toBe(true)
      expect(layout.footprintWidth).toBeGreaterThan(0)
    }
    for (const headLayout of [
      'three-section',
      'three-section-turn',
      'four-section-turn',
      'five-section-cluster',
    ] as const) {
      const head = resolveTrafficSignalHeadLayout(TrafficSignalNode.parse({ headLayout }))
      expect(head.sections.length).toBeGreaterThanOrEqual(3)
      expect(head.width).toBeGreaterThan(0.3)
      expect(head.height).toBeGreaterThan(1)
    }
    for (const gratePattern of [
      'bicycle-safe',
      'reticuline',
      'parallel',
      'curved-vane',
    ] as const) {
      const layout = resolveDrainageInletLayout(DrainageInletNode.parse({ gratePattern }))
      expect(layout.bars.length).toBeGreaterThan(3)
      expect(layout.bars.every((bar) => Object.values(bar).every(Number.isFinite))).toBe(true)
    }
    const cover = resolveManholeCoverLayout(ManholeCoverNode.parse({ diameter: 0.8 }))
    expect(cover.frameRadius).toBeGreaterThan(cover.radius)
    const hydrant = resolveFireHydrantLayout(FireHydrantNode.parse({ height: 1.1 }))
    expect(hydrant.height).toBe(1.1)
    expect(hydrant.flangeRadius).toBeGreaterThan(hydrant.barrelRadius)

    const trafficPlan = buildStreetInfrastructureFloorplan(
      TrafficSignalNode.parse({ mount: 'mast-arm', signalState: 'red' }),
      {} as never,
    )
    expect(trafficPlan.kind).toBe('group')
    if (trafficPlan.kind === 'group') {
      expect(trafficPlan.children.filter((child) => child.kind === 'line').length).toBeGreaterThanOrEqual(1)
      expect(trafficPlan.children.filter((child) => child.kind === 'polygon').length).toBeGreaterThanOrEqual(4)
      expect(trafficPlan.children.filter((child) => child.kind === 'circle').length).toBeGreaterThanOrEqual(4)
    }
  })

  test('renders every family and its major visual variants', () => {
    const previousConsoleError = console.error
    const renderErrors: string[] = []
    console.error = (...args) => renderErrors.push(args.join(' '))
    try {
      const nodes = [
        ...(['post', 'mast-arm', 'span-wire'] as const).flatMap((mount) =>
          ([
            'three-section',
            'three-section-turn',
            'four-section-turn',
            'five-section-cluster',
          ] as const).map((headLayout) =>
            TrafficSignalNode.parse({
              mount,
              headLayout,
              signalState: headLayout === 'three-section' ? 'green' : 'green-arrow',
            }),
          ),
        ),
        ...(['bicycle-safe', 'reticuline', 'parallel', 'curved-vane'] as const).map(
          (gratePattern) => DrainageInletNode.parse({ gratePattern }),
        ),
        ...(['radial', 'grid', 'rings'] as const).map((treadPattern) =>
          ManholeCoverNode.parse({ treadPattern }),
        ),
        ...(['two-hose-one-pumper', 'two-hose', 'one-hose'] as const).map((outletLayout) =>
          FireHydrantNode.parse({ outletLayout, protectiveGuards: true }),
        ),
      ]
      for (const node of nodes) {
        const markup = renderToStaticMarkup(
          createElement(StreetInfrastructureModel, { node }),
        )
        expect(markup.length).toBeGreaterThan(100)
        const floorplan = buildStreetInfrastructureFloorplan(node, {} as never)
        expect(floorplan.kind).toBe('group')
      }
      expect(renderErrors.some((message) => message.includes('Each child in a list'))).toBe(false)
    } finally {
      console.error = previousConsoleError
    }
  })
})
