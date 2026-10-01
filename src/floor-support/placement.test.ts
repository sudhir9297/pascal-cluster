import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  BuildingNode,
  LevelNode,
  SiteNode,
  SlabNode,
  WallNode,
  getFloorPlacedElevation,
  getFloorStackedPosition,
  nodeRegistry,
  registerNode,
  spatialGridManager,
  createTerrainField,
  flattenPatch,
  applyHeightPatch,
  encodeTerrainField,
  type AnyNode,
  type AnyNodeId,
} from '@pascal-app/core'
import { bathSpacePlugin } from '../index'
import { BathtubNode, bathtubPresets } from '../bathtub/schema'
import { BathDeckNode } from '../bath-deck/schema'
import { bathDeckLocalY, bathLevelNode } from '../bath-deck/attachment'
import { dropInAssembly } from '../bath-deck/assembly'
import { CornerVanityNode, FreestandingVanityNode } from '../freestanding-vanity/schema'
import {
  CountertopBasinNode,
  DropInBasinNode,
  FullPedestalBasinNode,
} from '../countertop-basin/schema'
import { basinLevelPose, vanityLocalToLevel } from '../countertop-basin/attachment'
import { basinPlacementCandidate } from '../countertop-basin/placement-pose'
import { FloorStandingToiletNode } from '../floor-standing-toilet/schema'
import { toiletPlacement } from '../floor-standing-toilet/placement'
import { wallBasinPlacement } from '../wall-hung-basin/placement'
import { ShowerDividerNode } from '../shower-divider/schema'
import { bathMovePose } from '../bathtub/floorplan-move'
import { TapNode } from '../taps/schema'
import { followingWallTapPlacement } from '../taps/binding'
import { bathTapLocalToLevel, bathWallTapTarget } from '../bathtub/targets'
import { floorPlacementPose } from './placement'
import { wallFloorPosition } from './wall-position'

let restore: () => void
const level = LevelNode.parse({ name: 'Support level' })
const asNode = (node: unknown) => node as AnyNode
const graph = (...nodes: unknown[]) =>
  Object.fromEntries(
    [level, ...nodes].map((raw) => {
      const node = asNode(raw)
      return [node.id, node]
    }),
  )
const position = (node: unknown) => (node as { position: [number, number, number] }).position
function slab(elevation: number, extra: Record<string, unknown> = {}) {
  const node = SlabNode.parse({
    parentId: level.id,
    elevation,
    thickness: 0.12,
    polygon: [
      [-5, -5],
      [5, -5],
      [5, 5],
      [-5, 5],
    ],
    ...extra,
  })
  spatialGridManager.handleNodeCreated(node, level.id)
  return node
}
function raised(node: unknown, nodes: Record<string, AnyNode>) {
  return getFloorStackedPosition({ node: asNode(node), nodes, position: position(node) })[1]
}
beforeEach(() => {
  restore = nodeRegistry._snapshot()
  for (const definition of bathSpacePlugin.nodes ?? []) registerNode(definition)
  spatialGridManager.clear()
})
afterEach(() => {
  spatialGridManager.clear()
  restore()
})

test('every bathtub shape, deck, freestanding vanity, corner vanity and divider rests on slab top', () => {
  const floor = slab(0.23)
  const fixtures = [
    ...bathtubPresets.map((preset) =>
      BathtubNode.parse({ shape: preset.shape, parentId: level.id }),
    ),
    BathDeckNode.parse({ parentId: level.id }),
    FreestandingVanityNode.parse({ parentId: level.id }),
    CornerVanityNode.parse({ parentId: level.id }),
    ShowerDividerNode.parse({ parentId: level.id }),
    CountertopBasinNode.parse({ parentId: level.id }),
    DropInBasinNode.parse({ parentId: level.id, position: [0, 0.18, 0] }),
  ]
  for (const node of fixtures) {
    const nodes = graph(floor, node)
    expect(raised(node, nodes), node.type).toBeCloseTo(0.23 + node.position[1])
    expect(node.position[1]).toBe(node.type === 'bath-space:drop-in-basin' ? 0.18 : 0)
  }
})

