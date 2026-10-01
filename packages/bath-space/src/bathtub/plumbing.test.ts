import {expect,test} from 'bun:test'
import {Mesh,Raycaster,Vector3,Box3} from 'three'
import {BathtubNode,bathtubPresets} from './schema'
import {buildBathtubGeometry,bathtubGeometryKey} from './geometry'
import {bathDrainPosition} from './drain'
import {bathSection} from './section'

test('every bath overflow is a through opening with a hollow channel, including handed and concealed-rim types',()=>{
 for(const preset of bathtubPresets)for(const drainEnd of ['left','center','right'] as const){
  const node=BathtubNode.parse({...preset,drainEnd}),group=buildBathtubGeometry(node),trim=group.getObjectByName('bathtub-overflow')!
  expect(trim).toBeDefined()
  const inlet=new Vector3().fromArray(trim.userData.inlet),direction=node.shape==='walk-in'||drainEnd==='center'?new Vector3(0,0,1):new Vector3(drainEnd==='left'?-1:1,0,0)
  group.updateMatrixWorld(true)
  const bodies:Mesh[]=[];group.traverse(o=>{if(o instanceof Mesh&&['shell','interior','overflow'].includes(o.userData.slotId))bodies.push(o)})
  const ray=new Raycaster(inlet.clone().addScaledVector(direction,-.04),direction)
  expect(ray.intersectObjects(bodies,false).map(h=>({shape:node.shape,drainEnd,name:h.object.name,point:h.point.toArray()}))).toEqual([])
  const closed=buildBathtubGeometry({...node,overflow:false});closed.updateMatrixWorld(true)
  expect(closed.getObjectByName('bathtub-overflow-channel')).toBeUndefined()
  expect(ray.intersectObject(closed,true).some(hit=>hit.object.userData.slotId==='interior')).toBe(true)
 }
})
test('waste plumbing follows drain edits, stays finite and exposes a real open pipe outlet',()=>{
 for(const shape of ['oval','slipper','corner','walk-in'] as const)for(const wasteOutletAngle of [-Math.PI,0,Math.PI/2]){
  const node=BathtubNode.parse({shape,showPlumbing:true,drainEnd:'right',drainDistance:.2,drainCrossOffset:.05,wasteOutletAngle}),g=buildBathtubGeometry(node),drain=bathDrainPosition(node),tail=g.getObjectByName('bathtub-waste-tailpiece') as Mesh
  const outlet=g.getObjectByName('bath-waste-outlet')!;expect(outlet.userData.diameter).toBe(.042);expect(outlet.position.y).toBeCloseTo(-node.wasteRecessDepth+.075,6);
  expect(tail).toBeDefined();expect(g.getObjectByName('bathtub-overflow-hose')).toBeDefined()
  g.updateMatrixWorld(true);const direction=new Vector3().fromArray(outlet.userData.direction);expect(new Raycaster(outlet.position.clone().addScaledVector(direction,.005),direction.clone().negate(),0,.012).intersectObject(g.getObjectByName('bathtub-waste-trap')!,true)).toHaveLength(0)
  const box=new Box3().setFromObject(tail);expect((box.min.x+box.max.x)/2).toBeCloseTo(drain[0],5);expect((box.min.z+box.max.z)/2).toBeCloseTo(drain[1],5)
  g.traverse(o=>{if(o instanceof Mesh){for(const name of ['position','normal','uv'])expect(Array.from(o.geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)}})
  expect(bathtubGeometryKey(node)).not.toBe(bathtubGeometryKey({...node,wasteOutletAngle:wasteOutletAngle+.01}))
  const hidden=buildBathtubGeometry({...node,showPlumbing:false});expect(hidden.getObjectByName('bathtub-waste-trap')).toBeUndefined();expect(hidden.getObjectByName('bathtub-overflow-channel')).toBeDefined()
 }
})

test('typed waste parameters preserve angular units and hide when plumbing is concealed',()=>{const n=BathtubNode.parse({showPlumbing:true,wasteOutletAngle:Math.PI/2}),fields=bathSection(n).dimensions;const angle=fields.find(f=>f.key==='wasteOutletAngle')!;expect(angle.value).toBeCloseTo(90,6);expect(angle.patch!(180)).toEqual({wasteOutletAngle:Math.PI});expect(fields.some(f=>f.key==='wasteRecessDepth')).toBe(true);expect(bathSection({...n,showPlumbing:false}).dimensions.some(f=>f.key==='wasteRecessDepth')).toBe(false)})
