import {bathDrainPosition} from './drain'
import { bathWallSnap } from './wall-snap'
import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode } from '@pascal-app/core'
import { Box3, Matrix4, Mesh, Ray, Raycaster, Vector3 } from 'three'
import { BathtubNode, bathtubPresets, bathDrainX, bathBowlDepth } from './schema'
import { bathCornerOutline, buildBathtubGeometry, bathtubGeometryKey } from './geometry'
import {
  bathTapTarget,
  bathWallTapTarget,
  bathTapLocalToLevel,
  BATH_TAP_TARGET_NAME,
  BATH_WALL_TAP_TARGET_NAME,
} from './targets'
import { tapPlacementCandidate, tapPlacementChanges } from '../taps/placement'
import { TapNode } from '../taps/schema'
import { tapPresets } from '../taps/presets'
import { attachedTapPose, tapLevelPose } from '../taps/attachment'
import {
  followingWallTapPlacement,
  resolveWallTapTarget,
  wallTapAttachmentChanges,
} from '../taps/binding'
import { wallTapPlacement } from '../taps/wall-placement'
import { clearBasinServiceLinks } from '../attachments/lifecycle'

function dispose(group: ReturnType<typeof buildBathtubGeometry>) {
  group.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      for (const material of materials)
        if (!material.userData.__pascalCachedMaterial) material.dispose()
    }
  })
}
test('bath shapes remain hollow, floor anchored, and finite at dimension extremes', () => {
  for (const preset of bathtubPresets)
    for (const small of [true, false])
      for (const tapMount of ['rim', 'wall'] as const) {
        const node = BathtubNode.parse({
          ...preset,
          length: small ? 1.2 : 2.2,
          width: small ? 0.65 : 1.1,
          height: small ? 0.45 : 0.75,
          bowlDepth: 0.55,
          rimWidth: small ? 0.035 : 0.12,
          tapMount,
          drainCover: false,
        })
        const group = buildBathtubGeometry(node),
          box = new Box3().setFromObject(group),
          size = box.getSize(new Vector3())
        expect(box.min.y).toBeCloseTo(0, 6)
        expect(size.x).toBeCloseTo(node.length, 6)
        expect(size.z).toBeCloseTo(node.width+(node.shape==='walk-in'?0.05:0), 6)
        if (node.shape === 'slipper') {
          expect(box.max.y).toBeGreaterThan(node.height + 0.12)
          expect(box.max.y).toBeLessThanOrEqual(node.height + 0.14)
        } else expect(box.max.y).toBeCloseTo(node.height, 5)
        group.updateMatrixWorld(true)
        expect(
          new Raycaster(
            new Vector3(bathDrainPosition(node)[0], 2, bathDrainPosition(node)[1]),
            new Vector3(0, -1, 0),
          ).intersectObject(group, true),
        ).toHaveLength(0)
        const floor = new Raycaster(
          new Vector3(0.1, 2, 0),
          new Vector3(0, -1, 0),
        ).intersectObject(group, true)[0]!
        expect(floor).toBeDefined()
        expect(floor.point.y).toBeLessThan(node.height - 0.2)
        expect(floor.face!.normal.y).toBeGreaterThan(0)
        expect(bathBowlDepth(node)).toBeLessThanOrEqual(node.height - 0.07)
        group.traverse((object) => {
          if (object instanceof Mesh)
            for (const name of ['position', 'normal', 'uv'])
              for (const value of object.geometry.getAttribute(name).array)
                expect(Number.isFinite(value)).toBe(true)
        })
        dispose(group)
      }
})
test('mount modes expose the appropriate empty capacity-one target', () => {
  for (const tapMount of ['rim', 'wall', 'none'] as const) {
    const node = BathtubNode.parse({ tapMount }),
      group = buildBathtubGeometry(node)
    const rim = group.getObjectByName(BATH_TAP_TARGET_NAME),
      wall = group.getObjectByName(BATH_WALL_TAP_TARGET_NAME)
    expect(Boolean(rim)).toBe(tapMount === 'rim')
    expect(Boolean(wall)).toBe(tapMount === 'wall')
    const target = rim ?? wall
    if (target) {
      expect(target.children).toHaveLength(0)
      expect(target.userData.capacity).toBe(1)
      expect(target.userData.slotId).toBe('tap')
    }
    dispose(group)
  }
})
test('rim placement and replacement share a pose and follow bath movement and resizing', () => {
  const level = LevelNode.parse({}),
    bath = BathtubNode.parse({ parentId: level.id, tapMount: 'rim' }),
    group = buildBathtubGeometry(bath)
  const nodes = { [level.id]: level, [bath.id]: bath } as unknown as Record<
    string,
    AnyNode
  >
  const candidate = tapPlacementCandidate(
    new Ray(new Vector3(0.1, 3, 0), new Vector3(0, -1, 0)),
    group,
    new Matrix4(),
    level.id,
    new Map([[bath.id, group]]),
    nodes,
  )!
  expect(candidate).not.toBeNull()
  expect(candidate.position).toEqual(bathTapTarget(bath).position)
  const first = tapPlacementChanges(TapNode.parse({}), candidate, nodes).placed
  const next = tapPlacementChanges(TapNode.parse({}), candidate, {
    ...nodes,
    [first.id]: first as unknown as AnyNode,
  })
  expect(next.changes.delete).toContain(first.id)
  expect(next.placed.parentId).toBe(bath.id)
  const moved = {
    ...bath,
    position: [2, 0, 3] as [number, number, number],
    rotation: Math.PI / 2,
    width: 1,
    height: 0.7,
  }
  const movedNodes = { ...nodes, [bath.id]: moved as unknown as AnyNode }
  expect(attachedTapPose(first, movedNodes).local.position).toEqual(
    bathTapTarget(moved).position,
  )
  expect(tapLevelPose(first, movedNodes)).toEqual(
    bathTapLocalToLevel(moved, bathTapTarget(moved)),
  )
  dispose(group)
})
test('wall and disabled modes reject countertop placement and three-hole assemblies reject rim mounting', () => {
  const level = LevelNode.parse({})
  for (const tapMount of ['wall', 'none'] as const) {
    const bath = BathtubNode.parse({ parentId: level.id, tapMount }),
      group = buildBathtubGeometry(bath)
    expect(
      tapPlacementCandidate(
        new Ray(new Vector3(0.1, 3, 0), new Vector3(0, -1, 0)),
        group,
        new Matrix4(),
        level.id,
        new Map([[bath.id, group]]),
        { [level.id]: level, [bath.id]: bath } as unknown as Record<
          string,
          AnyNode
        >,
      ),
    ).toBeNull()
    dispose(group)
  }
  const bath = BathtubNode.parse({ parentId: level.id, tapMount: 'rim' }),
    nodes = { [level.id]: level, [bath.id]: bath } as unknown as Record<
      string,
      AnyNode
    >
  const candidate = {
    parentId: bath.id,
    slotId: 'tap',
    ...bathTapTarget(bath),
    levelPose: bathTapLocalToLevel(bath, bathTapTarget(bath)),
  }
  expect(() =>
    tapPlacementChanges(
      TapNode.parse({ mountingLayout: 'three-hole' }),
      candidate,
      nodes,
    ),
  ).toThrow('single-hole')
})
test('wall fittings retain their wall parent, replace the served slot and follow bath edits', () => {
  const level = LevelNode.parse({}),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 0] })
  const bath = BathtubNode.parse({ parentId: level.id, position: [2, 0, -0.5] })
  const node = TapNode.parse({
    presetId: tapPresets.find((p) => p.mount === 'wall')!.id,
    position: [2, bath.height + 0.15, 0],
  })
  const nodes = {
    [level.id]: level,
    [wall.id]: wall,
    [bath.id]: bath,
  } as unknown as Record<string, AnyNode>
  const target = wallTapPlacement(node, wall, 2, 'back')!,
    placed = resolveWallTapTarget(node, target, nodes)
  expect(placed.parentId).toBe(wall.id)
  expect(placed.servesBathId).toBe(bath.id)
  expect(placed.servesBasinId).toBeNull()
  const moved = {
    ...bath,
    position: [2.4, 0, -0.5] as [number, number, number],
    height: 0.7,
  }
  const movedNodes = {
    ...nodes,
    [bath.id]: moved as unknown as AnyNode,
    [placed.id]: placed as unknown as AnyNode,
  }
  expect(
    followingWallTapPlacement(placed, movedNodes)!.position[0],
  ).toBeCloseTo(2.4)
  expect(
    followingWallTapPlacement(placed, movedNodes)!.position[1],
  ).toBeCloseTo(0.85)
  const replacement = resolveWallTapTarget(
    TapNode.parse({ ...node, id: undefined }),
    target,
    nodes,
  )
  expect(
    wallTapAttachmentChanges(replacement, {
      ...nodes,
      [placed.id]: placed as unknown as AnyNode,
    }).delete,
  ).toContain(placed.id)
  const cleared = clearBasinServiceLinks(
    bath,
    movedNodes as Parameters<typeof clearBasinServiceLinks>[1],
  )[0]!
  expect((cleared.data as unknown as TapNode).servesBathId).toBeNull()
  expect((cleared.data as unknown as TapNode).position).toEqual(
    followingWallTapPlacement(placed, movedNodes)!.position,
  )
  const disabled = { ...bath, tapMount: 'none' as const }
  expect(
    resolveWallTapTarget(node, target, {
      ...nodes,
      [bath.id]: disabled as unknown as AnyNode,
    }).servesBathId,
  ).toBeNull()
})
test('bath cache keys ignore pose but include shape, dimensions, paint and target changes', () => {
  const bath = BathtubNode.parse({})
  expect(bathtubGeometryKey(bath)).toBe(
    bathtubGeometryKey({
      ...bath,
      position: [2, 0, 3],
      rotation: 1,
      name: 'Renamed',
    }),
  )
  for (const patch of [
    { shape: 'slipper' as const },
    { width: 1 },
    { slots: { shell: 'material:white' } },
    { tapMount: 'rim' as const },
    {
      wallTapTarget: {
        position: [0, 1, 1] as [number, number, number],
        rotation: 0,
      },
    },
  ])
    expect(bathtubGeometryKey(bath)).not.toBe(
      bathtubGeometryKey({ ...bath, ...patch }),
    )
  expect(bathWallTapTarget({ ...bath, height: 0.7 }).position[1]).toBeCloseTo(
    0.85,
  )
})

