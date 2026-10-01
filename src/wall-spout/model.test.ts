import { test, expect } from 'bun:test'
import { LevelNode, WallNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Euler, Mesh, Raycaster, Vector3 } from 'three'
import {
  WallSpoutNode,
  wallSpoutPresets,
  wallSpoutPresetNode,
  wallSpoutPresetParameters,
  waterfallSpout,
} from './schema'
import { buildWallSpoutGeometry, wallSpoutGeometryKey } from './geometry'
import { wallSpoutSockets, spoutWaterOutlet } from './targets'
import { wallSpoutFloorplan } from './floorplan'
import { ShowerMountNode } from '../shower-mount/schema'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHoseNode } from '../shower-hose/schema'
import { connectShowerHose, hoseConnection } from '../shower-hose/connection'
import { showerArmPlacement } from '../shower-arm/placement'
test('fifteen spout and bib presets retain identity, finite geometry and matching targets at limits', () => {
  for (const p of wallSpoutPresets)
    for (const edge of ['min', 'max']) {
      const base = wallSpoutPresetNode(p),
        n = WallSpoutNode.parse({
          ...base,
          length: edge === 'min' ? 0.08 : 0.4,
          tubeSize: edge === 'min' ? 0.018 : 0.07,
          drop: edge === 'min' ? 0.01 : 0.15,
          rise: edge === 'min' ? 0.02 : 0.18,
          waterfallWidth: edge === 'min' ? 0.06 : 0.3,
          waterfallSlope: edge === 'min' ? 0 : 20,
          hoseOutletEnabled: true,
        }),
        root = buildWallSpoutGeometry(n)
      for (const slot of wallSpoutSockets(n)) {
        const target = root.getObjectByName(`${slot.type}_target_${slot.id}`)!
        expect(target.position.toArray()).toEqual(slot.position)
        expect(target.rotation.x).toBe(slot.rotation[0])
      }
      root.traverse((o) => {
        if (o instanceof Mesh) {
          for (const value of o.geometry.getAttribute('position').array)
            expect(Number.isFinite(value)).toBe(true)
          o.geometry.dispose()
        }
      })
      expect(WallSpoutNode.parse({ ...n, ...wallSpoutPresetParameters(p) }).id).toBe(n.id)
      expect(WallSpoutNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
    }
})
test('waterfall target matches the rotated channel lip and the same outlet ID follows edits', () => {
  const n = WallSpoutNode.parse({ style: 'waterfall-open', length: 0.3, waterfallSlope: 20 }),
    point = new Vector3(0, -n.waterfallHeight / 2, n.length).applyEuler(
      new Euler((n.waterfallSlope * Math.PI) / 180, 0, 0),
    )
  expect(point.distanceTo(new Vector3(...spoutWaterOutlet(n)))).toBeLessThan(1e-8)
  const edited = { ...n, length: 0.4, waterfallSlope: 10 }
  expect(wallSpoutSockets(n).map((s) => s.id)).toEqual(wallSpoutSockets(edited).map((s) => s.id))
  expect(spoutWaterOutlet(n)).not.toEqual(spoutWaterOutlet(edited))
  expect(wallSpoutGeometryKey(n)).not.toBe(
    wallSpoutGeometryKey({ ...n, diverterStyle: 'pull-up', diverterRaised: true }),
  )
})
test('hose from a diverter spout follows its source and mounting remains wall-only on both faces', () => {
  const level = LevelNode.parse({}),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0], thickness: 0.2 }),
    spout = WallSpoutNode.parse({
      parentId: wall.id,
      wallId: wall.id,
      hoseOutletEnabled: true,
      position: [1, 0.65, 0.1],
    }),
    holder = ShowerMountNode.parse({
      parentId: wall.id,
      wallId: wall.id,
      position: [1.3, 1.2, 0.1],
    }),
    hand = HandShowerNode.parse({ parentId: holder.id }),
    nodes = Object.fromEntries(
      [level, wall, spout, holder, hand].map((n) => [n.id, n]),
    ) as unknown as Record<string, AnyNode>,
    hose = connectShowerHose(ShowerHoseNode.parse({}), spout.id, hand.id, nodes).placed,
    before = hoseConnection(hose, (id) => nodes[id])!
  nodes[spout.id] = { ...spout, length: 0.3, tubeSize: 0.05 } as unknown as AnyNode
  const after = hoseConnection(hose, (id) => nodes[id])!
  expect(after.slot.position).not.toEqual(before.slot.position)
  expect(after.end.distanceTo(before.end)).toBeGreaterThan(0.01)
  for (const side of ['front', 'back'] as const)
    expect(showerArmPlacement(spout, wall, 1, side)!.position[2]).toBe(
      side === 'front' ? 0.1 : -0.1,
    )
  expect(
    wallSpoutFloorplan(spout, { resolve: (id: string) => nodes[id] } as GeometryContext),
  ).toBeDefined()
})

