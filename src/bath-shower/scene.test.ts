import {attachHandShower} from '../hand-shower/attachment'
import {HandShowerNode} from '../hand-shower/schema'
import {hoseTargetId,hoseConnection} from '../shower-hose/connection'
import {expect,test} from 'bun:test'
import {useScene,nodeRegistry,registerNode,cloneNodesInto,collectSubtree,type AnyNode,type AnyNodeId,type AnyNodeDefinition} from '@pascal-app/core'
import {comboFixture} from './test-fixture'
import {createBathShower} from './creation'
import {BathShowerNode} from './schema'
import {bathShowerDefinition} from './definition'
import {bathtubDefinition} from '../bathtub/definition'
import {bathScreenDefinition} from '../bath-screen/definition'
import {showerHeadDefinition} from '../shower-head/definition'
import {handShowerDefinition} from '../hand-shower/definition'
import {showerHoseDefinition} from '../shower-hose/definition'
import {attachShowerHead} from '../shower-head/attachment'
import {ShowerHeadNode} from '../shower-head/schema'
import {ShowerHoseNode} from '../shower-hose/schema'
import {bathShowerMount} from './mounting'
test('bath combination replacement, head slots, save, subtree cloning, deletion and undo remain atomic',()=>{
 const snapshot=useScene.getState(),restore=nodeRegistry._snapshot(),raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame
 globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
 try{
  for(const def of [bathShowerDefinition,bathtubDefinition,bathScreenDefinition,showerHeadDefinition,handShowerDefinition,showerHoseDefinition])registerNode(def as unknown as AnyNodeDefinition)
  const {nodes,bath,node}=comboFixture(),levelId=bath.parentId as AnyNodeId
  useScene.setState({nodes:nodes as Record<AnyNodeId,AnyNode>,rootNodeIds:[levelId],readOnly:false,dirtyNodes:new Set()});useScene.temporal.getState().clear()
  const replacement=createBathShower(bath,useScene.getState().nodes);useScene.getState().applyNodeChanges(replacement.changes)
  expect(useScene.getState().nodes[node.id as AnyNodeId]).toBeUndefined();for(const id of node.children)expect(useScene.getState().nodes[id as AnyNodeId]).toBeUndefined()
  expect(useScene.getState().nodes[bath.id as AnyNodeId]!.children).toEqual([replacement.node.id])
  useScene.temporal.getState().undo();expect(useScene.getState().nodes[node.id as AnyNodeId]!.children).toEqual(node.children)
  useScene.temporal.getState().redo();const current=BathShowerNode.parse(useScene.getState().nodes[replacement.node.id as AnyNodeId]),saved=BathShowerNode.parse(JSON.parse(JSON.stringify(current)));expect(saved.wallId).toBe(current.wallId)
  const newHead=attachShowerHead(ShowerHeadNode.parse({style:'compact'}),current.id,useScene.getState().nodes);useScene.getState().applyNodeChanges(newHead.changes);expect(useScene.getState().nodes[current.children[0] as AnyNodeId]).toBeUndefined();expect(bathShowerMount(BathShowerNode.parse(useScene.getState().nodes[current.id as AnyNodeId]),useScene.getState().nodes)).not.toBeNull()
  const newHand=attachHandShower(HandShowerNode.parse({style:'square'}),current.id,useScene.getState().nodes);useScene.getState().applyNodeChanges(newHand.changes);expect(ShowerHoseNode.parse(useScene.getState().nodes[current.children[2] as AnyNodeId]).followHostHandset).toBe(true)
  const subtree=collectSubtree(useScene.getState().nodes,bath.id as AnyNodeId)!,cloned=cloneNodesInto([subtree.root,...subtree.descendants],{rootId:bath.id as AnyNodeId,parentId:levelId})
  const clonedCombo=BathShowerNode.parse(cloned.nodes.find(raw=>String(raw.type)==='bath-space:bath-shower')),hose=ShowerHoseNode.parse(cloned.nodes.find(raw=>String(raw.type)==='bath-space:shower-hose'))
  expect(clonedCombo.parentId).toBe(cloned.rootId);const clonedNodes={...useScene.getState().nodes,...Object.fromEntries(cloned.nodes.map(n=>[n.id,n]))};expect(hose.targetId).toBeNull();expect(hoseTargetId(hose,id=>clonedNodes[id as AnyNodeId])).toBe(cloned.nodes.find(raw=>String(raw.type)==='bath-space:hand-shower')!.id);expect(hoseConnection(hose,id=>clonedNodes[id as AnyNodeId])).not.toBeNull();expect(cloned.nodes.find(raw=>String(raw.type)==='bath-space:bath-screen')!.parentId).toBe(clonedCombo.id)
  useScene.getState().applyNodeChanges({delete:[current.id as AnyNodeId]});expect(useScene.getState().nodes[bath.id as AnyNodeId]).toBeDefined();for(const id of current.children)expect(useScene.getState().nodes[id as AnyNodeId]).toBeUndefined()
  expect(useScene.getState().nodes[newHand.placed.id as AnyNodeId]).toBeUndefined();expect(useScene.getState().nodes[newHead.placed.id as AnyNodeId]).toBeUndefined();useScene.temporal.getState().undo();expect(useScene.getState().nodes[current.id as AnyNodeId]).toBeDefined()
 }finally{useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})
