import { expect, test } from 'bun:test'
import { createSceneApi, type AnyNode, type AnyNodeId, useLiveNodeOverrides } from '@pascal-app/core'
import { PoolNode } from '../core/schema'
import { PoolDrainNode } from '../drain/core/schema'
import { PoolInletNode } from '../inlet/core/schema'
import { PoolSkimmerNode } from '../skimmer/core/schema'
import { PoolStairNode } from '../stair/core/schema'
import { poolFittingFloorplanMove } from './floorplan-fitting-move'

const modifiers = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false }

test('plan moves preview and commit pool-local wall anchors without changing scene during movement', () => {
  for (const schema of [PoolSkimmerNode, PoolInletNode, PoolStairNode]) {
    const pool = PoolNode.parse({ position: [10, 0, 20], rotation: [0, Math.PI / 2, 0] })
    const node = schema.parse({ parentId: pool.id, poolId: pool.id })
    const nodes = { [pool.id]: pool, [node.id]: node } as unknown as Record<AnyNodeId, AnyNode>
    let writes = 0
    const api = createSceneApi({ getState: () => ({ nodes, rootNodeIds: [], dirtyNodes: new Set(),
      createNode() {}, deleteNode() {}, markDirty() {},
      updateNode: (id, data) => { nodes[id] = { ...nodes[id], ...data } as AnyNode; writes++ },
    }), temporal: { getState: () => ({ pause() {}, resume() {} }) } })
    const session = poolFittingFloorplanMove({ node, nodes, sceneApi: api })
    session.apply({ planPoint: [12, 20], modifiers })
    expect(writes).toBe(0)
    expect(session.canCommit()).toBe(true)
    const preview = useLiveNodeOverrides.getState().get(node.id)!
    expect(preview.parentId).toBe(pool.id)
    const position = preview.position as number[]
    expect(position[0]).toBeCloseTo(0)
    expect(position[2]).toBeCloseTo(2)
    expect(preview.wallT).toBeCloseTo(0.5)
    session.commit!()
    expect(writes).toBe(1)
    expect(nodes[node.id as AnyNodeId]).toMatchObject({ parentId: pool.id, wallT: 0.5 })
    expect(useLiveNodeOverrides.getState().get(node.id)).toBeUndefined()
  }
})

test('drain plan moves resolve a new floor anchor and reject points outside the pool', () => {
  const pool = PoolNode.parse({ position: [10, 0, 20], floorProfile: 'shallow-to-deep' })
  const node = PoolDrainNode.parse({ parentId: pool.id, poolId: pool.id, floorAnchor: [0.25, 0.25] })
  const nodes = { [pool.id]: pool, [node.id]: node } as unknown as Record<AnyNodeId, AnyNode>
  const session = poolFittingFloorplanMove({ node, nodes })
  session.apply({ planPoint: [12, 21], modifiers })
  expect(session.canCommit()).toBe(true)
  const preview = useLiveNodeOverrides.getState().get(node.id)!
  expect(preview.floorAnchor).toEqual([0.75, 0.75])
  expect((preview.position as number[])[0]).toBeCloseTo(2)
  expect((preview.position as number[])[2]).toBeCloseTo(1)
  expect((preview.position as number[])[1]).toBeLessThan(-1)
  session.apply({ planPoint: [100, 100], modifiers })
  expect(session.canCommit()).toBe(false)
  expect(useLiveNodeOverrides.getState().get(node.id)).toBeUndefined()
  expect(node.floorAnchor).toEqual([0.25, 0.25])
})
