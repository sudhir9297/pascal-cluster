import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode } from '@pascal-app/core'
import { MirrorNode } from '../mirror/schema'
import { TowelRailNode } from '../towel-rail/schema'
import { WallLightNode } from '../wall-light/schema'
import { bathroomDesignReview } from './design-review'
const scene = (...nodes: unknown[]) => Object.fromEntries(nodes.map(value => { const n=value as AnyNode; return [n.id,n] })) as Record<string,AnyNode>
test('review detects saved overhangs and inherited wall height changes without false fit errors', () => {
  const level=LevelNode.parse({height:2.5}),wall=WallNode.parse({parentId:level.id,start:[0,0],end:[3,0]}),mirror=MirrorNode.parse({parentId:wall.id,wallId:wall.id,position:[1.5,1.5,0.1]})
  expect(bathroomDesignReview(scene(level,wall,mirror))).toEqual([])
  expect(bathroomDesignReview(scene({...level,height:1.5},wall,mirror))[0]?.id).toEndWith(':fit')
  expect(bathroomDesignReview(scene(level,wall,{...mirror,position:[0.1,1.5,0.1]}))[0]?.id).toEndWith(':fit')
  expect(bathroomDesignReview(scene(level,wall,{...mirror,position:[2.9,1.5,0.1]}))[0]?.id).toEndWith(':fit')
})
test('review reports missing hosts and broken finishes, retaining hidden fixture context', () => {
  const rail=TowelRailNode.parse({visible:false,slots:{metal:'missing-finish'}})
  const issues=bathroomDesignReview(scene(rail))
  expect(issues.map(issue=>issue.id.split(':').slice(-1)[0])).toEqual(['wall','metal'])
  expect(issues.every(issue=>issue.fixture.hidden)).toBe(true)
})

test('light review uses real vertical and end bounds, independent of hidden wall visibility', () => {
 const level=LevelNode.parse({height:2.5}),wall=WallNode.parse({parentId:level.id,start:[0,0],end:[3,0],visible:false})
 const light=WallLightNode.parse({parentId:wall.id,wallId:wall.id,position:[1.5,2,0.1]})
 expect(bathroomDesignReview(scene(level,wall,light))).toEqual([])
 const issues=bathroomDesignReview(scene({...level,height:1.8},wall,light))
 expect(issues[0]?.id).toEndWith(':fit')
 expect(issues[0]?.fixture.hidden).toBe(true)
 expect(bathroomDesignReview(scene(level,wall,{...light,position:[2.9,2,0.1]}))[0]?.id).toEndWith(':fit')
})