test('spout sections follow model shapes and expose only active sizing controls', async () => {
  const { wallSpoutSection } = await import('./section')
  for (const preset of wallSpoutPresets) {
    const node = wallSpoutPresetNode(preset),
      model = wallSpoutSection(node)
    expect(model.drawing.plan.length).toBeGreaterThan(0)
    expect(model.drawing.detail!.length).toBeGreaterThan(0)
    expect(model.drawing.sectionWidth).toBeGreaterThan(0)
    const keys = model.dimensions.map((field) => field.key)
    expect(keys.includes('rise')).toBe(node.style === 'round-arched')
    expect(keys.includes('bendRadius')).toBe(node.style === 'round-curved')
    expect(wallSpoutSection({ ...node, length: 0.4 }).drawing).not.toEqual(model.drawing)
  }
})

test('spout finishes change surface response while preserving water outlet geometry', async () => {
  const { spoutFinishProperties } = await import('./finishes')
  const node = WallSpoutNode.parse({ fixtureType: 'bib' })
  for (const [color, properties] of Object.entries(spoutFinishProperties)) {
    const root = buildWallSpoutGeometry({ ...node, slots: { body: color, handle: color } })
    const body = root.children.find(
      (part) => part instanceof Mesh && part.userData.slotId === 'body',
    ) as Mesh
    const material = body.material as import('three').MeshStandardMaterial
    expect(material.roughness).toBe(properties.roughness)
    expect(material.metalness).toBe(properties.metalness)
    expect(material.userData.__pascalCachedMaterial).toBeUndefined()
    for (const slot of wallSpoutSockets(node))
      expect(root.getObjectByName(`${slot.type}_target_${slot.id}`)!.position.toArray()).toEqual(
        slot.position,
      )
    root.traverse((part) => {
      if (part instanceof Mesh) {
        part.geometry.dispose()
        for (const mat of Array.isArray(part.material) ? part.material : [part.material])
          if (!mat.userData.__pascalCachedMaterial) mat.dispose()
      }
    })
  }
})

test('square spouts have one continuous body through the bend at sizing limits', () => {
  for (const style of ['square-straight', 'square-angled'] as const)
    for (const length of [0.08, 0.18, 0.4])
      for (const tubeSize of [0.018, 0.036, 0.07])
        for (const drop of [0.01, Math.max(0.01, tubeSize / 2), 0.15]) {
          const node = WallSpoutNode.parse({ style, length, tubeSize, drop })
          const root = buildWallSpoutGeometry(node)
          const bodies = root.children.filter(
            (part) => part instanceof Mesh && part.userData.slotId === 'body',
          ) as Mesh[]
          expect(bodies).toHaveLength(1)
          root.updateMatrixWorld(true)
          const corner = style === 'square-angled' ? length * 0.65 : length
          const hits = new Raycaster(
            new Vector3(1, 0, corner),
            new Vector3(-1, 0, 0),
          ).intersectObject(bodies[0]!)
          expect(hits.length).toBeGreaterThan(0)
          expect(hits[0]!.point.x).toBeCloseTo(tubeSize / 2, 6)
          const positions = bodies[0]!.geometry.getAttribute('position')
          for (let i = 0; i < positions.count; i++)
            expect(
              [positions.getX(i), positions.getY(i), positions.getZ(i)].every(Number.isFinite),
            ).toBe(true)
          const edges = new Map<string, number>()
          const vertex = (i: number) =>
            [positions.getX(i), positions.getY(i), positions.getZ(i)]
              .map((value) => Math.round(value * 1e6))
              .join(',')
          for (let i = 0; i < positions.count; i += 3) {
            const vertices = [vertex(i), vertex(i + 1), vertex(i + 2)]
            for (let edge = 0; edge < 3; edge++) {
              const key = [vertices[edge]!, vertices[(edge + 1) % 3]!].sort().join('|')
              edges.set(key, (edges.get(key) ?? 0) + 1)
            }
          }
          expect([...edges.values()].every((count) => count === 2)).toBe(true)
          root.traverse((part) => {
            if (part instanceof Mesh) part.geometry.dispose()
          })
        }
})

test('square pull-up diverters sit before the angled bend and lift with their stems', () => {
  for (const style of ['square-straight', 'square-angled'] as const)
    for (const length of [0.08, 0.4]) {
      const node = WallSpoutNode.parse({
        style,
        length,
        drop: 0.15,
        diverterStyle: 'pull-up',
        diverterSize: 0.035,
      })
      const roots = [
        buildWallSpoutGeometry(node),
        buildWallSpoutGeometry({ ...node, diverterRaised: true }),
      ]
      const parts = roots.map(
        (root) =>
          root.children.filter(
            (part) => part instanceof Mesh && part.userData.slotId === 'diverter',
          ) as Mesh[],
      )
      const stem = parts[0]![0]!,
        cap = parts[0]![1]!
      expect(stem.position.y - 0.014 / 2).toBeCloseTo(node.tubeSize / 2, 8)
      if (style === 'square-angled')
        expect(cap.position.z + node.diverterSize / 2).toBeLessThan(length * 0.65)
      expect(parts[1]![1]!.position.y - cap.position.y).toBeCloseTo(0.015, 8)
      expect(
        roots[0]!.getObjectByName('shower_water_outlet_target_water-outlet')!.position.toArray(),
      ).toEqual(spoutWaterOutlet(node))
      for (const root of roots)
        root.traverse((part) => {
          if (part instanceof Mesh) part.geometry.dispose()
        })
    }
})
