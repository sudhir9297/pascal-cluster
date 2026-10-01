import { describe, expect, test } from 'bun:test'
import {
  WallNode,
  LevelNode,
  nodeRegistry,
  registerNode,
  useScene,
  type AnyNode,
  type AnyNodeDefinition,
  type AnyNodeId,
} from '@pascal-app/core'
import { Box3, Mesh } from 'three'
import { WallHungToiletNode, toiletPresets } from '../wall-hung-toilet/schema'
import { buildWallHungToiletGeometry } from '../wall-hung-toilet/geometry'
import { wallHungToiletDefinition } from '../wall-hung-toilet/definition'
import {
  wallFlushPlateDefinition,
  cisternFlushControlDefinition,
} from './definition'
import {
  WALL_FLUSH_PLATE,
  CISTERN_FLUSH_CONTROL,
  WallFlushPlateNode,
  CisternFlushControlNode,
  flushPlatePresets,
} from './schema'
import { buildFlushControlGeometry, flushControlGeometryKey } from './geometry'
import {
  defaultToiletControl,
  cisternControlPose,
  controlWallPose,
  clearToiletControlLinks,
} from './attachment'
import { separateLegacyToiletControls } from './migration'
import { flushControlSection } from './section'
const nodesOf = (...nodes: unknown[]) =>
  Object.fromEntries(nodes.map((n) => [(n as AnyNode).id, n])) as Record<
    AnyNodeId,
    AnyNode
  >
