import { expect, test } from 'bun:test'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { geometrySection } from './geometry-section'
import { sectionFieldPatch } from './fields'
import { boundedDimensionValue } from './model'
import { ShowerMountNode, showerMountPresets } from '../shower-mount/schema'
import { showerMountSection } from '../shower-mount/section'
import { showerControlPresets, controlPresetNode } from '../shower-control/schema'
import { showerControlSection } from '../shower-control/section'
import { wallSpoutPresets, wallSpoutPresetNode } from '../wall-spout/schema'
import { wallSpoutSection } from '../wall-spout/section'
import { bodyJetPresets, bodyJetPresetNode } from '../body-jet/schema'
import { bodyJetSection } from '../body-jet/section'
import { showerFlangePresets, flangePresetNode } from '../shower-flange/schema'
import { showerFlangeSection } from '../shower-flange/section'
import { showerConnectorPresets, connectorPresetNode } from '../shower-connector/schema'
import { showerConnectorSection } from '../shower-connector/section'
import { showerValvePresets, valvePresetNode } from '../shower-valve/schema'
import { showerValveSection } from '../shower-valve/section'
import { showerAssemblyPresets, assemblyPresetNode } from '../shower-assembly/schema'
import { showerAssemblySection } from '../shower-assembly/section'
import { ShowerDividerNode } from '../shower-divider/schema'
import { showerDividerSection } from '../shower-divider/section'
import { ShowerHoseNode } from '../shower-hose/schema'
import { showerHoseSection } from '../shower-hose/section'
import type { SectionModel } from './fields'
import {
  LevelNode,
  WallNode,
  type AnyNode,
  type AnyNodeId,
  type GeometryContext,
} from '@pascal-app/core'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHeadNode } from '../shower-head/schema'
import { showerHeadSection } from './shower-head-section'
import { handShowerSection } from './hand-shower-section'
import { connectShowerHose } from '../shower-hose/connection'

function valid(model: SectionModel) {
  for (const value of [model.drawing.width, model.drawing.depth, model.drawing.height]) {
    expect(Number.isFinite(value)).toBe(true)
    expect(value).toBeGreaterThan(0)
  }
  expect(JSON.stringify(model.drawing)).not.toMatch(/NaN|Infinity/)
  expect(model.drawing.plan.length).toBeGreaterThan(0)
  expect(model.drawing.detail!.length).toBeGreaterThan(0)
}

test('geometry sections cut transformed meshes and dispose only their transient resources', () => {
  const root = new Group(),
    geometry = new BoxGeometry(0.2, 0.4, 0.6),
    material = new MeshBasicMaterial()
  const mesh = new Mesh(geometry, material)
  mesh.position.set(0, 0.2, 0.3)
  root.add(mesh)
  let disposed = false
  geometry.addEventListener('dispose', () => {
    disposed = true
  })
  const { drawing } = geometrySection(root, [])
  expect(drawing.width).toBeCloseTo(0.2)
  expect(drawing.depth).toBeCloseTo(0.6)
  expect(drawing.height).toBeCloseTo(0.4)
  expect(drawing.section).toContain('Z')
  expect(drawing.cutPosition).toBeCloseTo(0.5)
  expect(disposed).toBe(true)
})

test('all remaining shower presets have finite plan and section drawings', () => {
  const check = <T>(items: readonly T[], model: (node: T) => SectionModel) => {
    for (const node of items) valid(model(node))
  }
  check(
    showerMountPresets.map((p) => ShowerMountNode.parse({ style: p.style })),
    showerMountSection,
  )
  check(showerControlPresets.map(controlPresetNode), showerControlSection)
  check(wallSpoutPresets.map(wallSpoutPresetNode), wallSpoutSection)
  check(bodyJetPresets.map(bodyJetPresetNode), bodyJetSection)
  check(showerFlangePresets.map(flangePresetNode), showerFlangeSection)
  check(showerConnectorPresets.map(connectorPresetNode), showerConnectorSection)
  check(showerValvePresets.map(valvePresetNode), showerValveSection)
  check(showerAssemblyPresets.map(assemblyPresetNode), showerAssemblySection)
  check(
    [ShowerDividerNode.parse({}), ShowerDividerNode.parse({ columns: 12, rows: 12 })],
    showerDividerSection,
  )
})

