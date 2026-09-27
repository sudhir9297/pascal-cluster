import { describe, expect, test } from 'bun:test'
import { useScene, type AnyNode } from '@pascal-app/core'
import { PoolNode } from '../core/schema'
import { poolParentLinkUpdates } from './pool-parent-links'
import { initializePoolOpeningSync } from '../editor/opening-system'

describe('pool render hierarchy', () => {
  test('moves a pool into its declared parent so its mesh and ground opening share a frame', () => {
    const pool = PoolNode.parse({ id: 'pool_custom_misparented', shape: 'custom',
      parentId: 'level_a', position: [8, 0, -4],
      polygon: [[-2, -1], [2, -1], [2, 1], [-2, 1]] })
    const site = { id: 'site_a', type: 'site', parentId: null,
      children: ['building_a', pool.id] }
    const building = { id: 'building_a', type: 'building', parentId: site.id,
      position: [4, 0, 3] as [number, number, number], rotation: [0, 0, 0], children: ['level_a'] }
    const level = { id: 'level_a', type: 'level', parentId: building.id, children: [] }
    const updates = poolParentLinkUpdates({ [pool.id]: pool, [site.id]: site,
      [building.id]: building, [level.id]: level })
    expect(updates).toEqual([
      { id: site.id, data: { children: ['building_a'] } },
      { id: level.id, data: { children: [pool.id] } },
    ])
  })

  test('leaves a correctly parented pool unchanged', () => {
    const pool = PoolNode.parse({ id: 'pool_custom_parented', parentId: 'level_a' })
    expect(poolParentLinkUpdates({ [pool.id]: pool,
      level_a: { id: 'level_a', type: 'level', children: [pool.id] } })).toEqual([])
  })

  test('opening sync restores a saved custom pool to the level that owns its opening', () => {
    const before = useScene.getState()
    const history = useScene.temporal.getState()
    const pool = PoolNode.parse({
      id: 'pool_custom_saved', shape: 'custom', parentId: 'level_a',
      position: [8, 0, -4], polygon: [[-2, -1], [2, -1], [2, 1], [-2, 1]],
    })
    const site = { id: 'site_a', type: 'site', parentId: null, children: ['building_a', pool.id] }
    const building = { id: 'building_a', type: 'building', parentId: site.id,
      position: [4, 0, 3] as [number, number, number], rotation: [0, 0, 0], children: ['level_a'] }
    const level = { id: 'level_a', type: 'level', parentId: building.id, level: 0, children: [] as string[] }
    const nodes = Object.fromEntries([pool, site, building, level].map((node) => [node.id, node])) as Record<string, AnyNode>
    let stop = () => {}
    try {
      useScene.setState({ nodes, rootNodeIds: [site.id as AnyNode['id']], readOnly: false, applyNodeChanges: (changes) => {
        const next: Record<string, AnyNode> = { ...useScene.getState().nodes }
        for (const { id, data } of changes.update ?? []) next[id] = { ...next[id], ...data } as AnyNode
        for (const { node, parentId } of changes.create ?? []) {
          next[node.id] = node
          if (parentId && next[parentId]) {
            const parent = next[parentId]!
            next[parentId] = { ...parent, children: [...new Set([...('children' in parent ? parent.children : []), node.id])] } as AnyNode
          }
        }
        for (const id of changes.delete ?? []) delete next[id]
        useScene.setState({ nodes: next })
      } })
      stop = initializePoolOpeningSync()
      const repaired = useScene.getState().nodes
      expect((repaired[site.id as AnyNode['id']] as unknown as typeof site).children).not.toContain(pool.id)
      expect((repaired[level.id as AnyNode['id']] as unknown as typeof level).children).toContain(pool.id)
      const helper = Object.values(repaired).find((node) =>
        node.type === 'slab' && (node.metadata as Record<string, unknown> | undefined)?.poolGroundOpeningFor === pool.id,
      )
      expect(helper).toBeDefined()
      expect(helper?.parentId).toBe(level.id)
      if (helper?.type === 'slab') {
        const [sumX, sumZ] = helper.polygon.reduce<[number, number]>(
          ([x, z], point) => [x + point[0], z + point[1]], [0, 0],
        )
        expect(sumX / helper.polygon.length).toBeCloseTo(pool.position[0] + building.position[0])
        expect(sumZ / helper.polygon.length).toBeCloseTo(pool.position[2] + building.position[2])
      }
    } finally {
      stop()
      useScene.setState(before)
      useScene.temporal.setState(history)
    }
  })
})
