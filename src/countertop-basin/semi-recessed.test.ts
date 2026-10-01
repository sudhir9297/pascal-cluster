import { expect, test } from 'bun:test'
import { LevelNode, type AnyNode } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { buildFreestandingVanityGeometry } from '../freestanding-vanity/geometry'
import { SemiRecessedClearanceCache } from '../freestanding-vanity/semi-recessed-clearance'
import { SemiRecessedBasinNode, semiRecessedBasinPresets, basinDepth } from './schema'
import { buildCountertopBasinGeometry } from './geometry'
import { basinTapTarget } from './tap-attachment'
import { semiRecessedDrainZ } from './semi-recessed-geometry'
import { InsetBasinCutCache } from './inset-cut'
import { basinPlacementCandidate } from './placement-pose'
import { basinLevelPose, vanityLocalToLevel, vanityFrontZ, basinEditSupportPatch } from './attachment'

test('semi-recessed shapes straddle the counter plane with finite UVs and an open drain', () => {
  for (const preset of semiRecessedBasinPresets) for (const recessDepth of [0.03, 0.1]) {
    const node = SemiRecessedBasinNode.parse({ ...preset, height: 0.18, recessDepth, drainCover: false })
    const root = buildCountertopBasinGeometry(node), box = new Box3().setFromObject(root)
    expect(box.max.y).toBeCloseTo(node.height - recessDepth)
    expect(box.min.y).toBeCloseTo(-recessDepth)
    root.updateMatrixWorld(true)
    expect(new Raycaster(new Vector3(0, 1, semiRecessedDrainZ(node)), new Vector3(0, -1, 0)).intersectObject(root, true)).toHaveLength(0)
    root.traverse(part => { if (part instanceof Mesh) for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(part.geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true) })
  }
})

test('semi-recessed ghost matches placement on a rotated vanity and edits preserve front projection', () => {
  const level = LevelNode.parse({}), host = FreestandingVanityNode.parse({ parentId: level.id, rotation: Math.PI / 2, position: [3, 0.2, 4] })
  const node = SemiRecessedBasinNode.parse({}), root = buildFreestandingVanityGeometry(host)
  const nodes = { [level.id]: level, [host.id]: host } as unknown as Record<string, AnyNode>
  const result = basinPlacementCandidate(node, { position: vanityLocalToLevel(host, [0, host.height, 0], nodes), surface: root.getObjectByName('vanity-countertop')! }, level.id, new Map([[host.id, root]]), nodes)!
  expect(result.preview.parentId).toBe(level.id)
  expect(result.placed.parentId).toBe(host.id)
  expect(result.placed.position[2] - basinDepth(node) / 2).toBeCloseTo(vanityFrontZ(host) - node.frontProjection)
  const placed = { ...node, ...result.placed }
  expect(basinLevelPose(placed, nodes)).toEqual({ position: result.preview.position, rotation: result.preview.rotation })
  const next = { ...placed, depth: 0.45, frontProjection: 0.14 }
  const patch = basinEditSupportPatch(placed, next, nodes)
  expect(patch.position![2] - basinDepth(next) / 2).toBeCloseTo(vanityFrontZ(host) - next.frontProjection)
})

test('semi-recessed cuts open through the counter front and removal restores source geometry', () => {
  const host = FreestandingVanityNode.parse({ width: 1.2, depth: 0.6 })
  const node = SemiRecessedBasinNode.parse({ parentId: host.id, position: [0, host.height, vanityFrontZ(host) + 0.43 / 2 - 0.1] })
  const root = buildFreestandingVanityGeometry(host), top = root.getObjectByName('vanity-countertop') as Mesh
  const cuts = new InsetBasinCutCache(), cabinets = new SemiRecessedClearanceCache()
  const children = [node] as unknown as AnyNode[]
  cuts.beginFrame(); cuts.sync(root, host, children); cuts.endFrame()
  cabinets.beginFrame(); cabinets.sync(root, host, children); cabinets.endFrame()
  const hits = (x: number, z: number) => { root.updateMatrixWorld(true); return new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObject(top) }
  expect(hits(0, vanityFrontZ(host) + 0.005)).toHaveLength(0)
  expect(hits(0.4, vanityFrontZ(host) + 0.005)).not.toHaveLength(0)
  cuts.beginFrame(); cuts.sync(root, host, []); cuts.endFrame()
  cabinets.beginFrame(); cabinets.sync(root, host, []); cabinets.endFrame()
  expect(hits(0, vanityFrontZ(host) + 0.005)).not.toHaveLength(0)
  cuts.dispose(); cabinets.dispose()
})

 test('semi-recessed models have an integrated deck and tap bore without a separate flange or plane', () => {
  for (const preset of semiRecessedBasinPresets) {
    const node = SemiRecessedBasinNode.parse(preset), root = buildCountertopBasinGeometry(node)
    expect(root.children.map(child => child.name)).toEqual(['basin-tap-target', 'basin-bowl', 'basin-drain-cover'])
    const target = basinTapTarget(node), top = node.height - node.recessDepth
    expect(target.position[1]).toBeCloseTo(top)
    root.updateMatrixWorld(true)
    const ray = (x: number, z: number) => new Raycaster(new Vector3(x, 1, z), new Vector3(0, -1, 0)).intersectObject(root, true)
    expect(ray(0, target.position[2])).toHaveLength(0)
    expect(ray(0.035, target.position[2])[0]!.point.y).toBeCloseTo(top)
    // The exposed apron remains almost full-width well below the rim.
    const bowl = root.getObjectByName('basin-bowl') as Mesh
    const side = new Raycaster(new Vector3(1, top - node.height * 0.4, 0), new Vector3(-1, 0, 0)).intersectObject(bowl)[0]!
    expect(side.point.x).toBeGreaterThan(node.width * 0.45)
  }
})
