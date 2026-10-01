import { expect, test } from 'bun:test'
import { LevelNode, nodeRegistry, registerNode, useScene, type AnyNode, type AnyNodeDefinition, type AnyNodeId } from '@pascal-app/core'
import { BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Ray, Vector3 } from 'three'
import { CountertopBasinNode, UndermountBasinNode, DropInBasinNode, SemiRecessedBasinNode, WallHungBasinNode, FullPedestalBasinNode, FULL_PEDESTAL_BASIN } from '../countertop-basin/schema'
import { basinTapTarget, basinTapMoveChanges, basinTapSlotOccupants } from '../countertop-basin/tap-attachment'
import { buildCountertopBasinGeometry } from '../countertop-basin/geometry'
import { buildFullPedestalBasinGeometry } from '../full-pedestal-basin/geometry'
import { buildWallHungBasinGeometry } from '../wall-hung-basin/geometry'
import { countertopBasinDefinition } from '../countertop-basin/definition'
import { tapDefinition } from './definition'
import { createPlacedTap, tapPlacementCandidate, tapPlacementChanges } from './placement'
import { attachedTapPose } from './attachment'
import { TapNode } from './schema'
import { tapPresets } from './presets'

function fixture() {
  const level = LevelNode.parse({})
  const basin = CountertopBasinNode.parse({ parentId: level.id })
  const root = buildCountertopBasinGeometry(basin), surfaces = new Group()
  surfaces.add(root)
  return { level, basin, root, surfaces, nodes: { [level.id]: level, [basin.id]: basin } as unknown as Record<string, AnyNode>, roots: new Map([[basin.id, root]]) }
}
const ray = new Ray(new Vector3(0,10,0), new Vector3(0,-1,0))

test('hovering every basin type snaps every tap design to the exact basin-local mount', () => {
  const level = LevelNode.parse({})
  for (const basin of [CountertopBasinNode.parse({ parentId: level.id }), UndermountBasinNode.parse({ parentId: level.id }),
    DropInBasinNode.parse({ parentId: level.id }), SemiRecessedBasinNode.parse({ parentId: level.id }), WallHungBasinNode.parse({ parentId: level.id }), FullPedestalBasinNode.parse({ parentId: level.id })]) {
    const root = basin.type === FULL_PEDESTAL_BASIN ? buildFullPedestalBasinGeometry(basin) : basin.type === 'bath-space:wall-hung-basin' ? buildWallHungBasinGeometry(basin) : buildCountertopBasinGeometry(basin)
    const nodes = { [level.id]: level, [basin.id]: basin } as unknown as Record<string, AnyNode>
    const candidate = tapPlacementCandidate(ray, root, new Matrix4(), level.id, new Map([[basin.id,root]]), nodes)!
    expect(candidate).not.toBeNull()
    for (const preset of tapPresets.filter(preset => preset.mount === 'countertop')) {
      const draft = TapNode.parse({ presetId: preset.id }), placed = createPlacedTap(draft, candidate)
      expect(placed.id).not.toBe(draft.id)
      expect(placed.parentId).toBe(basin.id)
      expect(placed.position).toEqual(basinTapTarget(basin).position)
      expect(placed.rotation).toBe(basinTapTarget(basin).rotation)
      expect(placed.presetId).toBe(preset.id)
    }
  }
})

test('empty space, another level, and an obstructing item do not snap through to a basin', () => {
  const f = fixture()
  expect(tapPlacementCandidate(new Ray(new Vector3(5,10,5),new Vector3(0,-1,0)),f.surfaces,new Matrix4(),f.level.id,f.roots,f.nodes)).toBeNull()
  expect(tapPlacementCandidate(ray,f.surfaces,new Matrix4(),'other-level',f.roots,f.nodes)).toBeNull()
  const blocker = new Mesh(new BoxGeometry(1,.1,1),new MeshBasicMaterial());blocker.position.y=1;f.surfaces.add(blocker)
  expect(tapPlacementCandidate(ray,f.surfaces,new Matrix4(),f.level.id,f.roots,f.nodes)).toBeNull()
  expect(tapPlacementCandidate(ray,f.surfaces,new Matrix4(),f.level.id,f.roots,f.nodes,[blocker])).not.toBeNull()
})

