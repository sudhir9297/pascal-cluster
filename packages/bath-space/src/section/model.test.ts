import { sectionFieldPatch } from './fields'
import { expect, test } from 'bun:test'
import { CountertopBasinNode, UndermountBasinNode, DropInBasinNode, SemiRecessedBasinNode, WallHungBasinNode, FullPedestalBasinNode, HalfPedestalBasinNode } from '../countertop-basin/schema'
import { FreestandingVanityNode, WallMountedVanityNode, CornerVanityNode } from '../freestanding-vanity/schema'
import { TapNode } from '../taps/schema'
import { basinSection, vanitySection, tapSection, boundedDimensionValue } from './model'
import { WallHungToiletNode } from '../wall-hung-toilet/schema'
import { toiletSection } from '../wall-hung-toilet/section'
import { WallFlushPlateNode, CisternFlushControlNode } from '../flush-control/schema'
import { flushControlSection } from '../flush-control/section'
import { BathtubNode, bathtubPresets } from '../bathtub/schema'
import { bathSection } from '../bathtub/section'
import { ShowerArmNode, showerArmPresets } from '../shower-arm/schema'
import { showerArmSection } from './shower-arm-section'
import { tapPresets } from '../taps/presets'
test('all basin section handles respect schema bounds and circular vessels use their actual diameter', () => {
  for (const schema of [CountertopBasinNode, UndermountBasinNode, DropInBasinNode, SemiRecessedBasinNode, WallHungBasinNode, FullPedestalBasinNode, HalfPedestalBasinNode]) {
    const node = schema.parse({})
    const { drawing, dimensions } = basinSection(node)
    expect(drawing.section).not.toMatch(/NaN|Infinity/)
    for (const field of dimensions) for (const limit of [-100, 100]) {
      expect(schema.safeParse({ ...node, ...sectionFieldPatch(field, boundedDimensionValue(field, limit)) }).success).toBe(true)
    }
  }
  const round = basinSection(CountertopBasinNode.parse({ shape: 'round', width: .6, depth: .3 }))
  expect(round.drawing.depth).toBe(.6)
  expect(round.dimensions.some(field => field.key === 'depth')).toBe(false)
  const pedestal = basinSection(FullPedestalBasinNode.parse({ totalHeight: .9 }))
  expect(pedestal.drawing.height).toBe(.9)
  expect(pedestal.drawing.floor).toBe(true)
})

test('vanity sections expose host-limited sizing and the corner footprint', () => {
  for (const schema of [FreestandingVanityNode, WallMountedVanityNode, CornerVanityNode]) {
    const node = schema.parse({})
    for (const field of vanitySection(node).dimensions) for (const limit of [-100, 100]) {
      expect(schema.safeParse({ ...node, ...sectionFieldPatch(field, boundedDimensionValue(field, limit)) }).success).toBe(true)
    }
  }
  const restricted = vanitySection(WallMountedVanityNode.parse({}), .83).dimensions[0]!
  expect(boundedDimensionValue(restricted, 5)).toBeLessThanOrEqual(.83)
  const corner = vanitySection(CornerVanityNode.parse({ width: .7 }))
  expect(corner.drawing.width).toBeCloseTo(.7 * Math.SQRT2 + CornerVanityNode.parse({}).countertopOverhang * 2)
  expect(corner.dimensions.some(field => field.key === 'depth')).toBe(false)
})

test('tap sections resolve preset dimensions and reject invalid dimension input', () => {
  const model = tapSection(TapNode.parse({}))
  expect(model.drawing.width).toBeGreaterThan(0)
  for (const field of model.dimensions) {
    expect(boundedDimensionValue(field, NaN)).toBe(field.value)
    expect(boundedDimensionValue(field, Infinity)).toBe(field.value)
    expect(boundedDimensionValue(field, -10)).toBe(field.min)
    expect(boundedDimensionValue(field, 10)).toBe(field.max)
  }
})


test('every exposed dimension changes a drawing or its measured extent across bath variants', () => {
  function check<T extends { type: string }>(node: T, model: (node: T) => import('./fields').SectionModel) {
    const original = model(node)
    for (const field of original.dimensions) {
      const value = field.value === field.max ? field.min : field.max
      const changed = model({ ...node, ...sectionFieldPatch(field, value) })
      expect(JSON.stringify(changed.drawing), `${node.type} ${field.key}`).not.toBe(JSON.stringify(original.drawing))
      expect(JSON.stringify(changed.drawing)).not.toMatch(/NaN|Infinity/)
    }
  }
  for (const schema of [CountertopBasinNode, UndermountBasinNode, DropInBasinNode, SemiRecessedBasinNode, WallHungBasinNode, FullPedestalBasinNode, HalfPedestalBasinNode]) check(schema.parse({}), basinSection)
  for (const storageLayout of ['drawers', 'doors', 'mixed', 'console']) check(FreestandingVanityNode.parse({ storageLayout }), vanitySection)
  check(WallMountedVanityNode.parse({}), vanitySection)
  check(CornerVanityNode.parse({}), vanitySection)
  for (const preset of tapPresets) check(TapNode.parse({ presetId: preset.id }), tapSection)
  for (const tankType of ['concealed', 'attached', 'low-level', 'high-level']) check(WallHungToiletNode.parse({ tankType }), toiletSection)
  for (const flushMode of ['single', 'dual', 'touchless']) check(WallFlushPlateNode.parse({ flushMode }), flushControlSection)
  for (const mount of ['top', 'side', 'pull-chain']) check(CisternFlushControlNode.parse({ mount }), flushControlSection)
  for (const preset of bathtubPresets) check(BathtubNode.parse({ shape: preset.shape }), bathSection)
  for (const preset of showerArmPresets) check(ShowerArmNode.parse({ style: preset.style }), showerArmSection)
})

test('inactive component dimensions stay out of section details', () => {
  expect(flushControlSection(WallFlushPlateNode.parse({ flushMode: 'touchless' })).dimensions.map(f => f.key)).not.toContain('seamWidth')
  expect(vanitySection(FreestandingVanityNode.parse({ countertopEnabled: false, baseStyle: 'plinth' })).dimensions.map(f => f.key)).not.toContain('countertopThickness')
  expect(tapSection(TapNode.parse({ baseStyle: 'none' })).dimensions.map(f => f.key)).not.toContain('baseHeight')
  expect(toiletSection(WallHungToiletNode.parse({ seatEnabled: false })).dimensions.map(f => f.key)).not.toContain('seatThickness')
  expect(toiletSection(WallHungToiletNode.parse({ tankType: 'attached' })).dimensions.map(f => f.key)).not.toContain('tankBottom')
})