test('all bath support styles preserve floor contact, rim height, bowl depth and separate paint slots', () => {
  for (const baseStyle of ['claw', 'rounded', 'pedestal', 'integrated'] as const)
    for (const baseHeight of [0.08, 0.2]) {
      const node = BathtubNode.parse({ shape: 'clawfoot', baseStyle, baseHeight, height: 0.45, bowlDepth: 0.55 })
      const group = buildBathtubGeometry(node)
      const bounds = new Box3().setFromObject(group)
      expect(bounds.min.y).toBeCloseTo(0, 6)
      expect(bounds.max.y).toBeCloseTo(node.height, 6)
      const floor = new Raycaster(new Vector3(0.1, 2, 0), new Vector3(0, -1, 0)).intersectObject(group, true).find(hit => ['bathtub-shell','bathtub-interior'].includes(hit.object.name))!
      expect(floor.point.y).toBeCloseTo(node.height - bathBowlDepth(node), 2)
      let supports = 0
      group.traverse(object => {
        if (object instanceof Mesh && object.userData.slotId === 'base') supports++
      })
      expect(supports > 0).toBe(baseStyle !== 'integrated')
      expect(bathtubGeometryKey(node)).not.toBe(bathtubGeometryKey({ ...node, baseHeight: baseHeight === 0.08 ? 0.2 : 0.08 }))
      dispose(group)
    }
})

