import { afterEach, describe, expect, test } from 'bun:test'
import { CeilingNode, sceneRegistry } from '@pascal-app/core'
import { Object3D } from 'three'
import { findCeilingPlacementTarget } from './ceiling-placement'

const registeredIds: string[] = []

function registerCeilingHeight(id: string, height: number) {
  const object = new Object3D()
  object.position.y = height
  sceneRegistry.nodes.set(id, object)
  registeredIds.push(id)
}

afterEach(() => {
  for (const id of registeredIds.splice(0)) sceneRegistry.nodes.delete(id)
})

describe('tunnel luminaire ceiling placement', () => {
  test('selects a covering ceiling and rejects holes and uncovered points', () => {
    const levelId = 'level_test'
    const ceiling = CeilingNode.parse({
      polygon: [[0, 0], [8, 0], [8, 5], [0, 5]],
      holes: [[[3, 2], [5, 2], [5, 4], [3, 4]]],
    })
    const nodes = {
      [levelId]: { id: levelId, type: 'level', children: [ceiling.id] },
      [ceiling.id]: ceiling,
    }
    registerCeilingHeight(ceiling.id, 3.2)

    expect(findCeilingPlacementTarget(levelId, nodes as never, 1, 1)).toEqual({
      id: ceiling.id,
      height: 3.2,
    })
    expect(findCeilingPlacementTarget(levelId, nodes as never, 4, 3)).toBeNull()
    expect(findCeilingPlacementTarget(levelId, nodes as never, 9, 1)).toBeNull()
  })

  test('uses the lowest covering ceiling when ceiling regions overlap', () => {
    const levelId = 'level_test'
    const upper = CeilingNode.parse({ polygon: [[0, 0], [4, 0], [4, 4], [0, 4]] })
    const lower = CeilingNode.parse({ polygon: [[1, 1], [5, 1], [5, 5], [1, 5]] })
    const nodes = {
      [levelId]: { id: levelId, type: 'level', children: [upper.id, lower.id] },
      [upper.id]: upper,
      [lower.id]: lower,
    }
    registerCeilingHeight(upper.id, 4)
    registerCeilingHeight(lower.id, 2.8)

    expect(findCeilingPlacementTarget(levelId, nodes as never, 2, 2)).toEqual({
      id: lower.id,
      height: 2.8,
    })
  })
})
