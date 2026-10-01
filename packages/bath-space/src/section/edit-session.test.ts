import { expect, test } from 'bun:test'
import { createDimensionEdit, type DimensionPatch } from './edit-session'
import { basinSection } from './model'
import { CountertopBasinNode } from '../countertop-basin/schema'

function fixture() {
  let committed = CountertopBasinNode.parse({ width: .5 })
  let preview: DimensionPatch | null = null
  let commits = 0
  const events: string[] = []
  const field = basinSection(committed).dimensions[0]!
  const edit = createDimensionEdit(field, {
    preview: patch => { events.push('preview'); preview = patch },
    commit: patch => { events.push('commit'); committed = CountertopBasinNode.parse({ ...committed, ...patch }); commits++ },
    clear: () => { events.push('clear'); preview = null },
  })
  return { edit, node: () => committed, preview: () => preview, commits: () => commits, events }
}

test('dimension edits preview repeatedly without changing the saved node and commit once before removing the preview', () => {
  const f = fixture()
  f.edit.preview(.6)
  f.edit.preview(.7)
  expect(f.node().width).toBe(.5)
  expect(f.preview()).toEqual({ width: .7 })
  expect(f.commits()).toBe(0)
  f.edit.finish(true)
  f.edit.finish(true)
  expect(f.node().width).toBe(.7)
  expect(f.commits()).toBe(1)
  expect(f.preview()).toBeNull()
  expect(f.events).toEqual(['preview', 'preview', 'commit', 'clear'])
})

test('cancelling a preview restores saved dimensions without creating an undo entry', () => {
  const f = fixture()
  f.edit.preview(.8)
  f.edit.finish(false)
  f.edit.preview(.6)
  expect(f.preview()).toBeNull()
  expect(f.node().width).toBe(.5)
  expect(f.commits()).toBe(0)
})

test('invalid input never reaches the preview and returning to the original size does not commit', () => {
  const f = fixture()
  f.edit.preview(NaN)
  f.edit.preview(Infinity)
  expect(f.preview()).toBeNull()
  f.edit.preview(100)
  expect(f.preview()).toEqual({ width: .8 })
  f.edit.preview(.5)
  f.edit.finish(true)
  expect(f.commits()).toBe(0)
})

test('failed commits still clear the transient edit', () => {
  let cleared = false
  const field = basinSection(CountertopBasinNode.parse({})).dimensions[0]!
  const edit = createDimensionEdit(field, { preview: () => {}, commit: () => { throw new Error('Commit failed') }, clear: () => { cleared = true } })
  edit.preview(.7)
  expect(() => edit.finish(true)).toThrow('Commit failed')
  expect(cleared).toBe(true)
})