const dispose = (root: ReturnType<typeof buildFlushControlGeometry>) =>
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
describe('separate toilet flush controls', () => {
  test('every toilet style and cistern arrangement has its own control node and no embedded flush controls', () => {
    const wall = WallNode.parse({ start: [0, 0], end: [3, 0] })
    for (const preset of toiletPresets)
      for (const tankType of [
        'concealed',
        'attached',
        'low-level',
        'high-level',
      ] as const) {
        const toilet = WallHungToiletNode.parse({
            ...preset,
            tankType,
            parentId: wall.id,
            wallId: wall.id,
            position: [1, 0.42, 0.3],
          }),
          control = defaultToiletControl(toilet, nodesOf(wall, toilet))!
        expect(control.id).not.toBe(toilet.id)
        expect(control.type).toBe(
          tankType === 'concealed' ? WALL_FLUSH_PLATE : CISTERN_FLUSH_CONTROL,
        )
        expect(control.parentId).toBe(
          tankType === 'concealed' ? wall.id : toilet.id,
        )
        if ('mount' in control)
          expect(control.mount).toBe(
            tankType === 'high-level' ? 'pull-chain' : 'top',
          )
        const root = buildWallHungToiletGeometry(toilet)
        expect(
          root.children.filter((o) =>
            ['plate', 'buttons', 'sensor'].includes(o.userData.slotId),
          ),
        ).toHaveLength(0)
        if (tankType === 'concealed')
          expect(
            root.children.some((o) => o.userData.slotId === 'hardware'),
          ).toBe(false)
        else
          expect(
            root.children.filter((o) => o.userData.slotId === 'hardware'),
          ).toHaveLength(2)
        dispose(root)
      }
  })
  test('plate shapes, button shapes and all flushing modes produce finite editable geometry', () => {
    for (const p of flushPlatePresets)
      for (const buttonShape of ['round', 'rectangle', 'oval'] as const)
        for (const flushMode of ['single', 'dual', 'touchless'] as const) {
          const n = WallFlushPlateNode.parse({ ...p, buttonShape, flushMode }),
            root = buildFlushControlGeometry(n),
            box = new Box3().setFromObject(root)
          expect(box.max.x - box.min.x).toBeCloseTo(n.width, 4)
          expect(
            root.children.filter((o) => o.userData.slotId === 'buttons'),
          ).toHaveLength(
            flushMode === 'dual' ? 2 : flushMode === 'single' ? 1 : 0,
          )
          root.traverse((o) => {
            if (o instanceof Mesh)
              for (const value of o.geometry.getAttribute('position').array)
                expect(Number.isFinite(value)).toBe(true)
          })
          expect(flushControlSection(n).drawing.plan).not.toMatch(
            /NaN|Infinity/,
          )
          dispose(root)
        }
  })
  test('wall plates keep their independent wall station and height when a toilet moves or is deleted', () => {
    const wall = WallNode.parse({ start: [0, 0], end: [4, 0] }),
      toilet = WallHungToiletNode.parse({
        parentId: wall.id,
        wallId: wall.id,
        position: [1, 0.42, 0.3],
      })
    const n = defaultToiletControl(
        toilet,
        nodesOf(wall, toilet),
      ) as WallFlushPlateNode,
      before = controlWallPose(n, nodesOf(wall, toilet))!
    const moved = {
      ...toilet,
      position: [3, 0.5, 0.3] as [number, number, number],
      mountingHeight: 0.5,
    }
    expect(controlWallPose(n, nodesOf(wall, moved))!.pose).toEqual(before.pose)
    const patches = clearToiletControlLinks(toilet, nodesOf(wall, toilet, n))
    expect(patches).toHaveLength(1)
    expect(patches[0]!.data).toEqual({ servesToiletId: null })
    expect(
      controlWallPose({ ...n, servesToiletId: null }, nodesOf(wall))!.pose,
    ).toEqual(before.pose)
  })
  test('cistern controls follow tank dimensions while retaining their own button shape, mounting and offsets', () => {
    const toilet = WallHungToiletNode.parse({ tankType: 'attached' }),
      n = CisternFlushControlNode.parse({
        parentId: toilet.id,
        offsetX: 0.04,
        offsetZ: 0.01,
        shape: 'oval',
        buttonShape: 'rectangle',
      })
    const pose = cisternControlPose(n, toilet),
      resized = cisternControlPose(n, {
        ...toilet,
        tankHeight: 0.5,
        tankDepth: 0.24,
      })
    expect(resized.position[1] - pose.position[1]).toBeCloseTo(0.14)
    expect(resized.position[0]).toBe(0.04)
    expect(flushControlGeometryKey(n)).toBe(
      flushControlGeometryKey({ ...n, position: resized.position }),
    )
    for (const mount of ['top', 'side', 'pull-chain'] as const) {
      const control = { ...n, mount },
        root = buildFlushControlGeometry(control)
      expect(new Box3().setFromObject(root).isEmpty()).toBe(false)
      expect(flushControlSection(control).drawing.section).not.toMatch(
        /NaN|Infinity/,
      )
      dispose(root)
    }
  })
  test('legacy extraction preserves hidden controls, position, flush mode and finishes and runs once', () => {
    const wall = WallNode.parse({ start: [0, 0], end: [4, 0] }),
      n = WallHungToiletNode.parse({
        parentId: wall.id,
        wallId: wall.id,
        position: [1, 0.42, 0.3],
        slots: { hardware: 'preset:chrome' },
      })
    const old = {
        ...n,
        flushPlateHeight: 1.2,
        flushPlateWidth: 0.28,
        dualFlush: false,
      },
      nodes = nodesOf(wall, old),
      changes = separateLegacyToiletControls(nodes)
    expect(changes.create).toHaveLength(1)
    const plate = WallFlushPlateNode.parse(changes.create[0]!.node)
    expect(plate.width).toBe(0.28)
    expect(plate.position[1]).toBe(1.2)
    expect(plate.flushMode).toBe('single')
    expect(plate.slots?.buttons).toBe('preset:chrome')
    expect(
      separateLegacyToiletControls(
        nodesOf(wall, { ...old, ...changes.update[0]!.data }, plate),
      ).create,
    ).toHaveLength(0)
    expect(
      separateLegacyToiletControls(
        nodesOf(wall, { ...old, flushPlateEnabled: false }),
      ).create,
    ).toHaveLength(0)
  })
  test('toilet and controls are created in one undo step; deleting a wall plate does not remove its toilet', () => {
    const snapshot = useScene.getState(),
      registry = nodeRegistry._snapshot(),
      raf = globalThis.requestAnimationFrame,
      cancel = globalThis.cancelAnimationFrame
    globalThis.requestAnimationFrame = () => 0
    globalThis.cancelAnimationFrame = () => {}
    try {
      for (const def of [
        wallHungToiletDefinition,
        wallFlushPlateDefinition,
        cisternFlushControlDefinition,
      ])
        if (!nodeRegistry.has(def.kind))
          registerNode(def as unknown as AnyNodeDefinition)
      const level = LevelNode.parse({}),
        wall = WallNode.parse({
          parentId: level.id,
          start: [0, 0],
          end: [4, 0],
        }),
        n = WallHungToiletNode.parse({
          parentId: wall.id,
          wallId: wall.id,
          position: [1, 0.42, 0.3],
          flushControlsSeparated: true,
        }),
        nodes = nodesOf(level, wall),
        control = defaultToiletControl(n, nodes)!
      useScene.setState({ nodes, rootNodeIds: [level.id] })
      useScene.temporal.getState().clear()
      useScene.getState().applyNodeChanges({
        create: [
          { node: n as unknown as AnyNode, parentId: wall.id },
          {
            node: control as unknown as AnyNode,
            parentId: control.parentId as AnyNodeId,
          },
        ],
      })
      expect(useScene.getState().nodes[n.id as AnyNodeId]).toBeDefined()
      expect(useScene.getState().nodes[control.id as AnyNodeId]).toBeDefined()
      useScene.temporal.getState().undo()
      expect(useScene.getState().nodes[n.id as AnyNodeId]).toBeUndefined()
      expect(useScene.getState().nodes[control.id as AnyNodeId]).toBeUndefined()
      useScene.temporal.getState().redo()
      useScene.getState().deleteNodes([control.id as AnyNodeId])
      expect(useScene.getState().nodes[n.id as AnyNodeId]).toBeDefined()
      useScene.temporal.getState().undo()
      useScene.getState().deleteNodes([n.id as AnyNodeId])
      expect(useScene.getState().nodes[control.id as AnyNodeId]).toBeDefined()
      expect(WallFlushPlateNode.parse(useScene.getState().nodes[control.id as AnyNodeId]).servesToiletId).toBeNull()
    } finally {
      useScene.setState(snapshot)
      useScene.temporal.getState().clear()
      registry()
      globalThis.requestAnimationFrame = raf
      globalThis.cancelAnimationFrame = cancel
    }
  })
})

test('refined plates preserve wall contact and depth bounds at dimension limits', () => {
  for (const preset of flushPlatePresets) for (const width of [0.03, 0.35]) {
    const n = WallFlushPlateNode.parse({...preset, width, height: width === 0.03 ? 0.03 : 0.25, thickness: 0.003, buttonProjection: 0.002, edgeRadius: 0.004, seamWidth: 0.002})
    const root = buildFlushControlGeometry(n), box = new Box3().setFromObject(root)
    expect(box.min.z).toBeCloseTo(0, 7)
    expect(box.max.z).toBeCloseTo(n.thickness + n.buttonProjection, 7)
    expect(root.getObjectByName('flush-plate-backing')).toBeDefined()
    expect(root.getObjectByName('flush-button-1')).toBeDefined()
    expect(flushControlSection(n).dimensions.map(d => d.key)).toContain('edgeRadius')
    expect(flushControlGeometryKey(n)).not.toBe(flushControlGeometryKey({...n, seamWidth: 0.0003}))
    dispose(root)
  }
})
