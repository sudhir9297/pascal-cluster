import {expect,test} from 'bun:test'
import {cloneNodesInto,LevelNode,WallNode,nodeRegistry,registerNode,useScene,type AnyNode,type AnyNodeDefinition,type AnyNodeId} from '@pascal-app/core'
import {bathtubDefinition} from '../bathtub/definition'
import {BathtubNode} from '../bathtub/schema'
import {bathScreenDefinition} from './definition'
import {BathScreenNode} from './schema'
import {attachBathScreen,bathScreenWallMount} from './attachment'
test('screen attachment replacement, undo, subtree duplication and deletion preserve capacity and hierarchy',()=>{
 const snapshot=useScene.getState(),restore=nodeRegistry._snapshot(),raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame
 globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
 try {
  registerNode(bathtubDefinition as unknown as AnyNodeDefinition);registerNode(bathScreenDefinition as unknown as AnyNodeDefinition)
  const level=LevelNode.parse({}),bath=BathtubNode.parse({parentId:level.id})
  useScene.setState({nodes:{[level.id]:level,[bath.id]:bath as unknown as AnyNode},rootNodeIds:[level.id],readOnly:false,dirtyNodes:new Set()});useScene.temporal.getState().clear()
  const first=attachBathScreen(BathScreenNode.parse({}),bath,useScene.getState().nodes);useScene.getState().applyNodeChanges(first.changes)
  expect(useScene.getState().nodes[bath.id as AnyNodeId]!.children).toEqual([first.placed.id])
  const second=attachBathScreen(BathScreenNode.parse({profile:'square'}),bath,useScene.getState().nodes);useScene.getState().applyNodeChanges(second.changes)
  expect(useScene.getState().nodes[first.placed.id as AnyNodeId]).toBeUndefined();expect(useScene.getState().nodes[bath.id as AnyNodeId]!.children).toEqual([second.placed.id])
  useScene.temporal.getState().undo();expect(useScene.getState().nodes[bath.id as AnyNodeId]!.children).toEqual([first.placed.id])
  const cloned=cloneNodesInto([useScene.getState().nodes[bath.id as AnyNodeId]!,useScene.getState().nodes[first.placed.id as AnyNodeId]!],{rootId:bath.id as AnyNodeId,parentId:level.id})
  expect(cloned.nodes[0]!.children).toEqual([cloned.nodes[1]!.id]);expect(cloned.nodes[1]!.parentId).toBe(cloned.rootId)
  useScene.getState().applyNodeChanges({delete:[bath.id as AnyNodeId]});expect(useScene.getState().nodes[first.placed.id as AnyNodeId]).toBeUndefined()
  useScene.temporal.getState().undo();expect(useScene.getState().nodes[first.placed.id as AnyNodeId]!.parentId).toBe(bath.id)
 }finally{useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})

test('wall attachment survives save, cloning, wall deletion and undo without claiming missing support',()=>{
 const snapshot=useScene.getState(),restore=nodeRegistry._snapshot(),raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame
 globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
 try {
  registerNode(bathtubDefinition as unknown as AnyNodeDefinition);registerNode(bathScreenDefinition as unknown as AnyNodeDefinition)
  const level=LevelNode.parse({height:2.5}),wall=WallNode.parse({parentId:level.id,start:[-0.9,-1],end:[-0.9,1],thickness:0.1}),bath=BathtubNode.parse({parentId:level.id})
  level.children=[wall.id,bath.id]
  useScene.setState({nodes:{[level.id]:level,[wall.id]:wall,[bath.id]:bath as unknown as AnyNode},rootNodeIds:[level.id],readOnly:false,dirtyNodes:new Set()});useScene.temporal.getState().clear()
  const result=attachBathScreen(BathScreenNode.parse({}),bath,useScene.getState().nodes);useScene.getState().applyNodeChanges(result.changes)
  const saved=BathScreenNode.parse(JSON.parse(JSON.stringify(useScene.getState().nodes[result.placed.id as AnyNodeId])))
  expect(saved.mounting).toBe('wall');expect(saved.wallId).toBe(wall.id)
  const cloned=cloneNodesInto([useScene.getState().nodes[bath.id as AnyNodeId]!,saved as unknown as AnyNode],{rootId:bath.id as AnyNodeId,parentId:level.id})
  expect(BathScreenNode.parse(cloned.nodes[1]).wallId).toBe(wall.id)
  useScene.getState().applyNodeChanges({delete:[wall.id]})
  const after=useScene.getState().nodes[saved.id as AnyNodeId];expect(after).toBeDefined()
  expect(bathScreenWallMount(BathScreenNode.parse(after),bath,useScene.getState().nodes)).toBeNull()
  useScene.temporal.getState().undo();expect(bathScreenWallMount(saved,bath,useScene.getState().nodes)?.wallId).toBe(wall.id)
 }finally{useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})
