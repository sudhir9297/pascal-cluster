import { test, expect } from 'bun:test'
import { WallNode, LevelNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Mesh, Vector3, Euler, Quaternion } from 'three'
import {
  ShowerControlNode,
  showerControlPresets,
  controlPresetNode,
  controlPresetParameters,
  controlFootprint,
  exposedControl,
} from './schema'
import { buildShowerControlGeometry, controlDimensions, showerControlGeometryKey } from './geometry'
import { showerControlSockets } from './targets'
import { showerArmPlacement } from '../shower-arm/placement'
import { ShowerMountNode } from '../shower-mount/schema'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHoseNode } from '../shower-hose/schema'
import { connectShowerHose, hoseConnection } from '../shower-hose/connection'
import { showerControlFloorplan } from './floorplan'
import { bathMixerSpout, bathSpoutOrigin } from './bath-spout'
import { spoutWaterOutlet } from '../wall-spout/targets'

test('bath mixer variations retain independent hose, riser and swivel spout targets', () => {
  for (const p of showerControlPresets) {
    const base = controlPresetNode(p)
    if (!base.spoutEnabled) continue
    for (const max of [false, true]) {
      const n = ShowerControlNode.parse({
        ...base,
        tubeSize: max ? 0.07 : 0.02,
        spoutLength: max ? 0.4 : 0.08,
        spoutDrop: max ? 0.15 : 0.01,
        spoutWidth: max ? 0.3 : 0.06,
        spoutHeight: max ? 0.05 : 0.012,
        spoutRise: max ? 0.18 : 0.02,
        spoutSlope: max ? 20 : 0,
        spoutSwivel: max ? 90 : -90,
      })
      const root = buildShowerControlGeometry(n)
      root.updateMatrixWorld(true)
      const slots = showerControlSockets(n)
      const outlet = slots.find((s) => s.id === 'bath-spout')!
      const expected = new Vector3(...spoutWaterOutlet(bathMixerSpout(n)))
        .applyEuler(new Euler(0, (n.spoutSwivel * Math.PI) / 180, 0))
        .add(new Vector3(...bathSpoutOrigin(n)))
      expect(new Vector3(...outlet.position).distanceTo(expected)).toBeLessThan(1e-9)
      expect(slots.some((s) => s.id === 'riser')).toBe(n.riserEnabled)
      expect(slots.find((s) => s.id === 'hose')!.position[0]).toBe(n.bodyWidth * 0.25)
      let targetCount = 0
      root.traverse((o) => {
        if (o.userData.slotType) targetCount++
        if (o instanceof Mesh) {
          for (const v of o.geometry.getAttribute('position').array)
            expect(Number.isFinite(v)).toBe(true)
          o.geometry.dispose()
        }
      })
      expect(targetCount).toBe(slots.length)
      const target = root.getObjectByName('shower_water_outlet_target_bath-spout')!
      expect(target.getWorldPosition(new Vector3()).distanceTo(expected)).toBeLessThan(1e-9)
      expect(target.rotation.toArray().slice(0, 3)).toEqual(outlet.rotation)
      const rim = root.getObjectByName('spout-outlet-rim')
      if (rim)
        expect(
          target
            .getWorldQuaternion(new Quaternion())
            .angleTo(rim.getWorldQuaternion(new Quaternion())),
        ).toBeLessThan(1e-7)
      const resized = {
        ...n,
        spoutLength: 0.2,
        spoutSwivel: 0,
      } as ShowerControlNode
      expect(showerControlSockets(resized).map((s) => s.id)).toEqual(slots.map((s) => s.id))
      expect(
        showerControlSockets(resized).find((s) => s.id === 'bath-spout')!.position,
      ).not.toEqual(outlet.position)
      expect(showerControlGeometryKey(resized)).not.toBe(showerControlGeometryKey(n))
      expect(ShowerControlNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
    }
  }
})
test('all visible control and bath mixer presets parse with stable slot identities and finite geometry at size limits', () => {
  for (const p of showerControlPresets)
    for (const size of ['min', 'max']) {
      const base = controlPresetNode(p),
        n = ShowerControlNode.parse({
          ...base,
          plateWidth: size === 'min' ? 0.08 : 0.36,
          plateHeight: size === 'min' ? 0.08 : 0.45,
          bodyWidth: size === 'min' ? 0.18 : 0.45,
          handleDiameter: size === 'min' ? 0.02 : 0.07,
          inletSpacing: size === 'min' ? 0.1 : 0.24,
          buttonCount: 3,
        }),
        root = buildShowerControlGeometry(n),
        slots = showerControlSockets(n)
      expect(n.id.startsWith('bath-space-shower-control_')).toBe(true)
      expect(slots.map((s) => s.id)).toEqual(
        showerControlSockets({ ...n, handleAngle: 90, projection: 0.18 }).map((s) => s.id),
      )
      expect(slots.some((s) => s.id === 'valve-body')).toBe(!exposedControl(n))
      for (const s of slots)
        expect(root.getObjectByName(`${s.type}_target_${s.id}`)!.position.toArray()).toEqual(
          s.position,
        )
      root.traverse((o) => {
        if (o instanceof Mesh) {
          for (const value of o.geometry.getAttribute('position').array)
            expect(Number.isFinite(value)).toBe(true)
          o.geometry.dispose()
        }
      })
      expect(ShowerControlNode.parse({ ...n, ...controlPresetParameters(p) }).id).toBe(n.id)
      expect(ShowerControlNode.parse({ ...n, flangeSize: controlFootprint(n) })).toBeDefined()
      expect(controlDimensions(n).diameter).toBeLessThanOrEqual(n.handleDiameter)
    }
})
test('exposed mixer supplies an independently mounted handset and resizing updates the source target', () => {
  const level = LevelNode.parse({}),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0] }),
    control = ShowerControlNode.parse({
      ...controlPresetParameters(showerControlPresets[5]),
      parentId: wall.id,
      wallId: wall.id,
      position: [1, 1.1, 0.05],
    }),
    holder = ShowerMountNode.parse({
      parentId: wall.id,
      wallId: wall.id,
      position: [1.3, 1.5, 0.05],
      mountingHeight: 1.5,
    }),
    hand = HandShowerNode.parse({ parentId: holder.id }),
    nodes = Object.fromEntries(
      [level, wall, control, holder, hand].map((n) => [n.id, n]),
    ) as unknown as Record<string, AnyNode>,
    hose = connectShowerHose(ShowerHoseNode.parse({}), control.id, hand.id, nodes).placed,
    before = hoseConnection(hose, (id) => nodes[id])!
  expect(before.slot.id).toBe('hose')
  nodes[control.id] = {
    ...control,
    tubeSize: 0.07,
    projection: 0.15,
    mountingHeight: 0.9,
  } as unknown as AnyNode
  const after = hoseConnection(hose, (id) => nodes[id])!
  expect(after.end.distanceTo(before.end)).toBeGreaterThan(0.1)
  expect(after.slot.position[2]).toBe(0.15)
  const pose = showerArmPlacement(control, wall, 1, 'back')!
  expect(pose.position[2]).toBe(-0.05)
  expect(pose.rotation).toBe(Math.PI)
  const ctx = { resolve: (id: string) => nodes[id] } as GeometryContext
  expect(showerControlFloorplan(control, ctx)).toBeDefined()
  expect(ShowerControlNode.parse(JSON.parse(JSON.stringify(control)))).toEqual(control)
})
test('selected diverter outlet changes handle geometry without changing the valve or output slots', () => {
  const n = controlPresetNode(showerControlPresets[8]),
    edited = { ...n, selectedOutlet: 2 }
  expect(showerControlGeometryKey(n)).not.toBe(showerControlGeometryKey(edited))
  expect(showerControlSockets(n)).toEqual(showerControlSockets(edited))
  const a = buildShowerControlGeometry(n),
    b = buildShowerControlGeometry(edited)
  expect(
    a.children.find((o) => o.children.some((c) => c.userData.slotId === 'handles'))!.rotation.z,
  ).not.toBe(
    b.children.find((o) => o.children.some((c) => c.userData.slotId === 'handles'))!.rotation.z,
  )
})