test('mount section follows shape, holder tilt, rail length, slider and shelf changes', () => {
  const holder = ShowerMountNode.parse({})
  expect(showerMountSection({ ...holder, style: 'square-holder' }).drawing).not.toEqual(
    showerMountSection(holder).drawing,
  )
  expect(showerMountSection({ ...holder, holderTilt: 45 }).drawing).not.toEqual(
    showerMountSection(holder).drawing,
  )
  const rail = ShowerMountNode.parse({ style: 'round-rail' })
  for (const patch of [{ railLength: 1.2 }, { sliderPosition: 0.2 }, { shelfEnabled: true }]) {
    expect(showerMountSection({ ...rail, ...patch }).drawing).not.toEqual(
      showerMountSection(rail).drawing,
    )
  }
  for (const field of showerMountSection(rail).dimensions) {
    for (const value of [field.min, field.max]) {
      expect(
        ShowerMountNode.safeParse({
          ...rail,
          ...sectionFieldPatch(field, boundedDimensionValue(field, value)),
        }).success,
      ).toBe(true)
    }
  }
})

test('missing hose connections produce an empty drawing with editable length instead of a fabricated route', () => {
  const model = showerHoseSection(ShowerHoseNode.parse({}))
  expect(model.drawing.plan).toBe('')
  expect(model.dimensions.find((field) => field.key === 'length')?.handle).toBe(false)
})

test('head and handset sections follow their adjustable orientation', () => {
  const head = ShowerHeadNode.parse({ style: 'rectangular' })
  const original = showerHeadSection(head).drawing
  expect(showerHeadSection({ ...head, tilt: 20 }).drawing).not.toEqual(original)
  expect(showerHeadSection({ ...head, swivel: 45 }).drawing).not.toEqual(original)
  const hand = HandShowerNode.parse({})
  expect(handShowerSection({ ...hand, headAngle: 35 }).drawing).not.toEqual(
    handShowerSection(hand).drawing,
  )
})

test('connected hose sections follow a resized rail while retaining both endpoints', () => {
  const level = LevelNode.parse({})
  const wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0] })
  const outlet = ShowerMountNode.parse({
    style: 'round-outlet',
    parentId: wall.id,
    wallId: wall.id,
    position: [1, 1.2, 0.05],
  })
  const rail = ShowerMountNode.parse({
    style: 'round-rail',
    parentId: wall.id,
    wallId: wall.id,
    position: [1.3, 1.2, 0.05],
  })
  const hand = HandShowerNode.parse({ parentId: rail.id })
  const nodes = Object.fromEntries(
    [level, wall, outlet, rail, hand].map((node) => [node.id, node]),
  ) as unknown as Record<AnyNodeId, AnyNode>
  const hose = connectShowerHose(ShowerHoseNode.parse({}), outlet.id, hand.id, nodes).placed
  const context: GeometryContext = {
    resolve: <N = AnyNode>(id: AnyNodeId) => nodes[id] as N | undefined,
    children: [],
    siblings: [],
    parent: nodes[outlet.id as AnyNodeId]!,
  }
  const before = showerHoseSection(hose, context)
  valid(before)
  nodes[rail.id as AnyNodeId] = {
    ...rail,
    sliderPosition: 0.9,
    railLength: 1,
  } as unknown as AnyNode
  const after = showerHoseSection(hose, context)
  valid(after)
  expect(after.drawing).not.toEqual(before.drawing)
  expect(hose.parentId).toBe(outlet.id)
  expect(hose.targetId).toBe(hand.id)
})
