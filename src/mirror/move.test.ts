import { expect, test } from 'bun:test'
import { LevelNode, WallNode, useScene, useLiveNodeOverrides, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { MirrorNode } from './schema'
import { createMirrorPlanMove } from './move-session'
test('mirror plan mover retains its wall and height and clears invalid previews',()=>{
  const scene=useScene.getState()
  const level=LevelNode.parse({height:2.5})
  const wall=WallNode.parse({parentId:level.id,start:[0,0],end:[4,0]})
  level.children = [wall.id]
  const mirror=MirrorNode.parse({parentId:wall.id,wallId:wall.id,position:[1,1.5,0.05]})
  const changes: Partial<AnyNode>[]=[]
  useScene.setState({nodes:{[level.id]:level,[wall.id]:wall,[mirror.id]:mirror} as Record<AnyNodeId,AnyNode>,updateNode:(_id,patch)=>{changes.push(patch)}})
  try {
    const move=createMirrorPlanMove({node:mirror} as Parameters<typeof createMirrorPlanMove>[0])
    move.apply({planPoint:[1,0]} as Parameters<typeof move.apply>[0])
    move.apply({planPoint:[2,0]} as Parameters<typeof move.apply>[0])
    expect(move.canCommit?.()).toBe(true)
    const preview=useLiveNodeOverrides.getState().overrides.get(mirror.id)
    expect(preview?.position).toEqual([2,1.5,0.05])
    move.commit?.()
    expect(changes[0]?.parentId).toBe(wall.id)
    expect(changes[0]?.position).toEqual([2,1.5,0.05])
    move.apply({planPoint:[2,0]} as Parameters<typeof move.apply>[0])
    move.apply({planPoint:[2,20]} as Parameters<typeof move.apply>[0])
    expect(move.canCommit?.()).toBe(false)
    expect(useLiveNodeOverrides.getState().overrides.get(mirror.id)?.position).toBeUndefined()
  } finally {
    useLiveNodeOverrides.getState().clearFields(mirror.id,['parentId','wallId','position','rotation','side','mountingHeight'])
    useScene.setState(scene,true)
  }
})
