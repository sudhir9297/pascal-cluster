import {expect,test} from 'bun:test'
import {Mesh,Raycaster,Vector3,Box3} from 'three'
import {BathtubNode,bathRimWidth,bathBowlDepth} from './schema'
import {buildBathtubGeometry,bathtubGeometryKey} from './geometry'
import {bathBackrestPresets,bathWellFloor,bathBackrestDepth} from './backrest'
import {bathDrainPosition,bathDrainFloor,drainFitsFloor} from './drain'
import {bathSection} from './section'

test('independent straight slopes change the actual well ends and keep the central drain in the resulting floor',()=>{
 const n=BathtubNode.parse({shape:'rectangle',backrestProfile:'straight',backrestLeftAngle:15,backrestRightAngle:45,overflow:false}),g=buildBathtubGeometry(n),well=bathWellFloor(n),depth=bathBackrestDepth(n),floor=n.height-bathBowlDepth(n),fraction=.5
 g.updateMatrixWorld(true)
 const interior=g.getObjectByName('bathtub-interior')!,left=new Raycaster(new Vector3(well.center,floor+depth*fraction,0),new Vector3(-1,0,0)).intersectObject(interior,true)[0]!,right=new Raycaster(new Vector3(well.center,floor+depth*fraction,0),new Vector3(1,0,0)).intersectObject(interior,true)[0]!
 expect(left.point.x).toBeCloseTo(-n.length/2+bathRimWidth(n)+depth*Math.tan(15*Math.PI/180)*(1-fraction),4)
 expect(right.point.x).toBeCloseTo(n.length/2-bathRimWidth(n)-depth*Math.tan(45*Math.PI/180)*(1-fraction),4)
 expect(bathDrainPosition(n)[0]).toBeCloseTo(well.center,6);expect(drainFitsFloor(bathDrainPosition(n),bathDrainFloor(n))).toBe(true)
 const mirror={...n,backrestLeftAngle:45,backrestRightAngle:15};expect(bathWellFloor(mirror).center).toBeCloseTo(-well.center,6);expect(bathtubGeometryKey(mirror)).not.toBe(bathtubGeometryKey(n));expect(bathSection(mirror).drawing.section).not.toBe(bathSection(n).drawing.section)
})
test('profile variants stay hollow, finite and within the shell at extreme dimensions and slope requests',()=>{
 for(const shape of ['oval','rectangle','slipper','corner','undermount'] as const)for(const p of bathBackrestPresets)for(const small of [true,false]){
  const n=BathtubNode.parse({shape,backrestProfile:p.id,backrestLeftAngle:55,backrestRightAngle:10,length:small?1.2:2.2,width:shape==='corner'?1.4:.8,height:.58,drainEnd:'right',drainDistance:1,drainCover:false}),g=buildBathtubGeometry(n),drain=bathDrainPosition(n)
  expect(drainFitsFloor(drain,bathDrainFloor(n))).toBe(true);g.updateMatrixWorld(true)
  expect(new Raycaster(new Vector3(drain[0],2,drain[1]),new Vector3(0,-1,0)).intersectObject(g,true).filter(h=>['shell','interior'].includes(h.object.userData.slotId)).map(h=>({shape,profile:p.id,small,drain,point:h.point.toArray(),name:h.object.name}))).toEqual([])
  const box=new Box3().setFromObject(g);expect(box.min.x).toBeCloseTo(-n.length/2,5);expect(box.max.x).toBeCloseTo(n.length/2,5)
  g.traverse(o=>{if(o instanceof Mesh){for(const a of ['position','normal','uv'])expect(Array.from(o.geometry.getAttribute(a).array).every(Number.isFinite)).toBe(true);o.geometry.dispose()}})
 }
},15000)
test('walk-in seat backs lean inward on either hand and preserve the requested angle through serialization',()=>{
 for(const doorSide of ['left','right'] as const)for(const seatBackrestAngle of [0,12]){
  const n=BathtubNode.parse({shape:'walk-in',height:1.15,doorSide,seatBackrestAngle}),g=buildBathtubGeometry(n),back=g.getObjectByName('walk-in-seat-back') as Mesh,sign=doorSide==='left'?1:-1
  expect(back.rotation.z).toBeCloseTo(sign*seatBackrestAngle*Math.PI/180,6);const b=new Box3().setFromObject(back);expect(b.min.x).toBeGreaterThan(-n.length/2);expect(b.max.x).toBeLessThan(n.length/2)
  expect(BathtubNode.parse(JSON.parse(JSON.stringify(n))).seatBackrestAngle).toBe(seatBackrestAngle);expect(bathSection(n).dimensions.find(d=>d.key==='seatBackrestAngle')?.value).toBe(seatBackrestAngle)
 }
})
