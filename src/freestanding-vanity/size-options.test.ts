import { expect, test } from 'bun:test'
import { CornerVanityNode, FreestandingVanityNode, WallMountedVanityNode, VanityNode } from './schema'
import { vanityPresets } from './presets'
import { vanitySizeOptions } from './size-options'
import { vanitySection } from '../section/vanity-section'
import { boundedDimensionValue } from '../section/model'
import { createDimensionEdit } from '../section/edit-session'

test('every mounting and decorative design has valid sourced footprint stops', () => {
  for (const schema of [FreestandingVanityNode, WallMountedVanityNode]) for (const preset of vanityPresets) {
    const node = schema.parse({...preset.settings, position: [1, .2, 2], slots: {fronts: 'paint'}})
    const options = vanitySizeOptions(node)
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      const next = VanityNode.parse({...node, ...option.patch})
      expect(next.position).toEqual(node.position)
      expect(next.height).toBe(node.height)
      expect(next.mountingHeight).toBe(node.mountingHeight)
      expect(next.frontStyle).toBe(node.frontStyle)
      expect(next.storageLayout).toBe(node.storageLayout)
      expect(next.slots).toEqual(node.slots)
      expect(option.source.startsWith('https://')).toBe(true)
    }
    const model = vanitySection(node)
    for (const key of ['width', 'depth']) expect(model.dimensions.find(field => field.key === key)!.snapValues!.length).toBeGreaterThan(0)
    const height = model.dimensions.find(field => field.key === 'height')!
    expect(height.snapValues).toBeUndefined()
    expect(height.direction).toBe(-1)
    expect(height.presets!.length).toBeGreaterThan(0)
    for (const reference of height.presets!) expect(VanityNode.safeParse({...node, ...(height.patch?.(reference.value) ?? {height: reference.value})}).success).toBe(true)
  }
})

test('corner references resize equal wall lengths without introducing rectangular depth', () => {
  const node = CornerVanityNode.parse({})
  expect(vanitySizeOptions(node).map(option => option.patch)).toEqual([{width: .6}, {width: .9}])
  for (const option of vanitySizeOptions(node)) expect(CornerVanityNode.safeParse({...node, ...option.patch}).success).toBe(true)
  expect(vanitySection(node).dimensions.some(field => field.key === 'depth')).toBe(false)
})

test('wall fit limits filter presets and snap stops rather than expanding wall bounds', () => {
  const node = WallMountedVanityNode.parse({width: .6})
  const model = vanitySection(node, .7)
  expect(model.sizeOptions!.map(option => option.patch.width)).toEqual([.6])
  const field = model.dimensions.find(field => field.key === 'width')!
  expect(field.max).toBe(.7)
  expect(field.snapValues).toEqual([.6])
  expect(vanitySection(node, .55).sizeOptions).toEqual([])
})

test('sizing commits one edit; custom values and top-height changes preserve installation', () => {
  const node = FreestandingVanityNode.parse({})
  const field = vanitySection(node).dimensions.find(field => field.key === 'width')!
  expect(boundedDimensionValue(field, .62)).toBe(.6096)
  expect(boundedDimensionValue({...field, snapValues: undefined}, .7)).toBe(.7)
  const commits: unknown[] = []
  const edit = createDimensionEdit(field, {preview: () => {}, clear: () => {}, commit: patch => commits.push(patch)})
  edit.preview(.75); edit.preview(.81); edit.finish(true); edit.finish(true)
  expect(commits).toEqual([{width: .8}])
  const wall = WallMountedVanityNode.parse({mountingHeight: .25, height: .8})
  const model = vanitySection(wall)
  const height = model.dimensions.find(field => field.key === 'height')!
  expect(height.presets![0]!.value).toBeCloseTo(.25 + .628 + .025)
  expect(boundedDimensionValue(height, .835)).toBe(.835)
  expect(VanityNode.parse({...wall, height: .835}).mountingHeight).toBe(.25)
})

test('wall Section uses the same floor elevation as the inspector without moving its attachment', () => {
 const node = WallMountedVanityNode.parse({position: [1, .4, 2], height: .82, mountingHeight: .3})
 const model = vanitySection(node)
 const height = model.dimensions.find(field => field.key === 'height')!
 const clearance = model.dimensions.find(field => field.key === 'mountingHeight')!
 expect(height.value).toBeCloseTo(1.22)
 expect(clearance.value).toBeCloseTo(.7)
 expect(model.drawing.height).toBeCloseTo(1.22)
 expect(height.patch!(1.3).height).toBeCloseTo(.9)
 expect(clearance.patch!(.75).mountingHeight).toBeCloseTo(.35)
 expect(height.presets![0]!.value).toBeCloseTo(.4 + .3 + .628 + .025)
})
