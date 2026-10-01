import { expect, test } from 'bun:test'
import { WallNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Mesh, Box3, Group } from 'three'
import { ShowerValveNode, showerValvePresets, valvePresetNode } from './schema'
import { buildShowerValveGeometry, valvePorts } from './geometry'
import { showerValveFloorplan } from './floorplan'
import { attachShowerValve, valveCompatible, valveLevelPose } from './attachment'
import { ShowerControlNode } from '../shower-control/schema'

test('rough-in families expose finite adjustable geometry, persistent fields and exact stable ports', () => {
  for (const preset of showerValvePresets)
    for (const max of [false, true]) {
      const n = ShowerValveNode.parse({
        ...valvePresetNode(preset),
        width: max ? 0.24 : 0.06,
        height: max ? 0.3 : 0.06,
        mountingDepth: max ? 0.2 : 0.04,
        portDiameter: max ? 0.035 : 0.015,
        portLength: max ? 0.04 : 0.01,
        outletCount: 3,
      })
      expect(ShowerValveNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
      const root = buildShowerValveGeometry(n)
      const bounds = new Box3().setFromObject(root)
      expect(bounds.min.z).toBeCloseTo(-n.mountingDepth, 5)
      expect(bounds.max.z).toBeLessThanOrEqual(0.000001)
      for (const port of valvePorts(n))
        expect(root.getObjectByName(`${port.type}_target_${port.id}`)!.position.toArray()).toEqual(
          port.position,
        )
      root.traverse((o) => {
        if (o instanceof Mesh) {
          for (const v of o.geometry.getAttribute('position').array)
            expect(Number.isFinite(v)).toBe(true)
          o.geometry.dispose()
        }
      })
    }
})

test('valve slots enforce generic function compatibility, capacity, depth and replacement identity', () => {
  const wall = WallNode.parse({ start: [0, 0], end: [4, 0], thickness: 0.15 })
  const trim = ShowerControlNode.parse({
    parentId: wall.id,
    wallId: wall.id,
    layout: 'single',
    outletCount: 2,
  })
  const nodes = { [wall.id]: wall, [trim.id]: trim } as Record<string, AnyNode>
  const n = ShowerValveNode.parse({})
  const placed = attachShowerValve(n, trim.id, nodes).placed
  nodes[placed.id] = placed as unknown as AnyNode
  const replacement = attachShowerValve(
    ShowerValveNode.parse({ serviceStops: true }),
    trim.id,
    nodes,
  )
  expect(replacement.changes.delete).toEqual([placed.id])
  expect(replacement.placed.slotId).toBe('valve-body')
  expect(() => attachShowerValve({ ...n, mountingDepth: 0.2 }, trim.id, nodes)).toThrow('thickness')
  expect(() => attachShowerValve({ ...n, family: 'transfer' }, trim.id, nodes)).toThrow(
    'compatible',
  )
  expect(valveCompatible(n, { ...trim, layout: 'dual' })).toBe(false)
  expect(valveCompatible({ ...n, family: 'thermostatic' }, { ...trim, layout: 'dual' })).toBe(true)
  expect(valveCompatible({ ...n, family: 'transfer' }, { ...trim, function: 'diverter' })).toBe(
    true,
  )
  expect(
    valveCompatible(
      { ...n, family: 'stop', outletCount: 1 },
      { ...trim, function: 'flow', outletCount: 1 },
    ),
  ).toBe(true)
  expect(
    valveCompatible({ ...n, family: 'universal', outletCount: 3 }, { ...trim, layout: 'bar' }),
  ).toBe(false)
  const moved = attachShowerValve(placed, trim.id, nodes, placed.id)
  expect(moved.placed.id).toBe(placed.id)
  expect(moved.changes.delete).toHaveLength(0)
})

test('concealed body plan and preview follow trim movement and either wall face', () => {
  const wall = WallNode.parse({ start: [2, 3], end: [6, 3], thickness: 0.15 })
  const level = new Group(),
    wallObject = new Group(),
    trimObject = new Group()
  level.position.set(7, 4, -2)
  wallObject.position.set(2, 0, 3)
  level.add(wallObject)
  wallObject.add(trimObject)
  for (const side of ['front', 'back'] as const) {
    const trim = ShowerControlNode.parse({
      parentId: wall.id,
      wallId: wall.id,
      position: [1, 1.1, side === 'front' ? 0.075 : -0.075],
      side,
      rotation: side === 'front' ? 0 : Math.PI,
    })
    const n = ShowerValveNode.parse({ parentId: trim.id })
    trimObject.position.fromArray(trim.position)
    trimObject.rotation.y = trim.rotation
    const pose = valveLevelPose(trimObject, level)
    for (const [i, v] of [3, 1.1, 3 + trim.position[2]].entries())
      expect(pose.position[i]).toBeCloseTo(v, 8)
    const nodes = { [wall.id]: wall, [trim.id]: trim } as Record<string, AnyNode>
    const plan = showerValveFloorplan(n, { resolve: (id: string) => nodes[id] } as GeometryContext)!
    expect(plan.kind).toBe('polygon')
    if (plan.kind === 'polygon')
      expect(plan.points.every((p) => p.every(Number.isFinite))).toBe(true)
    trimObject.position.x = 2
    expect(valveLevelPose(trimObject, level).position[0]).toBe(4)
  }
})
