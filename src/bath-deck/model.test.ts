import { bathDimensionLimits, fitBathToDeck, deckMinimumDimensions } from './fit'
import { bathMovePose } from '../bathtub/floorplan-move'
import { expect, test } from 'bun:test'
import { type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Mesh, Raycaster, Vector3 } from 'three'
import { BathtubNode } from '../bathtub/schema'
import { bathTapLocalToLevel, bathTapTarget } from '../bathtub/targets'
import { BathDeckNode } from './schema'
import { buildBathDeckGeometry, deckBathFits, deckOpening } from './geometry'
import { bathDeckLocalY, bathLevelNode } from './attachment'
function hits(deck:BathDeckNode,baths:AnyNode[],x:number,z:number) {
  const group=buildBathDeckGeometry(deck,{children:baths} as GeometryContext)
  group.updateMatrixWorld(true)
  const result=new Raycaster(new Vector3(x,2,z),new Vector3(0,-1,0)).intersectObject(group,true)
  group.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose()})
  return result
}
test('drop-in decks have a real derived opening that follows offset, rotation, resizing and removal',()=>{
  const deck=BathDeckNode.parse({length:2.8,width:2.1})
  const bath=BathtubNode.parse({shape:'drop-in',parentId:deck.id,position:[0.15,0,-0.1],rotation:Math.PI/5})
  expect(deckBathFits(deck,bath)).toBe(true)
  expect(hits(deck,[bath as unknown as AnyNode],0.15,-0.1)).toHaveLength(0)
  expect(hits(deck,[bath as unknown as AnyNode],1.3,0.8).length).toBeGreaterThan(0)
  expect(hits(deck,[],0.15,-0.1).length).toBeGreaterThan(0)
  const moved={...bath,position:[-0.5,0,0.2] as [number,number,number],length:1.2,width:0.65}
  expect(deckOpening(moved)).not.toEqual(deckOpening(bath))
  expect(hits(deck,[moved as unknown as AnyNode],-0.5,0.2)).toHaveLength(0)
  const invalid={...bath,position:[3,0,0] as [number,number,number]}
  expect(deckBathFits(deck,invalid)).toBe(false)
  expect(hits(deck,[invalid as unknown as AnyNode],0,0).length).toBeGreaterThan(0)
})
test('deck-parented bath and fitting poses follow deck movement, rotation and height',()=>{
  const deck=BathDeckNode.parse({position:[3,0,4],rotation:Math.PI/2,height:0.6})
  const bath=BathtubNode.parse({shape:'drop-in',parentId:deck.id,position:[0.1,0,0.2],height:0.58,tapMount:'rim'})
  const nodes={[deck.id]:deck as unknown as AnyNode}
  const pose=bathLevelNode(bath,nodes)
  expect(pose.position[0]).toBeCloseTo(3.2,6)
  expect(pose.position[2]).toBeCloseTo(3.9,6)
  expect(pose.position[1]).toBeCloseTo(bathDeckLocalY(deck,bath),6)
  const target=bathTapLocalToLevel(bath,bathTapTarget(bath),nodes)
  expect(target.position[1]).toBeCloseTo(deck.height+0.025,6)
  expect(target.rotation).toBeCloseTo(deck.rotation,6)
})

test('deck fit constraints retain a landing around the rim and keep the bowl above the floor',()=>{
  const deck=BathDeckNode.parse({length:2,width:1.1,height:0.55,position:[3,0,4],rotation:Math.PI/2})
  const bath=BathtubNode.parse({shape:'drop-in',parentId:deck.id,length:1.7,width:0.8,height:0.57})
  const limits=bathDimensionLimits(bath,deck)
  expect(limits.length).toBeCloseTo(1.92,6)
  expect(limits.width).toBeCloseTo(1.02,6)
  expect(limits.height).toBeCloseTo(0.575,6)
  expect(fitBathToDeck({...bath,height:0.6},deck)).toBeNull()
  expect(fitBathToDeck({...bath,length:2.1},deck)).toBeNull()
  expect(fitBathToDeck({...bath,rotation:Math.PI/2},deck)).toBeNull()
  const move=bathMovePose(bath,[20,0,20],{[deck.id]:deck as unknown as AnyNode})!
  expect(Math.abs(move.position[0])).toBeLessThanOrEqual(0.11+1e-8)
  expect(Math.abs(move.position[2])).toBeLessThanOrEqual(0.11+1e-8)
  const minimum=deckMinimumDimensions(deck,[{...bath,position:[0.05,0,0.02]} as unknown as AnyNode])
  expect(minimum.length).toBeCloseTo(1.88,6)
  expect(minimum.width).toBeCloseTo(0.92,6)
  expect(minimum.height).toBeCloseTo(0.545,6)
})

 test('undermount bowls have covered rims, well-sized cutouts and thickness-aware floor clearance',()=>{
  for(const builtInShape of ['oval','rectangle'] as const) {
    const deck=BathDeckNode.parse({length:2.3,width:1.4,height:0.65,thickness:0.06})
    const bath=BathtubNode.parse({shape:'undermount',builtInShape,parentId:deck.id,height:0.58})
    expect(deckBathFits(deck,bath)).toBe(true)
    expect(hits(deck,[bath as unknown as AnyNode],0,0)).toHaveLength(0)
    expect(hits(deck,[bath as unknown as AnyNode],bath.length/2-0.025,0).length).toBeGreaterThan(0)
    expect(bathDeckLocalY(deck,bath)+bath.height).toBeCloseTo(deck.height-deck.thickness-0.002,6)
    expect(bathDeckLocalY(deck,bath)).toBeGreaterThanOrEqual(0)
    expect(bathDimensionLimits(bath,deck).height).toBeCloseTo(0.588,6)
    expect(fitBathToDeck({...bath,height:0.6},deck)).toBeNull()
    expect(deckMinimumDimensions(deck,[bath as unknown as AnyNode]).height).toBeCloseTo(0.642,6)
    expect(deckOpening({...bath,rimWidth:0.1})).not.toEqual(deckOpening(bath))
    expect(hits(deck,[],0,0).length).toBeGreaterThan(0)
  }
})
