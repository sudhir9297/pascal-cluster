import {comboFixture} from './test-fixture'
import {expect,test} from 'bun:test'
import {LevelNode,WallNode,type AnyNode,type AnyNodeId,type GeometryContext} from '@pascal-app/core'
import {BathtubNode} from '../bathtub/schema'
import {BathScreenNode} from '../bath-screen/schema'
import {bathScreenParentPose,bathScreenPose} from '../bath-screen/attachment'
import {BathShowerNode,BATH_SHOWER} from './schema'
import {createBathShower} from './creation'
import {bathShowerMount,bathShowerWorldPose} from './mounting'
import {bathShowerDefinition} from './definition'
import {ShowerHeadNode} from '../shower-head/schema'
import {attachShowerHead} from '../shower-head/attachment'
import {attachHandShower} from '../hand-shower/attachment'
import {HandShowerNode} from '../hand-shower/schema'
import {ShowerHoseNode} from '../shower-hose/schema'
import {hoseConnection} from '../shower-hose/connection'
import {Mesh,Vector3,Euler} from 'three'
test('bath shower creates distinct replaceable parts, valid hose connection, finite geometry and transformed screen',()=>{
 for(const end of ['left','right'] as const)for(const rotation of [0,.63,Math.PI/2]){
  const {nodes,bath,node}=comboFixture(end,rotation),mount=bathShowerMount(node,nodes)!,world=bathShowerWorldPose(node,id=>nodes[id])!
  expect(String(node.type)).toBe(BATH_SHOWER);expect(node.children.length).toBe(4);expect(mount).not.toBeNull();expect(world.yaw).toBeCloseTo(rotation+(end==='left'?Math.PI/2:-Math.PI/2),6)
  const screen=BathScreenNode.parse(nodes[node.children[3]!]!),local=bathScreenParentPose(screen,bath,nodes)!,inBath=new Vector3(...local.position).applyEuler(new Euler(0,mount.rotation,0)).add(new Vector3(...mount.position))
  expect(inBath.distanceTo(new Vector3(...bathScreenPose(screen,bath,nodes).position))).toBeLessThan(1e-8)
  expect(local.rotation+mount.rotation).toBeCloseTo(0,8)
  const hose=ShowerHoseNode.parse(nodes[node.children[2]!]!);expect(hoseConnection(hose,id=>nodes[id])).not.toBeNull()
  expect(attachShowerHead(ShowerHeadNode.parse({style:'compact'}),node.id,nodes).changes.delete).toEqual([node.children[0]!])
  expect(attachHandShower(HandShowerNode.parse({style:'square'}),node.id,nodes).changes.delete).toContain(node.children[1]!)
  const ctx={resolve:(id:AnyNodeId)=>nodes[id],sceneNodes:nodes,parents:nodes} as unknown as GeometryContext
  expect(bathShowerDefinition.floorplan!(node,ctx)).not.toBeNull();expect(bathShowerDefinition.capabilities.slots!(node).length).toBeGreaterThan(5)
  const root=bathShowerDefinition.geometry!(node,ctx);root.traverse(o=>{if(o instanceof Mesh){for(const value of o.geometry.getAttribute('position').array)expect(Number.isFinite(value)).toBe(true);o.geometry.dispose()}})
 }
})
test('bath shower rejects absent walls, submerged controls and excessive head footprint',()=>{
 const {nodes,bath,wall,node}=comboFixture();expect(bathShowerMount({...node,mountingHeight:.5},nodes)).toBeNull();expect(bathShowerMount({...node,height:1.8},nodes)).toBeNull()
 const missing={...nodes};delete missing[wall.id];expect(()=>createBathShower(bath,missing)).toThrow('compatible end wall')
 const head=ShowerHeadNode.parse(nodes[node.children[0]!]!);expect(bathShowerMount(node,{...nodes,[head.id]:{...head,width:.6,depth:.6} as unknown as AnyNode})).toBeNull()
})

test('curved wells and wall ends constrain the fixture footprint beyond the outer bath rectangle',()=>{
 const {nodes,bath,wall,node}=comboFixture(),head=ShowerHeadNode.parse(nodes[node.children[0]!]!)
 const wide={...nodes,[bath.id]:{...bath,shape:'oval'} as unknown as AnyNode,[head.id]:{...head,width:.4,depth:.25} as unknown as AnyNode}
 expect(bathShowerMount(node,nodes)).not.toBeNull();expect(bathShowerMount(node,wide)).toBeNull()
 expect(bathShowerMount(node,{...nodes,[wall.id]:{...wall,start:[-.9,-.08],end:[-.9,.08]}})).toBeNull()
})
