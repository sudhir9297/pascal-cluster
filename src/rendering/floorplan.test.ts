import { expect, test } from 'bun:test'
import type { AnyNode, GeometryContext, FloorplanGeometry } from '@pascal-app/core'
import { Euler, Vector3 } from 'three'
import { poolPlugin } from '../index'
import { PoolNode } from '../core/schema'
import { poolFloorplan } from '../core/definition'
import { PoolDrainNode } from '../drain/core/schema'
import { PoolPumpNode } from '../pump/core/schema'
import { PoolSpilloverNode } from '../spillover/core/schema'
import { PoolSharedJointNode } from '../shared-joint/core/schema'
import { PoolWaterfallNode } from '../water-feature/waterfall/core/schema'
import { poolSpilloverFloorplan } from '../spillover/core/definition'
import { poolComponentFloorplan } from './component-floorplan'
import { poolPlanDependencies, poolPlanMovableFrame, poolPlanPoint } from './plan-frame'
import { createPoolShapePolygon } from '../design/shapes'
import { sampleBoundaryBench } from '../design/feature-layout'

function context(nodes: Record<string, unknown>): GeometryContext {
  return { resolve: <N>(id: string) => nodes[id] as N | undefined, parent: null, siblings: [], children: [] }
}

function paths(geometry: FloorplanGeometry): string[] {
  return geometry.kind === 'path' ? [geometry.d]
    : geometry.kind === 'group' ? geometry.children.flatMap(paths) : []
}

function coordinates(d: string) {
  const values = d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? []
  return Array.from({ length: values.length / 2 }, (_, i) => [values[i * 2]!, values[i * 2 + 1]!] as [number, number])
}

test('every registered Pool component has finite selectable floorplan geometry', () => {
  for (const definition of poolPlugin.nodes ?? []) {
    expect(definition.floorplan).toBeDefined()
    const node = definition.schema.parse(definition.defaults())
    const geometry = definition.floorplan!(node, context({}))
    expect(geometry).not.toBeNull()
    const data = JSON.stringify(geometry)
    expect(data).not.toContain('NaN')
    expect(data).not.toContain('Infinity')
    expect(geometry?.kind === 'group' ? geometry.children.length : 1).toBeGreaterThan(0)
  }
})

test('spillover uses scene endpoints and rotates legacy local endpoints into plan', () => {
  const modern = PoolSpilloverNode.parse({ position: [10, 2, 20], rotation: [0, Math.PI / 2, 0],
    sourcePoolId: 'a', targetPoolId: 'b', connectionPath: [[9, 20], [11, 20]] })
  const plan = poolSpilloverFloorplan(modern)
  if (plan.kind !== 'group') throw new Error('Missing spillover group')
  expect(plan.children[0]).toMatchObject({ x1: 9, y1: 20, x2: 11, y2: 20 })
  const legacy = poolSpilloverFloorplan({ ...modern, connectionPath: [], length: 2, sourceSide: 1 })
  if (legacy.kind !== 'group') throw new Error('Missing legacy group')
  expect(legacy.children[0]).toMatchObject({ x1: 10, y1: 19, x2: 10, y2: 21 })
})

test('pool-child drain symbol tracks translated, rotated and elevated parent', () => {
  const pool = PoolNode.parse({ position: [11, 3, -7], rotation: [0, Math.PI / 3, 0] })
  const drain = PoolDrainNode.parse({ parentId: pool.id, poolId: pool.id, floorAnchor: [0.25, 0.75] })
  const polygon = coordinates(paths(poolComponentFloorplan(drain, context({ [pool.id]: pool })))[0]!)
  const center = polygon.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
  const expected = new Vector3(-pool.length / 4, 0, pool.width / 4).applyEuler(new Euler(...pool.rotation)).add(new Vector3(...pool.position))
  expect(center[0]! / polygon.length).toBeCloseTo(expected.x, 7)
  expect(center[1]! / polygon.length).toBeCloseTo(expected.z, 7)
  expect(poolPlanDependencies(drain, { [pool.id]: pool }).map(String)).toContain(pool.id)
})