test('preview and saved pose agree, and slab edits do not bake elevation into fixture height', () => {
  const floor = slab(0.15),
    node = BathtubNode.parse({ parentId: level.id })
  const nodes = graph(floor, node)
  const pose = floorPlacementPose(
    asNode(node),
    { position: [0, 0, 0], rotation: Math.PI / 4 },
    level.id,
    nodes,
    { elevation: 0.15, supportSlabId: floor.id, sourceNodeId: null },
  )
  const saved = BathtubNode.parse({ ...node, ...pose })
  expect(saved.position[1]).toBe(0)
  expect(saved.supportSlabId).toBe(floor.id)
  expect(pose.previewPosition[1]).toBeCloseTo(raised(saved, nodes))
  for (const elevation of [0.42, 0.07, 0.42]) {
    const edited = { ...floor, elevation }
    nodes[floor.id] = edited
    spatialGridManager.handleNodeUpdated(edited, level.id)
    expect(raised(saved, nodes)).toBeCloseTo(elevation)
    expect(saved.height).toBe(node.height)
  }
})

test('pointer selects the lower floor below a raised slab and moving re-elects support', () => {
  const low = slab(0.1),
    high = slab(1.2),
    node = BathtubNode.parse({ parentId: level.id })
  const nodes = graph(low, high, node)
  const lowPose = floorPlacementPose(asNode(node), { position: [0, 0, 0] }, level.id, nodes, {
    elevation: 0.1,
    supportSlabId: low.id,
    sourceNodeId: null,
  })
  expect(lowPose.previewPosition[1]).toBeCloseTo(0.1)
  const highPose = floorPlacementPose(
    asNode({ ...node, ...lowPose }),
    { position: [0, 0, 0] },
    level.id,
    nodes,
    { elevation: 1.2, supportSlabId: high.id, sourceNodeId: null },
  )
  expect(highPose.supportSlabId).toBe(high.id)
  expect(highPose.previewPosition[1]).toBeCloseTo(1.2)
  const moved = bathMovePose({ ...node, ...lowPose }, [8, 0, 8], nodes, false)!
  expect(
    getFloorPlacedElevation({
      node: asNode({ ...node, ...moved }),
      nodes,
      position: moved.position,
    }),
  ).toBe(0)
})

test('arbitrary item or patio top keeps a clearance above its slab and follows slab edits', () => {
  const floor = slab(0.2),
    node = BathtubNode.parse({ parentId: level.id })
  const nodes = graph(floor, node)
  const pose = floorPlacementPose(asNode(node), { position: [0, 0, 0] }, level.id, nodes, {
    elevation: 0.85,
    supportSlabId: floor.id,
    sourceNodeId: 'patio-or-item',
  })
  const saved = BathtubNode.parse({ ...node, ...pose })
  expect(saved.position[1]).toBeCloseTo(0.65)
  expect(pose.previewPosition[1]).toBeCloseTo(0.85)
  const edited = { ...floor, elevation: 0.4 }
  nodes[floor.id] = edited
  spatialGridManager.handleNodeUpdated(edited, level.id)
  expect(raised(saved, nodes)).toBeCloseTo(1.05)
})

test('bath deck assemblies inherit support once and tap/screen level poses include it', () => {
  const floor = slab(0.3)
  const assembly = dropInAssembly(
    BathtubNode.parse({ shape: 'drop-in', supportSlabId: floor.id }),
    level.id as AnyNodeId,
  )
  const deck = { ...assembly.deck, parentId: level.id }
  const nodes = graph(floor, deck, assembly.bath)
  expect(deck.supportSlabId).toBe(floor.id)
  expect(raised(deck, nodes)).toBeCloseTo(0.3)
  expect(
    getFloorPlacedElevation({
      node: asNode(assembly.bath),
      nodes,
      position: assembly.bath.position,
    }),
  ).toBe(0)
  expect(bathLevelNode(assembly.bath, nodes).position[1]).toBeCloseTo(
    0.3 + bathDeckLocalY(deck, assembly.bath),
  )
})

test('basins attach to a supported vanity in its local frame and floor bowls follow slabs', () => {
  const floor = slab(0.2),
    vanity = FreestandingVanityNode.parse({ parentId: level.id })
  const bowl = CountertopBasinNode.parse({ parentId: vanity.id, position: [0, vanity.height, 0] })
  const nodes = graph(floor, vanity, bowl)
  expect(basinLevelPose(bowl, nodes).position[1]).toBeCloseTo(0.2 + vanity.height)
  expect(vanityLocalToLevel(vanity, [0, vanity.height, 0], nodes)[1]).toBeCloseTo(
    0.2 + vanity.height,
  )
  expect(getFloorPlacedElevation({ node: asNode(bowl), nodes, position: bowl.position })).toBe(0)
  const free = CountertopBasinNode.parse({ parentId: level.id })
  const placed = basinPlacementCandidate(
    free,
    { position: [0, 0.2, 0], rotation: 0 },
    level.id,
    new Map(),
    nodes,
  )!
  expect(placed.placed.position[1]).toBeCloseTo(0)
  expect(placed.placed.supportSlabId).toBe(floor.id)
  expect(raised({ ...free, ...placed.placed }, nodes)).toBeCloseTo(0.2)
})

