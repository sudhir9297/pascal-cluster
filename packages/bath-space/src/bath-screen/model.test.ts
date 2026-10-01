import {expect,test} from 'bun:test'
import {Box3,Mesh,MeshPhysicalMaterial,Vector3,Raycaster} from 'three'
import {type AnyNode} from '@pascal-app/core'
import {BathtubNode} from '../bathtub/schema'
import {BathDeckNode} from '../bath-deck/schema'
import {BathScreenNode} from './schema'
import {buildBathScreenGeometry} from './geometry'
import {attachBathScreen,bathScreenPose} from './attachment'
test('bath screens retain real thickness, transparent glass, independent hardware and finite rounded profiles',()=>{
  for(const profile of ['square','rounded'] as const)for(const framed of [false,true])for(const small of [false,true]) {
    const n=BathScreenNode.parse({profile,framed,width:small?0.4:1.1,height:small?1:1.6,thickness:small?0.004:0.012,cornerRadius:0.25}),root=buildBathScreenGeometry(n),glass=root.getObjectByName('bath-screen-glass') as Mesh
    const box=new Box3().setFromObject(glass)
    expect(box.getSize(new Vector3()).x).toBeCloseTo(n.width,6);expect(box.getSize(new Vector3()).y).toBeCloseTo(n.height,6);expect(box.getSize(new Vector3()).z).toBeCloseTo(n.thickness,6)
    expect((glass.material as MeshPhysicalMaterial).transparent).toBe(true);expect((glass.material as MeshPhysicalMaterial).opacity).toBeLessThan(1)
    root.updateMatrixWorld(true)
    const corner=new Raycaster(new Vector3(n.width-0.001,n.height-0.001,-1),new Vector3(0,0,1)).intersectObject(glass)
    expect(corner.length>0).toBe(profile==='square')
    if(framed){const frame=root.getObjectByName('bath-screen-frame') as Mesh;expect(new Raycaster(new Vector3(n.width-0.001,n.height-0.001,-1),new Vector3(0,0,1)).intersectObject(frame).length>0).toBe(profile==='square')}
    root.traverse(o=>{if(o instanceof Mesh){for(const key of ['position','normal','uv'])for(const v of o.geometry.getAttribute(key).array)expect(Number.isFinite(v)).toBe(true);o.geometry.dispose()}})
  }
})
test('screen mounting follows bath proportions, deck surface and opposite walk-in entry, while corner fronts reject this layout',()=>{
  const screen=BathScreenNode.parse({}),bath=BathtubNode.parse({shape:'walk-in',height:0.99,doorSide:'left'})
  expect(bathScreenPose(screen,bath).mirror).toBe(-1)
  expect(bathScreenPose(screen,{...bath,doorSide:'right'}).mirror).toBe(1)
  const deck=BathDeckNode.parse({height:0.65,thickness:0.06}),under=BathtubNode.parse({shape:'undermount',parentId:deck.id,height:0.58})
  expect(bathScreenPose(screen,under,{[deck.id]:deck as unknown as AnyNode}).position[1]).toBeCloseTo(0.642,6)
  expect(bathScreenPose(screen,{...bath,length:2}).position[0]).toBeCloseTo(0.985,6)
  expect(()=>attachBathScreen(screen,{...bath,shape:'corner'},{})).toThrow('dedicated screen layout')
})

test('screen pivots both inward and outward while retaining its bath hinge',()=>{
  for(const opening of [-90,0,90]){const node=BathScreenNode.parse({opening}),root=buildBathScreenGeometry(node);expect(root.getObjectByName('bath-screen-leaf')!.rotation.y).toBeCloseTo(opening*Math.PI/180,8)}
})
