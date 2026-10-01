import { describe, expect, test } from 'bun:test'
import { WallNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { ceramicRings } from './profile'
import { FloorStandingToiletNode, toiletLayout, toiletPresets } from './schema'
import { buildFloorStandingToiletGeometry, toiletGeometryKey } from './geometry'
import { toiletPlacement } from './placement'
import { toiletSection } from './section'
import { toiletFloorplan } from './floorplan'
import {
  defaultToiletControl,
  cisternControlPose,
  controlWallPose,
  ToiletNode,
} from '../flush-control/attachment'
import {
  CisternFlushControlNode,
  WALL_FLUSH_PLATE,
  CISTERN_FLUSH_CONTROL,
} from '../flush-control/schema'
const tanks = ['concealed', 'attached', 'low-level', 'high-level'] as const
const wall = WallNode.parse({ start: [0, 0], end: [3, 0], thickness: 0.2 })
describe('floor standing toilets', () => {
  test('all catalog designs and four cistern arrangements touch the floor and have finite geometry and sections', () => {
    for (const preset of toiletPresets)
      for (const tankType of tanks)
        for (const lidOpen of [false, true]) {
          const n = FloorStandingToiletNode.parse({
            ...preset,
            tankType,
            lidOpen,
          })
          const root = buildFloorStandingToiletGeometry(n),
            bounds = new Box3().setFromObject(root),
            layout = toiletLayout(n)
          expect(bounds.min.y + n.mountingHeight).toBeCloseTo(0, 6)
          expect(bounds.min.z).toBeCloseTo(-layout.projection / 2, 5)
          expect(bounds.max.z).toBeLessThanOrEqual(
            layout.projection / 2 + 0.001,
          )
          expect(bounds.max.y + n.mountingHeight).toBeLessThanOrEqual(
            layout.totalHeight + 0.04,
          )
          root.traverse((o) => {
            if (o instanceof Mesh) {
              expect(o.userData.slotId).not.toBe('buttons')
              for (const key of ['position', 'normal', 'uv'])
                for (const v of o.geometry.getAttribute(key).array)
                  expect(Number.isFinite(v)).toBe(true)
              o.geometry.dispose()
            }
          })
          const { drawing } = toiletSection(n)
          expect(drawing.plan + drawing.section + drawing.detail).not.toMatch(
            /NaN|Infinity/,
          )
          expect(drawing.floor).toBe(true)
          expect(drawing.height).toBe(layout.totalHeight)
        }
  })
  test('continuous ceramic body keeps a recessed bowl and attached tanks have no exposed pipe', () => {
    for (const preset of toiletPresets) {
      const n = FloorStandingToiletNode.parse({ ...preset, lidEnabled: false })
      const root = buildFloorStandingToiletGeometry(n)
      root.updateMatrixWorld(true)
      const hits = new Raycaster(
        new Vector3(0.04, 1, -toiletLayout(n).rearSpace / 2),
        new Vector3(0, -1, 0),
      ).intersectObject(root, true)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0]!.point.y).toBeLessThan(-0.08)
      const body = root.children[0] as Mesh
      body.geometry.computeBoundingBox()
      expect(body.geometry.boundingBox!.min.y).toBeCloseTo(-n.mountingHeight, 6)
      if (n.tankType === 'attached')
        expect(
          root.children.filter((o) => o.userData.slotId === 'hardware'),
        ).toHaveLength(0)
      const rings = ceramicRings(n)
      const drawing = toiletSection(n).drawing
      for (const [width, , y] of rings)
        expect(drawing.section).toContain(
          `${drawing.width / 2 - width / 2},${drawing.height - n.mountingHeight - y}`,
        )
      root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    }
  })
  test('both wall faces place the floor-supported base correctly and provide a movable plan', () => {
    for (const preset of toiletPresets)
      for (const side of ['front', 'back'] as const) {
        const n = FloorStandingToiletNode.parse(preset),
          p = toiletPlacement(n, wall, 2.99, side)!
        expect(p.position[1]).toBe(n.mountingHeight)
        expect(
          Math.abs(p.position[2]) - toiletLayout(n).projection / 2,
        ).toBeCloseTo(0.1)
        expect(
          toiletFloorplan({ ...n, ...p }, {
            resolve: () => wall,
          } as unknown as GeometryContext)?.kind,
        ).toBe('group')
        expect(
          toiletPlacement(n, { ...wall, end: [0.2, 0] }, 0, side),
        ).toBeNull()
      }
  })
  test('controls are independent items and tank controls follow resizing and floor plan placement', () => {
    for (const preset of toiletPresets) {
      const n = FloorStandingToiletNode.parse(preset),
        p = toiletPlacement(n, wall, 1, 'front')!,
        toilet = { ...n, ...p }
      const nodes = { [wall.id]: wall, [n.id]: toilet as unknown as AnyNode },
        control = defaultToiletControl(toilet, nodes)!
      expect(ToiletNode.safeParse(toilet).success).toBe(true)
      expect(control.type).toBe(
        n.tankType === 'concealed' ? WALL_FLUSH_PLATE : CISTERN_FLUSH_CONTROL,
      )
      expect(control.id).not.toBe(n.id)
      expect(controlWallPose(control, nodes)).not.toBeNull()
      if (control.type === CISTERN_FLUSH_CONTROL) {
        expect(control.parentId).toBe(n.id)
        const buttons = CisternFlushControlNode.parse(control),
          pose = cisternControlPose(buttons, toilet)
        const changed = cisternControlPose(buttons, {
          ...toilet,
          tankHeight: n.tankHeight + 0.1,
        })
        expect(changed.position[1] - pose.position[1]).toBeCloseTo(0.1)
      }
    }
  })
  test('new cistern dimensions drive geometry, section fields and independent flush control height', () => {
    for (const preset of toiletPresets.filter(
      (p) =>
        p.design.startsWith('two-piece') || p.design.startsWith('one-piece'),
    )) {
      const n = FloorStandingToiletNode.parse(preset)
      for (const tankLidThickness of [0.008, 0.035]) {
        const changed = {
          ...n,
          tankLidThickness,
          couplingGap: 0.06,
          tankTaper: 0.25,
        }
        const layout = toiletLayout(changed),
          root = buildFloorStandingToiletGeometry(changed)
        expect(
          new Box3().setFromObject(root).max.y + changed.mountingHeight,
        ).toBeCloseTo(layout.totalHeight, 5)
        const section = toiletSection(changed)
        for (const key of ['tankCornerRadius', 'tankLidThickness', 'tankTaper'])
          expect(section.dimensions.some((d) => d.key === key)).toBe(true)
        expect(section.dimensions.some((d) => d.key === 'couplingGap')).toBe(
          changed.construction !== 'one-piece' &&
            changed.design !== 'one-piece',
        )
        const control = CisternFlushControlNode.parse({})
        expect(
          cisternControlPose(control, changed).position[1] +
            changed.mountingHeight,
        ).toBeCloseTo(layout.tankBottom + changed.tankHeight + tankLidThickness)
        expect(toiletGeometryKey(changed)).not.toBe(toiletGeometryKey(n))
        root.traverse((o) => {
          if (o instanceof Mesh) o.geometry.dispose()
        })
      }
    }
  })
  test('floor support bounds are enforced and geometry keys respond to base changes', () => {
    expect(
      FloorStandingToiletNode.safeParse({ height: 0.38, mountingHeight: 0.36 })
        .success,
    ).toBe(false)
    const n = FloorStandingToiletNode.parse({}),
      key = toiletGeometryKey(n)
    expect(
      toiletGeometryKey({ ...n, position: [2, 0.4, 3], rotation: Math.PI }),
    ).toBe(key)
    for (const patch of [
      { baseWidth: 0.2 },
      { baseDepth: 0.3 },
      { baseStyle: 'pedestal' as const },
      { design: 'one-piece' as const },
      { mountingHeight: 0.48 },
    ])
      expect(toiletGeometryKey({ ...n, ...patch })).not.toBe(key)
  })
})
