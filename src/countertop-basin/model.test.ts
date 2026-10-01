import { describe, expect, test } from 'bun:test'
import { Box3, BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Ray, Raycaster, Vector3, type Material } from 'three'
import { type AnyNode } from '@pascal-app/core'
import { CountertopBasinNode, basinDepth, basinPresets } from './schema'
import { basinGeometryKey, buildCountertopBasinGeometry } from './geometry'
import { basinPlacement } from './placement'
import { countertopBasinDefinition } from './definition'

function dispose(group: Group) {
  const materials = new Set<Material>()
  group.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
  })
  for (const material of materials) if (!material.userData.__pascalCachedMaterial) material.dispose()
}

describe('countertop basins', () => {
  test('all shapes remain finite and keep their size at parameter extremes', () => {
    for (const shape of ['round', 'oval', 'rectangle'] as const) for (const small of [true, false]) for (const taper of [0, 0.4]) {
      const node = CountertopBasinNode.parse({ shape, width: small ? 0.3 : 0.8, depth: small ? 0.3 : 0.55, height: small ? 0.08 : 0.22, wallThickness: 0.025, taper })
      const group = buildCountertopBasinGeometry(node)
      const box = new Box3().setFromObject(group), size = box.getSize(new Vector3())
      expect(box.min.y).toBeCloseTo(0, 6)
      expect(size.x).toBeCloseTo(node.width, 6)
      expect(size.y).toBeCloseTo(node.height, 6)
      expect(size.z).toBeCloseTo(basinDepth(node), 6)
      group.traverse(object => {
        if (!(object instanceof Mesh)) return
        for (const name of ['position', 'normal', 'uv']) for (const value of object.geometry.getAttribute(name).array) expect(Number.isFinite(value)).toBe(true)
      })
      dispose(group)
    }
  })
  test('the open bowl has an upward-facing floor and a through drain opening', () => {
    for (const preset of basinPresets) {
      const node = CountertopBasinNode.parse({ ...preset, drainCover: false })
      const group = buildCountertopBasinGeometry(node)
      group.updateMatrixWorld(true)
      expect(new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0)).intersectObject(group, true)).toHaveLength(0)
      const hit = new Raycaster(new Vector3(0.07, 1, 0), new Vector3(0, -1, 0)).intersectObject(group, true)[0]!
      expect(hit).toBeDefined()
      expect(hit.point.y).toBeLessThan(node.height / 2)
      expect(hit.face!.normal.y).toBeGreaterThan(0)
      expect(group.getObjectByName('basin-drain-cover')).toBeUndefined()
      dispose(group)
    }
  })
  test('geometry caching ignores pose but includes paint and bowl settings', () => {
    const node = CountertopBasinNode.parse({})
    expect(basinGeometryKey(node)).toBe(basinGeometryKey({ ...node, position: [1, 1, 1], rotation: 1, name: 'Other' }))
    expect(basinGeometryKey(node)).not.toBe(basinGeometryKey({ ...node, wallThickness: 0.02 }))
    expect(basinGeometryKey(node)).not.toBe(basinGeometryKey({ ...node, slots: { bowl: 'library:test' } }))
  })
  test('UV islands have no collapsed or flipped triangles across every shape and parameter extremes', () => {
    for (const shape of ['round', 'oval', 'rectangle'] as const) for (const small of [true, false]) for (const taper of [0, 0.4]) {
      const node = CountertopBasinNode.parse({ shape, width: small ? 0.3 : 0.8, depth: small ? 0.3 : 0.55,
        height: small ? 0.08 : 0.22, wallThickness: small ? 0.025 : 0.006, taper })
      const group = buildCountertopBasinGeometry(node)
      const mesh = group.getObjectByName('basin-bowl') as Mesh
      const geometry = mesh.geometry, uv = geometry.getAttribute('uv'), index = geometry.getIndex()!
      let offset = 0
      for (const ringSpans of [24, 20, 8, 1, 1]) {
        let sign = 0
        for (let i = offset; i < offset + ringSpans * 96 * 6; i += 3) {
          const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
          const area = (uv.getX(b) - uv.getX(a)) * (uv.getY(c) - uv.getY(a))
            - (uv.getY(b) - uv.getY(a)) * (uv.getX(c) - uv.getX(a))
          expect(Math.abs(area)).toBeGreaterThan(1e-12)
          sign ||= Math.sign(area)
          expect(Math.sign(area)).toBe(sign)
        }
        offset += ringSpans * 96 * 6
      }
      expect(offset).toBe(index.count)
      dispose(group)
    }
  })
  test('the rear wrap seam has matching positions and normals with separate UV endpoints', () => {
    for (const preset of basinPresets) {
      const group = buildCountertopBasinGeometry(CountertopBasinNode.parse(preset))
      const geometry = (group.getObjectByName('basin-bowl') as Mesh).geometry
      const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
      let offset = 0
      for (const [count, curved] of [[25, true], [21, true], [9, false], [2, true], [2, false]] as const) {
        for (let r = 0; r < count; r++) {
          const a = offset + r * 97, b = a + 96
          for (const attr of [position, normal]) {
            expect(attr.getX(a)).toBe(attr.getX(b))
            expect(attr.getY(a)).toBe(attr.getY(b))
            expect(attr.getZ(a)).toBe(attr.getZ(b))
          }
          expect(position.getX(a)).toBeCloseTo(0)
          expect(position.getZ(a)).toBeGreaterThan(0)
          if (curved) {
            expect(uv.getX(a)).toBe(0)
            expect(uv.getX(b)).toBeGreaterThan(0)
            expect(uv.getY(a)).toBe(uv.getY(b))
            // Equal UV length and surface length around every ring.
            for (let i = a; i < b; i++) {
              const length = Math.hypot(position.getX(i + 1) - position.getX(i), position.getZ(i + 1) - position.getZ(i))
              expect(uv.getX(i + 1) - uv.getX(i)).toBeCloseTo(length, 6)
            }
          }
        }
        offset += count * 97
      }
      dispose(group)
    }
  })
  test('bowl floor, underside, and drain cover caps use planar metre-scale UVs', () => {
    const group = buildCountertopBasinGeometry(CountertopBasinNode.parse({ shape: 'rectangle' }))
    const geometry = (group.getObjectByName('basin-bowl') as Mesh).geometry
    const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
    for (const [start, count] of [[46 * 97, 9 * 97], [57 * 97, 2 * 97]]) {
      for (let i = start!; i < start! + count!; i++) {
        expect(uv.getX(i)).toBe(position.getX(i))
        expect(uv.getY(i)).toBe(position.getZ(i))
      }
    }
    const drain = (group.getObjectByName('basin-drain-cover') as Mesh).geometry
    const drainPos = drain.getAttribute('position'), drainUV = drain.getAttribute('uv'), normal = drain.getAttribute('normal')
    for (let i = 0; i < drainPos.count; i++) if (Math.abs(normal.getY(i)) > 0.5) {
      expect(drainUV.getX(i)).toBe(drainPos.getX(i))
      expect(drainUV.getY(i)).toBe(drainPos.getZ(i))
    }
    expect(drainUV.getX(48) - drainUV.getX(0)).toBeCloseTo(Math.PI * 2 * (0.045 / 2 + 0.004))
    expect(drainUV.getY(0) - drainUV.getY(49)).toBeCloseTo(0.004)
    dispose(group)
  })
  test('bowl and drain have independent white paint slots', () => {
    const node = CountertopBasinNode.parse({}), group = buildCountertopBasinGeometry(node)
    for (const name of ['basin-bowl', 'basin-drain-cover']) {
      const mesh = group.getObjectByName(name) as Mesh
      expect(mesh.userData.__fromGeometry).toBe(true)
      expect((mesh.material as Material & { color: { getHexString(): string } }).color.getHexString()).toBe('ffffff')
    }
    const patch = countertopBasinDefinition.capabilities!.paint!.buildPatch!({ node: { ...node, slots: { drain: 'old' } } as unknown as AnyNode, role: 'bowl', materialPreset: 'new' })
    expect(patch).toEqual({ slots: { drain: 'old', bowl: 'new' } })
    dispose(group)
  })
})