test('parent-frame move conversions preserve the local plane through compound rotation', () => {
  const pool = PoolNode.parse({ position: [11, 3, -7], rotation: [0.2, 0.8, -0.15] })
  const parent = pool as unknown as AnyNode
  const local: [number, number, number] = [2, -1, 3]
  const plan = poolPlanMovableFrame.localToPlan(parent, local)
  const restored = poolPlanMovableFrame.planToLocal(parent, plan[0], local[1], plan[2])
  restored.forEach((value, index) => expect(value).toBeCloseTo(local[index]!, 7))
  const pump = PoolPumpNode.parse({ parentId: pool.id, position: local, rotation: [0, 0, 0] })
  expect(poolPlanPoint(pump, [0, 0], context({ [pool.id]: pool }))).toEqual([plan[0], plan[2]])
})

test('shared joint intersection stays in the translated scene frame', () => {
  const source = PoolNode.parse({ position: [10, 0, 20] })
  const target = PoolNode.parse({ position: [16, 0, 20] })
  const joint = PoolSharedJointNode.parse({ poolIds: [source.id, target.id], position: [13, 0, 20] })
  const plan = poolComponentFloorplan(joint, context({ [source.id]: source, [target.id]: target }))
  const region = paths(plan).flatMap(coordinates)
  expect(Math.min(...region.map(([x]) => x))).toBeCloseTo(12)
  expect(Math.max(...region.map(([x]) => x))).toBeCloseTo(14)
  expect(Math.min(...region.map(([, z]) => z))).toBeCloseTo(18)
  expect(Math.max(...region.map(([, z]) => z))).toBeCloseTo(22)
})

test('standalone waterfall pond shares the 3D receiving-water center and dimensions', () => {
  const waterfall = PoolWaterfallNode.parse({ position: [10, 0, 20], receivingPoolEnabled: true })
  const pond = coordinates(paths(poolComponentFloorplan(waterfall))[0]!)
  const xs = pond.map(([x]) => x), zs = pond.map(([, z]) => z)
  expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(waterfall.receivingPoolWidth)
  expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(waterfall.receivingPoolDepth)
  expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(10)
  expect((Math.max(...zs) + Math.min(...zs)) / 2).toBeCloseTo(20 + waterfall.receivingPoolDepth * 0.36)
})

test('coping covers the actual outward footprint rather than a capped centered stroke', () => {
  const pool = PoolNode.parse({ copingWidth: 0.8 })
  const rim = coordinates(paths(poolFloorplan(pool))[0]!)
  expect(Math.max(...rim.map(([x]) => x)) - Math.min(...rim.map(([x]) => x))).toBeCloseTo(pool.length + 1.6)
  expect(Math.max(...rim.map(([, z]) => z)) - Math.min(...rim.map(([, z]) => z))).toBeCloseTo(pool.width + 1.6)
})

test('entry, bench and sloped floor details render for curved and concave outlines', () => {
  for (const shape of ['rectangle', 'circle', 'kidney', 'lagoon', 'roman', 'l-shape'] as const) {
    const pool = PoolNode.parse({ shape, polygon: createPoolShapePolygon(shape, 8, 4), entryFeature: 'steps',
      benchEnabled: true, benchStyle: 'perimeter', floorProfile: 'shallow-to-deep' })
    const plain = poolFloorplan({ ...pool, entryFeature: 'none', benchEnabled: false, floorProfile: 'flat' })
    const detailed = poolFloorplan(pool)
    expect(paths(detailed).length).toBeGreaterThan(paths(plain).length)
    if (detailed.kind !== 'group') throw new Error('Missing basin group')
    expect(detailed.children.some(child => child.kind === 'text' && child.text === '1.10 → 2.00 m')).toBe(true)
    expect(JSON.stringify(detailed)).not.toContain('NaN')
  }
  const points = createPoolShapePolygon('rectangle', 8, 4)
  const samples = sampleBoundaryBench(points, 0.25, 2, 0.5)
  for (const sample of samples) expect(Math.hypot(sample.inner[0] - sample.point[0], sample.inner[1] - sample.point[1])).toBeCloseTo(0.5)
})
