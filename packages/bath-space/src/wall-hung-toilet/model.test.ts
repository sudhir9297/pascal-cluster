import { describe, expect, test } from 'bun:test'
import { WallNode, type GeometryContext } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { WallHungToiletNode, toiletLayout, toiletPresets } from './schema'
import { buildWallHungToiletGeometry, toiletGeometryKey } from './geometry'
import { toiletPlacement } from './placement'
import { toiletSection } from './section'
import { toiletFloorplan } from './floorplan'
const tanks = ['concealed', 'attached', 'low-level', 'high-level'] as const
function dispose(root: ReturnType<typeof buildWallHungToiletGeometry>) {
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose()
      if (
        !Array.isArray(o.material) &&
        !o.material.userData.__pascalCachedMaterial
      )
        o.material.dispose()
    }
  })
}
describe('wall hung toilets', () => {
  test('all twenty style/tank combinations have finite closed geometry, UVs, floor clearance and matching plan bounds', () => {
    for (const preset of toiletPresets)
      for (const tankType of tanks)
        for (const lidOpen of [false, true]) {
          const n = WallHungToiletNode.parse({ ...preset, tankType, lidOpen }),
            l = toiletLayout(n),
            root = buildWallHungToiletGeometry(n),
            box = new Box3().setFromObject(root)
          expect(box.min.y + n.mountingHeight).toBeGreaterThan(0)
          expect(box.max.z).toBeLessThanOrEqual(l.projection / 2 + 0.001)
          expect(box.min.z).toBeCloseTo(-l.projection / 2, 5)
          expect(box.max.y + n.mountingHeight).toBeLessThanOrEqual(
            l.totalHeight + 0.04,
          )
          root.traverse((o) => {
            if (o instanceof Mesh)
              for (const key of ['position', 'normal', 'uv'])
                for (const v of o.geometry.getAttribute(key).array)
                  expect(Number.isFinite(v)).toBe(true)
          })
          const section = toiletSection(n).drawing
          expect(section.depth).toBe(l.projection)
          expect(section.height).toBe(l.totalHeight)
          expect(section.plan + section.section + section.detail).not.toMatch(
            /NaN|Infinity/,
          )
          dispose(root)
        }
  })
  test('seat opening exposes a recessed ceramic bowl when the lid is removed', () => {
    const n = WallHungToiletNode.parse({ lidEnabled: false }),
      root = buildWallHungToiletGeometry(n)
    root.updateMatrixWorld(true)
    const hits = new Raycaster(
      new Vector3(0.04, 1, 0),
      new Vector3(0, -1, 0),
    ).intersectObject(root, true)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]!.point.y).toBeLessThan(-0.1)
    dispose(root)
  })
  test('either wall face retains the mounting height and tank-aware projection after resize', () => {
    const wall = WallNode.parse({ start: [0, 0], end: [3, 0], thickness: 0.2 })
    for (const tankType of tanks)
      for (const side of ['front', 'back'] as const) {
        const n = WallHungToiletNode.parse({
            tankType,
            tankWidth: 0.55,
            mountingHeight: 0.5,
          }),
          l = toiletLayout(n),
          p = toiletPlacement(n, wall, 2.99, side)!
        expect(Math.abs(p.position[2]) - l.projection / 2).toBeCloseTo(0.1)
        expect(p.position[1]).toBe(0.5)
        expect(p.mountingHeight).toBe(0.5)
        expect(p.position[0]).toBeCloseTo(
          3 - Math.max(n.width, l.external ? n.tankWidth : 0) / 2,
        )
        const plan = toiletFloorplan({ ...n, ...p }, {
          resolve: () => wall,
        } as unknown as GeometryContext)
        expect(plan?.kind).toBe('group')
        expect(
          toiletPlacement(n, { ...wall, end: [0.2, 0] }, 0, side),
        ).toBeNull()
      }
  })
  test('minimum and maximum dimensions produce valid mesh and section data', () => {
    for (const small of [true, false])
      for (const tankType of tanks) {
        const n = WallHungToiletNode.parse({
            tankType,
            width: small ? 0.32 : 0.48,
            depth: small ? 0.42 : 0.75,
            height: small ? 0.22 : 0.38,
            mountingHeight: 0.65,
            wallThickness: 0.035,
            taper: 0.45,
            tankBottom: 1.9,
          }),
          root = buildWallHungToiletGeometry(n)
        expect(new Box3().setFromObject(root).isEmpty()).toBe(false)
        expect(toiletSection(n).drawing.section).not.toMatch(/NaN|Infinity/)
        dispose(root)
      }
  })
  test('wall-mounted toilets accept the cursor height without a recommended-height clamp', () => {
    for (const mountingHeight of [0.1, 0.35, 1.8, 3.2]) {
      const n = WallHungToiletNode.parse({ mountingHeight })
      const wall = WallNode.parse({ start: [0, 0], end: [3, 0] })
      expect(toiletPlacement(n, wall, 1, 'front')!.position[1]).toBe(
        mountingHeight,
      )
      expect(
        toiletSection(n).dimensions.find((d) => d.key === 'mountingHeight')!
          .max,
      ).toBeGreaterThanOrEqual(mountingHeight)
    }
  })
  test('mesh keys follow geometric settings but ignore placement and identity', () => {
    const n = WallHungToiletNode.parse({}),
      key = toiletGeometryKey(n)
    expect(
      toiletGeometryKey({ ...n, position: [2, 0.42, 3], rotation: Math.PI }),
    ).toBe(key)
    for (const patch of [
      { tankType: 'attached' as const },
      { width: 0.4 },
      { mountingHeight: 0.5 },
      { lidOpen: true },
      { slots: { ceramic: '#000000' } },
    ])
      expect(toiletGeometryKey({ ...n, ...patch })).not.toBe(key)
  })
})