function surfaceScene() {
  const scene = new Group()
  const table = new Mesh(new BoxGeometry(2, 0.2, 2), new MeshBasicMaterial())
  table.position.set(1, 1.1, 2)
  scene.add(table)
  return { scene, table }
}

describe('basin surface placement', () => {
  test('arbitrary item geometry determines height without a vanity schema or footprint restriction', () => {
    const { scene } = surfaceScene()
    const ray = new Ray(new Vector3(1.95, 4, 2), new Vector3(0, -1, 0))
    const placed = basinPlacement(ray, scene, new Matrix4(), 0.5, 0.5)!
    expect(placed.position[0]).toBeCloseTo(1.95)
    expect(placed.position[1]).toBeCloseTo(1.2)
    expect(placed.position[2]).toBeCloseTo(2)
    expect(placed.rotation).toBe(0.5)
    dispose(scene)
  })
  test('nearest cursor hit wins; perspective placement uses the actual mesh intersection', () => {
    const { scene, table } = surfaceScene()
    const shelf = table.clone()
    shelf.position.y = 2.1
    scene.add(shelf)
    const ray = new Ray(new Vector3(1, 4, 3.5), new Vector3(0, -1, -0.5).normalize())
    const placed = basinPlacement(ray, scene, new Matrix4(), 0)!
    expect(placed.position[1]).toBeCloseTo(2.2)
    expect(placed.position[2]).toBeCloseTo(2.6)
    dispose(scene)
  })
  test('empty space falls back to ground, including grid snap, with no fixed elevation', () => {
    const scene = new Group()
    expect(CountertopBasinNode.parse({}).position[1]).toBe(0)
    const ray = new Ray(new Vector3(0.23, 5, 0.68), new Vector3(0, -1, 0))
    expect(basinPlacement(ray, scene, new Matrix4(), 0, 0.5)?.position).toEqual([0, 0, 0.5])
    expect(basinPlacement(new Ray(new Vector3(0, 1, 0), new Vector3(0, 1, 0)), scene, new Matrix4(), 0)).toBeNull()
  })
  test('hidden parents, transparent picking proxies, overlays, and preview meshes cannot intercept placement', () => {
    const { scene, table } = surfaceScene()
    const hiddenParent = new Group(), preview = new Group()
    const addAbove = (parent: Group, y: number) => { const mesh = table.clone(); mesh.position.y = y; parent.add(mesh); return mesh }
    scene.add(hiddenParent, preview)
    addAbove(hiddenParent, 2)
    hiddenParent.visible = false
    const proxy = addAbove(scene, 3)
    proxy.material = new MeshBasicMaterial({ transparent: true, opacity: 0 })
    const overlay = addAbove(scene, 4)
    overlay.layers.set(1)
    addAbove(preview, 5)
    const placed = basinPlacement(new Ray(new Vector3(1, 8, 2), new Vector3(0, -1, 0)), scene, new Matrix4(), 0, 0, [preview])!
    expect(placed.position[1]).toBeCloseTo(1.2)
    dispose(scene)
  })
  test('sloped ground and transformed levels preserve the surface intersection', () => {
    const scene = new Group(), level = new Group()
    level.position.set(8, 3, -2)
    level.rotation.y = 0.6
    scene.add(level)
    const ground = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial())
    ground.rotation.x = -Math.PI / 2 + 0.15
    level.add(ground)
    scene.updateMatrixWorld(true)
    const ray = new Ray(new Vector3(1, 10, 1), new Vector3(0, -1, 0)).applyMatrix4(level.matrixWorld)
    const placed = basinPlacement(ray, scene, level.matrixWorld, 0)!
    expect(placed.position[0]).toBeCloseTo(1)
    expect(placed.position[2]).toBeCloseTo(1)
    expect(Math.abs(placed.position[1])).toBeGreaterThan(0.1)
    const empty = new Group()
    expect(basinPlacement(ray, empty, level.matrixWorld, 0)?.position[1]).toBeCloseTo(0)
    dispose(scene)
  })
})
