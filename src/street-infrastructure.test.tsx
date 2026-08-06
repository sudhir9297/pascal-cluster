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
import { getStreetInfrastructureParametrics } from './street-infrastructure-parametrics'
import {
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveFireHydrantOutletLayout,
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

  test('lets every placed utility move freely in plan and along elevation', () => {
    for (const definition of [
      trafficSignalDefinition,
      drainageInletDefinition,
      manholeCoverDefinition,
      fireHydrantDefinition,
    ]) {
      expect(definition.capabilities.movable?.axes).toEqual(['x', 'y', 'z'])
      const handles = Array.isArray(definition.handles) ? definition.handles : []
      const elevation = handles.find(
        (handle) => handle.kind === 'linear-resize' && handle.axis === 'y',
      )
      expect(elevation?.kind).toBe('linear-resize')
      if (elevation?.kind !== 'linear-resize') continue
      const node = definition.schema.parse({
        position: [1, 0.25, 3],
        roadAttachment: {
          networkNodeId: 'road-network_test',
          attachmentId: 'utility:road',
          side: 'left',
        },
      })
      expect(elevation.currentValue(node)).toBe(0.25)
      expect(elevation.apply(node, 1.5, {} as never)).toMatchObject({
        position: [1, 1.5, 3],
        roadAttachment: undefined,
      })
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
      treadPattern: 'radial',
    })
    expect(FireHydrantNode.parse({})).toMatchObject({
      type: 'environment:fire-hydrant',
      barrelType: 'dry-barrel',
      outletLayout: 'two-hose-one-pumper',
      height: 1.25,
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
    expect(cover.rimRadius).toBeLessThan(cover.radius)
    expect(cover.centerReliefRadius).toBeLessThan(cover.rimRadius)
    const hydrant = resolveFireHydrantLayout(FireHydrantNode.parse({ height: 1.1 }))
    expect(hydrant.height).toBe(1.1)
    expect(hydrant.flangeRadius).toBeGreaterThan(hydrant.barrelRadius)
    expect(hydrant.bonnetTopY + hydrant.stemNutHeight).toBeLessThanOrEqual(hydrant.height)
    expect(hydrant.barrelHeight / (hydrant.barrelRadius * 2)).toBeGreaterThan(2)
    expect(resolveFireHydrantOutletLayout(FireHydrantNode.parse({}))).toHaveLength(3)
    const wetHydrant = resolveFireHydrantLayout(FireHydrantNode.parse({ barrelType: 'wet-barrel' }))
    expect(wetHydrant.isWetBarrel).toBe(true)
    expect(wetHydrant.bonnetRadius).toBeLessThan(hydrant.bonnetRadius)

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

  test('keeps every drainage side-menu setting wired to the resolver and renderer', () => {
    const descriptor = getStreetInfrastructureParametrics('environment:drainage-inlet')
    const fields = descriptor.groups.flatMap((group) => group.fields)
    expect(fields.map((field) => field.key)).toEqual([
      'inletType',
      'gratePattern',
      'width',
      'length',
      'curbHeight',
      'metalColor',
      'wetness',
      'position',
    ])
    const inletType = fields.find((field) => field.key === 'inletType')
    expect(inletType?.kind).toBe('enum')
    if (inletType?.kind === 'enum') {
      expect(inletType.options).toEqual(['grate', 'curb-opening', 'combination', 'sweeper-combination'])
    }
    const curbHeight = fields.find((field) => field.key === 'curbHeight')
    expect(curbHeight?.visibleIf?.(DrainageInletNode.parse({ inletType: 'grate' }))).toBe(false)
    expect(curbHeight?.visibleIf?.(DrainageInletNode.parse({ inletType: 'curb-opening' }))).toBe(true)
  })

  test('keeps enlarged and clamped inlet variants inside their selection footprints', () => {
    for (const inletType of ['grate', 'curb-opening', 'combination', 'sweeper-combination'] as const) {
      for (const [width, length] of [[0.3, 0.5], [0.82, 1.2], [1.5, 2.5]] as const) {
        const node = DrainageInletNode.parse({ inletType, width, length, curbHeight: 0.3 })
        const layout = resolveDrainageInletLayout(node)
        const footprint = (drainageInletDefinition.capabilities.floorPlaced as any).footprint(node as any)
        const outerSurfaceHalfLength = (layout.length + 0.16) / 2
        const outerSurfaceHalfWidth = (layout.width + 0.16) / 2
        const outerCurbHalfLength = layout.curbOpeningLength / 2 + layout.curbDepth / 2
        const outerCurbHalfDepth = layout.curbDepth / 2

        expect(footprint.dimensions[0]).toBeGreaterThanOrEqual(
          2 * Math.max(outerSurfaceHalfLength, layout.hasCurbOpening
            ? Math.abs(layout.curbOpeningOffsetX) + outerCurbHalfLength
            : 0),
        )
        expect(footprint.dimensions[2]).toBeGreaterThanOrEqual(
          2 * Math.max(outerSurfaceHalfWidth, layout.hasCurbOpening
            ? layout.curbCenterZ + outerCurbHalfDepth
            : 0),
        )
        const floorplan = buildStreetInfrastructureFloorplan(node, {} as never)
        if (floorplan.kind === 'group') {
          const points = floorplan.children
            .filter((child) => child.kind === 'polygon')
            .flatMap((child) => child.points)
          expect(Math.max(...points.map(([x]) => Math.abs(x)))).toBeLessThanOrEqual(
            footprint.dimensions[0] / 2 + 0.0001,
          )
          expect(Math.max(...points.map(([, z]) => Math.abs(z)))).toBeLessThanOrEqual(
            footprint.dimensions[2] / 2 + 0.0001,
          )
        }
      }
    }
  })

  test('seats the curb opening against the grate surround edge', () => {
    const node = DrainageInletNode.parse({ inletType: 'combination', width: 1.2, length: 1.8 })
    const layout = resolveDrainageInletLayout(node)
    const grateOuterEdge = layout.width / 2 + layout.surroundOverhang
    const curbInnerEdge = layout.curbCenterZ - layout.curbDepth / 2

    expect(curbInnerEdge).toBeCloseTo(grateOuterEdge, 5)
  })

  test('mirrors curb openings to the attached road side', () => {
    const left = buildStreetInfrastructureFloorplan(
      DrainageInletNode.parse({ inletType: 'combination' }),
      {} as never,
    )
    const right = buildStreetInfrastructureFloorplan(
      DrainageInletNode.parse({
        inletType: 'combination',
        roadAttachment: {
          networkNodeId: 'road-network_test',
          attachmentId: 'drainage_test:road',
          side: 'right',
        },
      }),
      {} as never,
    )
    const curbCenter = (floorplan: typeof left) => {
      if (floorplan.kind !== 'group') return 0
      const polygon = floorplan.children.at(-2)
      if (!polygon || polygon.kind !== 'polygon') return 0
      return polygon.points.reduce((sum, point) => sum + point[1], 0) / polygon.points.length
    }
    expect(curbCenter(left)).toBeGreaterThan(0)
    expect(curbCenter(right)).toBeLessThan(0)
  })

  test('keeps manhole cover depth layers apart', () => {
    const manhole = resolveManholeCoverLayout(ManholeCoverNode.parse({}))
    expect(manhole.frameHeight).toBeLessThan(0.06)
    expect(manhole.treadY + manhole.treadHeight / 2).toBeCloseTo(0.106, 3)
    expect(manhole.coverBackingTopY).toBeLessThan(manhole.coverBottomY - 0.002)
    expect(manhole.coverBottomY).toBeGreaterThan(manhole.frameHeight + 0.002)
    expect(manhole.rimBottomY).toBeGreaterThan(manhole.coverTopY + 0.002)
    expect(manhole.treadBottomY).toBeGreaterThan(manhole.coverTopY + 0.002)
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
        ...(['grate', 'curb-opening', 'combination', 'sweeper-combination'] as const).flatMap((inletType) =>
          (['bicycle-safe', 'reticuline', 'parallel', 'curved-vane'] as const).map((gratePattern) =>
            DrainageInletNode.parse({ inletType, gratePattern, width: 0.82, length: 1.2, curbHeight: 0.18, wetness: 0.8 }),
          ),
        ),
        ...(['radial', 'grid', 'rings'] as const).map((treadPattern) =>
          ManholeCoverNode.parse({ treadPattern }),
        ),
        ...(['dry-barrel', 'wet-barrel'] as const).flatMap((barrelType) =>
          (['two-hose-one-pumper', 'two-hose', 'one-hose'] as const).map((outletLayout) =>
            FireHydrantNode.parse({ barrelType, outletLayout }),
          ),
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
      for (const inletType of ['grate', 'curb-opening', 'combination', 'sweeper-combination'] as const) {
        for (const gratePattern of ['bicycle-safe', 'reticuline', 'parallel', 'curved-vane'] as const) {
          const node = DrainageInletNode.parse({ inletType, gratePattern, width: 0.82, length: 1.2, curbHeight: 0.18 })
          const layout = resolveDrainageInletLayout(node)
          for (const bar of layout.bars) {
            const halfX = Math.abs(Math.cos(bar.rotationY)) * bar.width / 2 + Math.abs(Math.sin(bar.rotationY)) * bar.length / 2
            const halfZ = Math.abs(Math.sin(bar.rotationY)) * bar.width / 2 + Math.abs(Math.cos(bar.rotationY)) * bar.length / 2
            expect(Math.abs(bar.x) + halfX).toBeLessThanOrEqual(node.length / 2 + 0.0001)
            expect(Math.abs(bar.z) + halfZ).toBeLessThanOrEqual(node.width / 2 + 0.0001)
          }
        }
      }
      for (const treadPattern of ['radial', 'grid', 'rings'] as const) {
        const floorplan = buildStreetInfrastructureFloorplan(
          ManholeCoverNode.parse({ treadPattern }),
          {} as never,
        )
        expect(floorplan.kind).toBe('group')
        if (floorplan.kind === 'group') {
          expect(floorplan.children.some((child) => child.kind === 'line' || child.kind === 'circle')).toBe(true)
        }
      }
      expect(renderErrors.some((message) => message.includes('Each child in a list'))).toBe(false)
    } finally {
      console.error = previousConsoleError
    }
  })
})