test('back-to-wall baths have a flat rear shell and snap to either straight wall face', () => {
  const level = LevelNode.parse({}), wall = WallNode.parse({ parentId: level.id, start: [2, 3], end: [6, 6], thickness: 0.2 })
  level.children = [wall.id]
  const node = BathtubNode.parse({ shape: 'back-to-wall' })
  const group = buildBathtubGeometry(node)
  const shell = group.getObjectByName('bathtub-shell') as Mesh
  const positions = shell.geometry.getAttribute('position')
  let rearFloorVertices = 0
  for (let i = 0; i < positions.count; i++)
    if (Math.abs(positions.getY(i)) < 1e-6 && Math.abs(positions.getZ(i) - node.width / 2) < 1e-6) rearFloorVertices++
  expect(rearFloorVertices).toBeGreaterThan(20)
  for (const sign of [-1, 1]) {
    const offset = sign * (0.1 + node.width / 2)
    const candidate: [number, number, number] = [4 - 0.6 * offset, 0, 4.5 + 0.8 * offset]
    const result = bathWallSnap({ node: node as unknown as AnyNode, candidatePosition: candidate, candidateRotation: 0, nodes: { [level.id]: level, [wall.id]: wall }, levelId: level.id, movingIds: [] })!
    expect(result).not.toBeNull()
    const rear = bathTapLocalToLevel({ ...node, ...result }, { position: [0, 0, node.width / 2], rotation: 0 }).position
    const perpendicular = (rear[0] - wall.start[0]) * -0.6 + (rear[2] - wall.start[1]) * 0.8
    expect(perpendicular).toBeCloseTo(sign * 0.1, 6)
    expect(result.position[1]).toBe(0)
  }
  expect(bathWallSnap({ node: { ...node, shape: 'oval' } as unknown as AnyNode, candidatePosition: [4, 0, 4.5], nodes: { [level.id]: level, [wall.id]: wall }, levelId: level.id, movingIds: [] })).toBeNull()
  dispose(group)
})