test('creation updates the basin child list atomically and undo removes the attachment', () => {
  const snapshot=useScene.getState(), restore=nodeRegistry._snapshot(), raf=globalThis.requestAnimationFrame, cancel=globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
  try {
    registerNode(countertopBasinDefinition as unknown as AnyNodeDefinition)
    registerNode(tapDefinition as unknown as AnyNodeDefinition)
    const f=fixture()
    useScene.setState({nodes:{...f.nodes,[f.level.id]:{...f.level,children:[f.basin.id]}} as Record<AnyNodeId,AnyNode>,rootNodeIds:[f.level.id],readOnly:false,dirtyNodes:new Set()})
    const candidate=tapPlacementCandidate(ray,f.surfaces,new Matrix4(),f.level.id,f.roots,f.nodes)!
    const placed=createPlacedTap(TapNode.parse({}),candidate)
    expect(useScene.getState().nodes[f.basin.id as AnyNodeId]!.children).toEqual([])
    useScene.temporal.getState().clear()
    useScene.getState().applyNodeChanges({create:[{node:placed as unknown as AnyNode,parentId:f.basin.id as AnyNodeId}]})
    expect(useScene.getState().nodes[placed.id as AnyNodeId]!.parentId).toBe(f.basin.id)
    expect(useScene.getState().nodes[f.basin.id as AnyNodeId]!.children).toContain(placed.id)
    const resized={...f.basin,width:.7,depth:.5}
    expect(attachedTapPose(placed,{...f.nodes,[f.basin.id]:resized as unknown as AnyNode}).local.position).toEqual(basinTapTarget(resized).position)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[placed.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[f.basin.id as AnyNodeId]!.children).toEqual([])
  } finally {useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})


test('replacing an occupied slot removes old taps, preserves other children, and undoes as one action', () => {
  const snapshot=useScene.getState(), restore=nodeRegistry._snapshot(), raf=globalThis.requestAnimationFrame, cancel=globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{}
  try {
    registerNode(countertopBasinDefinition as unknown as AnyNodeDefinition)
    registerNode(tapDefinition as unknown as AnyNodeDefinition)
    const f=fixture(), candidate=tapPlacementCandidate(ray,f.surfaces,new Matrix4(),f.level.id,f.roots,f.nodes)!
    const old=createPlacedTap(TapNode.parse({presetId:'tap-001'}),candidate)
    const legacy=createPlacedTap(TapNode.parse({presetId:'tap-002'}),candidate)
    const descendant=TapNode.parse({parentId:old.id})
    const unrelated=CountertopBasinNode.parse({parentId:f.basin.id})
    const otherBasin=CountertopBasinNode.parse({parentId:f.level.id})
    const otherTap=TapNode.parse({parentId:otherBasin.id})
    const nodes={...f.nodes,[f.level.id]:{...f.level,children:[f.basin.id,otherBasin.id]},
      [f.basin.id]:{...f.basin,children:[old.id,legacy.id,unrelated.id]},[old.id]:{...old,children:[descendant.id]},
      [legacy.id]:legacy,[descendant.id]:descendant,[unrelated.id]:unrelated,
      [otherBasin.id]:{...otherBasin,children:[otherTap.id]},[otherTap.id]:otherTap} as unknown as Record<AnyNodeId,AnyNode>
    useScene.setState({nodes,rootNodeIds:[f.level.id],readOnly:false,dirtyNodes:new Set()})
    useScene.temporal.getState().clear()
    const replacement=tapPlacementChanges(TapNode.parse({presetId:'tap-008'}),candidate,useScene.getState().nodes)
    expect(new Set(replacement.changes.delete)).toEqual(new Set([old.id,legacy.id]))
    useScene.getState().applyNodeChanges(replacement.changes)
    const current=useScene.getState().nodes
    expect(current[old.id as AnyNodeId]).toBeUndefined()
    expect(current[legacy.id as AnyNodeId]).toBeUndefined()
    expect(current[descendant.id as AnyNodeId]).toBeUndefined()
    expect(current[unrelated.id as AnyNodeId]).toEqual(nodes[unrelated.id as AnyNodeId])
    expect(current[otherTap.id as AnyNodeId]).toEqual(otherTap as unknown as AnyNode)
    expect(current[f.basin.id as AnyNodeId]!.children).toEqual([unrelated.id,replacement.placed.id])
    expect(basinTapSlotOccupants(f.basin.id,current)).toEqual([replacement.placed.id as AnyNodeId])
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes).toEqual(nodes)
    useScene.temporal.getState().redo()
    expect(basinTapSlotOccupants(f.basin.id,useScene.getState().nodes)).toEqual([replacement.placed.id as AnyNodeId])
    const again=tapPlacementChanges(TapNode.parse({presetId:'tap-015'}),candidate,useScene.getState().nodes)
    useScene.getState().applyNodeChanges(again.changes)
    expect(basinTapSlotOccupants(f.basin.id,useScene.getState().nodes)).toEqual([again.placed.id as AnyNodeId])
  } finally {useScene.setState(snapshot);useScene.temporal.getState().clear();restore();globalThis.requestAnimationFrame=raf;globalThis.cancelAnimationFrame=cancel}
})

test('hovering the installed tap resolves its owning basin and attachment moves replace the destination occupant', () => {
  const f=fixture(), old=TapNode.parse({parentId:f.basin.id})
  const tapRoot=new Group(), mesh=new Mesh(new BoxGeometry(.1,.1,.1),new MeshBasicMaterial())
  tapRoot.add(mesh);tapRoot.position.y=1;f.root.add(tapRoot)
  f.roots.set(old.id,tapRoot);f.nodes[old.id]=old as unknown as AnyNode
  const candidate=tapPlacementCandidate(ray,f.surfaces,new Matrix4(),f.level.id,f.roots,f.nodes)!
  expect(candidate.parentId).toBe(f.basin.id)
  const free=TapNode.parse({parentId:f.level.id}); f.nodes[free.id] = free as unknown as AnyNode
  const changes=basinTapMoveChanges(free,free,f.nodes,{surface:mesh,roots:f.roots})
  expect(changes.delete).toEqual([old.id as AnyNodeId])
  expect(changes.update[0]!.data.parentId).toBe(f.basin.id)
  const ownMove=basinTapMoveChanges(old,old,f.nodes)
  expect(ownMove.delete).toEqual([])
})