test('wall-attached floor toilets and full pedestal basins use the fixture footprint floor', () => {
  const wall = WallNode.parse({ parentId: level.id, start: [-3, 0], end: [3, 0] })
  const floor = slab(0.2, {
    polygon: [
      [-1, 0.2],
      [1, 0.2],
      [1, 2],
      [-1, 2],
    ],
  })
  const toilet = FloorStandingToiletNode.parse({ parentId: wall.id, wallId: wall.id })
  const pedestal = FullPedestalBasinNode.parse({ parentId: wall.id, wallId: wall.id })
  const nodes = graph(wall, floor, toilet, pedestal)
  const t = toiletPlacement(toilet, wall, 3, 'front')!,
    p = wallBasinPlacement(pedestal, wall, 3, 'front')!
  expect(wallFloorPosition(asNode(toilet), wall, t.position, t.rotation, nodes)[1]).toBeCloseTo(
    toilet.mountingHeight + 0.2,
  )
  expect(wallFloorPosition(asNode(pedestal), wall, p.position, p.rotation, nodes)[1]).toBeCloseTo(
    pedestal.totalHeight + 0.2,
  )
  const covering = slab(0.2),
    allNodes = graph(wall, covering, toilet)
  spatialGridManager.handleNodeDeleted(floor.id, 'slab', level.id)
  expect(wallFloorPosition(asNode(toilet), wall, t.position, t.rotation, allNodes)[1]).toBeCloseTo(
    toilet.mountingHeight,
  )
})

test('support deletion and slab holes fall back to ground without sinking or retaining a stale lift', () => {
  const floor = slab(0.3),
    node = BathtubNode.parse({ parentId: level.id, supportSlabId: floor.id })
  const nodes = graph(floor, node)
  expect(raised(node, nodes)).toBeCloseTo(0.3)
  const hole = {
    ...floor,
    holes: [
      [
        [-2, -2],
        [2, -2],
        [2, 2],
        [-2, 2],
      ],
    ] as [number, number][][],
  }
  nodes[floor.id] = hole
  spatialGridManager.handleNodeUpdated(hole, level.id)
  expect(raised(node, nodes)).toBe(0)
  spatialGridManager.handleNodeDeleted(floor.id, 'slab', level.id)
  delete nodes[floor.id]
  expect(raised(node, nodes)).toBe(0)
})

test('bath and vanity rest on sculpted terrain when no slab supports them', () => {
  const field = createTerrainField({ cols: 17, rows: 17, spacing: 1, origin: [-8, -8] })
  const terrain = encodeTerrainField(
    applyHeightPatch(
      field,
      flattenPatch(field, { minX: 2, minZ: 2, maxX: 5, maxZ: 5 }, 2.5) as never,
    ),
  )
  const site = SiteNode.parse({ terrain }),
    building = BuildingNode.parse({ parentId: site.id })
  const groundLevel = { ...level, parentId: building.id }
  for (const node of [
    BathtubNode.parse({ parentId: level.id, position: [3, 0, 3] }),
    FreestandingVanityNode.parse({ parentId: level.id, position: [3, 0, 3] }),
  ]) {
    const nodes = graph(site, building, groundLevel, node)
    expect(raised(node, nodes)).toBeCloseTo(2.5)
  }
})

test('wall taps follow a supported bath without counting the wall floor twice', () => {
  const floor = slab(0.2)
  const wall = WallNode.parse({ parentId: level.id, start: [-3, -1], end: [3, -1], height: 3 })
  const bath = BathtubNode.parse({ parentId: level.id, supportSlabId: floor.id })
  const nodes = graph(floor, wall, bath)
  const pose = bathTapLocalToLevel(bath, bathWallTapTarget(bath), nodes)
  const tap = TapNode.parse({
    presetId: 'tap-003',
    parentId: wall.id,
    wallId: wall.id,
    servesBathId: bath.id,
    linkOffset: [0, 0.15],
  })
  const placed = followingWallTapPlacement(tap, nodes)!
  expect(placed.position[1] + 0.2).toBeCloseTo(pose.position[1] + 0.15)
  const edited = { ...floor, elevation: 0.5 }
  nodes[floor.id] = edited
  spatialGridManager.handleNodeUpdated(edited, level.id)
  const following = followingWallTapPlacement(tap, nodes)!
  expect(following.position[1] + 0.5).toBeCloseTo(pose.position[1] + 0.45)
})