test('alcove baths fit a complete bay, centre between side walls and reject incomplete or narrow bays', () => {
  const level = LevelNode.parse({})
  const back = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0], thickness: 0.1 })
  const left = WallNode.parse({ parentId: level.id, start: [0.4, 0], end: [0.4, 1.2], thickness: 0.1 })
  const right = WallNode.parse({ parentId: level.id, start: [2.2, 0], end: [2.2, 1.2], thickness: 0.1 })
  level.children = [back.id, left.id, right.id]
  const node = BathtubNode.parse({ shape: 'alcove', length: 1.7, width: 0.8 })
  const args = { node: node as unknown as AnyNode, candidatePosition: [1.4, 0, 0.45] as [number, number, number], nodes: { [level.id]: level, [back.id]: back, [left.id]: left, [right.id]: right }, levelId: level.id, movingIds: [] }
  const pose = bathWallSnap(args)!
  expect(pose.position[0]).toBeCloseTo(1.3, 6)
  expect(pose.position[2]).toBeCloseTo(0.45, 6)
  expect(pose.rotation).toBeCloseTo(Math.PI, 6)
  expect(bathWallSnap({ ...args, nodes: { ...args.nodes, [right.id]: { ...right, visible: false } } })).toBeNull()
  expect(bathWallSnap({ ...args, node: { ...node, length: 1.8 } as unknown as AnyNode })).toBeNull()
})

test('alcove handedness moves the through drain and overflow, and the apron has its own finish', () => {
  for (const drainEnd of ['left', 'right'] as const) {
    const node = BathtubNode.parse({ shape: 'alcove', drainEnd, drainCover: false })
    const group = buildBathtubGeometry(node), x = bathDrainX(node)
    const shellHits = new Raycaster(new Vector3(x, 2, 0), new Vector3(0, -1, 0)).intersectObject(group, true).filter(hit => ['bathtub-shell','bathtub-interior'].includes(hit.object.name))
    expect(shellHits).toHaveLength(0)
    const centreHits = new Raycaster(new Vector3(0, 2, 0), new Vector3(0, -1, 0)).intersectObject(group, true).filter(hit => ['bathtub-shell','bathtub-interior'].includes(hit.object.name))
    expect(centreHits.length).toBeGreaterThan(0)
    expect(Math.sign(group.getObjectByName('bathtub-overflow')!.userData.inlet[0])).toBe(drainEnd === 'left' ? -1 : 1)
    expect(group.getObjectByName('bathtub-apron')!.userData.slotId).toBe('apron')
    expect(new Box3().setFromObject(group).min.y).toBeCloseTo(0, 6)
    dispose(group)
  }
})

