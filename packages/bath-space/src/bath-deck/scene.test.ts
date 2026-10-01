import { expect,test } from 'bun:test'
import { cloneNodesInto,LevelNode,nodeRegistry,registerNode,useScene,type AnyNode,type AnyNodeDefinition,type AnyNodeId } from '@pascal-app/core'
import { bathtubDefinition } from '../bathtub/definition'
import { BathtubNode } from '../bathtub/schema'
import { bathDeckDefinition } from './definition'
import { dropInAssembly } from './assembly'
import { attachBathToDeck, detachBathFromDeck } from './attachment'
import { BathDeckNode } from './schema'
for(const shape of ['drop-in','undermount'] as const)test(`${shape} assembly creation, transfer, detachment, duplication, undo, redo and deletion preserve the host hierarchy`,()=>{
  const snapshot=useScene.getState(),restore=nodeRegistry._snapshot(),raf=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
  try {
    registerNode(bathtubDefinition as unknown as AnyNodeDefinition);registerNode(bathDeckDefinition as unknown as AnyNodeDefinition)
    const level=LevelNode.parse({})
    useScene.setState({nodes:{[level.id]:level},rootNodeIds:[level.id],readOnly:false,dirtyNodes:new Set()});useScene.temporal.getState().clear()
    const assembly=dropInAssembly(BathtubNode.parse({shape,position:[2,0,3],rotation:Math.PI/3}),level.id)
    useScene.getState().applyNodeChanges(assembly.changes)
    expect(useScene.getState().nodes[assembly.deck.id as AnyNodeId]!.children).toEqual([assembly.bath.id])
    expect(useScene.getState().nodes[assembly.bath.id as AnyNodeId]!.parentId).toBe(assembly.deck.id)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[assembly.deck.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[assembly.bath.id as AnyNodeId]).toBeUndefined()
    useScene.temporal.getState().redo()
    expect(useScene.getState().nodes[assembly.deck.id as AnyNodeId]!.children).toEqual([assembly.bath.id])
    const second=BathDeckNode.parse({parentId:level.id,position:[5,0,6],height:0.7})
    useScene.getState().applyNodeChanges({create:[{node:second as unknown as AnyNode,parentId:level.id}]})
    useScene.getState().applyNodeChanges(attachBathToDeck(assembly.bath,second,useScene.getState().nodes))
    expect(useScene.getState().nodes[assembly.deck.id as AnyNodeId]!.children).toEqual([])
    expect(useScene.getState().nodes[second.id as AnyNodeId]!.children).toEqual([assembly.bath.id])
    useScene.getState().applyNodeChanges(detachBathFromDeck(BathtubNode.parse(useScene.getState().nodes[assembly.bath.id as AnyNodeId]),useScene.getState().nodes))
    const detached=BathtubNode.parse(useScene.getState().nodes[assembly.bath.id as AnyNodeId])
    expect(detached.parentId).toBe(level.id)
    expect(detached.position).toEqual([5,0,6])
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[assembly.bath.id as AnyNodeId]!.parentId).toBe(second.id)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[assembly.bath.id as AnyNodeId]!.parentId).toBe(assembly.deck.id)
    const clone=cloneNodesInto([useScene.getState().nodes[assembly.deck.id as AnyNodeId]!,useScene.getState().nodes[assembly.bath.id as AnyNodeId]!],{rootId:assembly.deck.id as AnyNodeId,parentId:level.id})
    expect(clone.nodes[0]!.children).toEqual([clone.nodes[1]!.id])
    expect(clone.nodes[1]!.parentId).toBe(clone.rootId)
    expect(clone.nodes[1]!.id).not.toBe(assembly.bath.id)
    useScene.getState().applyNodeChanges({delete:[assembly.deck.id as AnyNodeId]})
    expect(useScene.getState().nodes[assembly.bath.id as AnyNodeId]).toBeUndefined()
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[assembly.bath.id as AnyNodeId]!.parentId).toBe(assembly.deck.id)
  } finally {useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})
