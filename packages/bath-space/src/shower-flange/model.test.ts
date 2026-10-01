import { expect, test } from 'bun:test'
import { WallNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Mesh, Raycaster, Vector3, Box3 } from 'three'
import { ShowerFlangeNode, showerFlangePresets, flangePresetNode } from './schema'
import { buildShowerFlangeGeometry, flangeFit } from './geometry'
import { attachShowerFlange } from './attachment'
import { ShowerArmNode } from '../shower-arm/schema'
import { buildShowerArmGeometry } from '../shower-arm/geometry'
import { showerHeadTarget } from '../shower-arm/attachment'
import { showerFlangeFloorplan } from './floorplan'
test('covers retain real hollow openings and finite geometry across styles and host tube limits', () => {
  for (const p of showerFlangePresets)
    for (const max of [false, true])
      for (const square of [false, true]) {
        const arm = ShowerArmNode.parse({
          style: square ? 'square-elbow' : 'round-curved',
          tubeSize: max ? 0.06 : 0.015,
        })
        const n = ShowerFlangeNode.parse({
          ...flangePresetNode(p),
          parentId: arm.id,
          width: max ? 0.18 : 0.04,
          depth: max ? 0.06 : 0.003,
        })
        const ctx = { resolve: () => arm } as GeometryContext,
          root = buildShowerFlangeGeometry(n, ctx),
          fit = flangeFit(n, ctx)
        expect(fit.bore).toBeGreaterThan(arm.tubeSize)
        const bounds = new Box3().setFromObject(root)
        expect(bounds.min.z).toBeCloseTo(0, 5)
        expect(bounds.max.z).toBeCloseTo(n.depth, 5)
        root.updateMatrixWorld(true)
        expect(
          new Raycaster(new Vector3(0, 0, 0.2), new Vector3(0, 0, -1)).intersectObject(root, true),
        ).toHaveLength(0)
        root.traverse((o) => {
          if (o instanceof Mesh) {
            for (const attr of ['position', 'normal'])
              for (const v of o.geometry.getAttribute(attr).array)
                expect(Number.isFinite(v)).toBe(true)
            o.geometry.dispose()
          }
        })
        expect(ShowerFlangeNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
      }
})
test('cover replacement and movement preserve the independent arm head slot and fitted plan pose', () => {
  const wall = WallNode.parse({ start: [0, 0], end: [4, 0] }),
    arm = ShowerArmNode.parse({ parentId: wall.id, wallId: wall.id }),
    nodes = { [wall.id]: wall, [arm.id]: arm } as Record<string, AnyNode>
  const headBefore = showerHeadTarget(arm),
    first = attachShowerFlange(ShowerFlangeNode.parse({}), arm.id, nodes).placed
  nodes[first.id] = first as unknown as AnyNode
  const next = attachShowerFlange(ShowerFlangeNode.parse({ style: 'deep-bell' }), arm.id, nodes)
  expect(next.changes.delete).toEqual([first.id])
  expect(attachShowerFlange(first, arm.id, nodes, first.id).placed.id).toBe(first.id)
  expect(showerHeadTarget(arm)).toEqual(headBefore)
  const model = buildShowerArmGeometry(arm)
  expect(model.getObjectByName('shower_flange_target_wall-cover')!.position.toArray()).toEqual([
    0, 0, 0,
  ])
  expect(model.getObjectByName('showerhead_target_shower-head')!.position.toArray()).toEqual(
    headBefore.position,
  )
  const ctx = { resolve: (id: string) => nodes[id] } as GeometryContext
  expect(showerFlangeFloorplan(first, ctx)?.kind).toBe('polygon')
  nodes[arm.id] = { ...arm, tubeSize: 0.06, style: 'square-straight' } as unknown as AnyNode
  expect(flangeFit(first, ctx).bore).toBe(0.062)
  expect(() => attachShowerFlange(first, wall.id, nodes)).toThrow('arm')
  model.traverse((o) => {
    if (o instanceof Mesh) o.geometry.dispose()
  })
})