test('corner baths preserve both wall planes and a hollow curved bowl at equal and asymmetric proportions', () => {
  for (const [length, width] of [[1.4, 1.4], [2.2, 0.65], [1.2, 1.8]]) {
    const node = BathtubNode.parse({ shape: 'corner', length, width, drainCover: false })
    const group = buildBathtubGeometry(node), box = new Box3().setFromObject(group)
    expect(box.min.x).toBeCloseTo(-length! / 2, 6)
    expect(box.max.x).toBeCloseTo(length! / 2, 6)
    expect(box.min.z).toBeCloseTo(-width! / 2, 6)
    expect(box.max.z).toBeCloseTo(width! / 2, 6)
    const points = bathCornerOutline(length!, width!)
    expect(points.filter(([x]) => Math.abs(x + length! / 2) < 1e-7).length).toBeGreaterThan(3)
    expect(points.filter(([, z]) => Math.abs(z - width! / 2) < 1e-7).length).toBeGreaterThan(3)
    for (const [x, z] of points) expect(((x + length! / 2) / length!) ** 2 + ((z - width! / 2) / width!) ** 2).toBeLessThanOrEqual(1.000001)
    const holes = new Raycaster(new Vector3(bathDrainPosition(node)[0], 2, bathDrainPosition(node)[1]), new Vector3(0, -1, 0)).intersectObject(group, true).filter(hit => ['bathtub-shell','bathtub-interior'].includes(hit.object.name))
    expect(holes).toHaveLength(0)
    dispose(group)
  }
})

test('corner bath placement aligns the two straight shell faces to adjoining wall faces', () => {
  for (const angle of [0, Math.PI / 5, Math.PI]) {
    const level = LevelNode.parse({}), c = Math.cos(angle), s = Math.sin(angle)
    const a = WallNode.parse({ parentId: level.id, start: [3, 4], end: [3 + 3 * c, 4 + 3 * s], thickness: 0.1 })
    const b = WallNode.parse({ parentId: level.id, start: [3, 4], end: [3 - 3 * s, 4 + 3 * c], thickness: 0.2 })
    level.children = [a.id, b.id]
    const node = BathtubNode.parse({ shape: 'corner', length: 1.6, width: 1.2 })
    const x = 0.7, z = 0.85
    const args = { node: node as unknown as AnyNode, candidatePosition: [3 + x * c - z * s, 0, 4 + x * s + z * c] as [number, number, number], nodes: { [level.id]: level, [a.id]: a, [b.id]: b }, levelId: level.id, movingIds: [] }
    const result = bathWallSnap(args)!
    expect(result).not.toBeNull()
    const placed = BathtubNode.parse({ ...node, ...result })
    const corner = bathTapLocalToLevel(placed, { position: [-node.length / 2, 0, node.width / 2], rotation: 0 }).position
    expect((corner[0] - 3) * c + (corner[2] - 4) * s).toBeCloseTo(0.1, 6)
    expect(-(corner[0] - 3) * s + (corner[2] - 4) * c).toBeCloseTo(0.05, 6)
    expect(bathWallSnap({ ...args, nodes: { ...args.nodes, [b.id]: { ...b, visible: false } } })).toBeNull()
    expect(bathWallSnap({ ...args, movingIds: [a.id] })).toBeNull()
  }
})

test('undermount baths reject fittings on the concealed rim and expose only wall service targets',()=>{
  for(const tapMount of ['rim','wall','none'] as const) {
    const node=BathtubNode.parse({shape:'undermount',tapMount})
    const group=buildBathtubGeometry(node)
    expect(group.getObjectByName(BATH_TAP_TARGET_NAME)).toBeUndefined()
    expect(Boolean(group.getObjectByName(BATH_WALL_TAP_TARGET_NAME))).toBe(tapMount==='wall')
    const tap=TapNode.parse({})
    expect(()=>tapPlacementChanges(tap,{parentId:node.id,slotId:'tap',position:[0,node.height,0],rotation:0} as never,{[node.id]:node as unknown as AnyNode})).toThrow('This bath has no rim mounting slot')
    dispose(group)
  }
})
