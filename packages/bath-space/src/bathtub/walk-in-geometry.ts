import {addBathPlumbing} from './plumbing'
import {partitionBathSurface} from './surface-geometry'
import {bathDrainPosition} from './drain'
import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { CylinderGeometry, ExtrudeGeometry, Group, Mesh, Path, Shape, TubeGeometry, CatmullRomCurve3, Vector3, type BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { BathtubNode } from './schema'
import { createBathTargets } from './targets'
export function walkInLayout(node:BathtubNode) {
  const wall=node.rimWidth,threshold=Math.min(node.thresholdHeight,node.height-0.2)
  const doorWidth=Math.min(node.doorWidth,node.width-wall*2-0.025,node.length*0.45)
  const seatDepth=Math.min(node.seatDepth,node.length-doorWidth-0.18)
  const sign=node.doorSide==='left'?1:-1
  const doorX=sign*(-node.length/2+wall+0.06+doorWidth/2)
  return {wall,threshold,doorWidth,seatDepth,seatHeight:Math.min(node.seatHeight,node.height-0.15),sign,doorX,doorLeft:doorX-doorWidth/2,doorRight:doorX+doorWidth/2}
}
export function buildWalkInGeometry(node:BathtubNode,ctx?:GeometryContext) {
  const drainPosition=bathDrainPosition(node)
  const root=new Group(),{length:l,width:w,height:h}=node,layout=walkInLayout(node),{wall:t,threshold,doorWidth,seatDepth,seatHeight,sign,doorX,doorLeft,doorRight}=layout
  const add=(parent:Group,name:string,geometry:BufferGeometry,slot:string)=>{
    const material=(node.slots?.[slot]?resolveMaterialRef(node.slots[slot]!,ctx?.materials,'rendered'):null)??createDefaultMaterial(['shell','interior','seat','door'].includes(slot)?'#ffffff':'#c0c0c0',0.22,'rendered')
    const mesh=new Mesh(geometry,material);mesh.name=name;mesh.userData={slotId:slot,__fromGeometry:true};mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh
  }
  const box=(name:string,x:number,y:number,z:number,px:number,py:number,pz:number,slot='shell')=>{const mesh=add(root,name,new RoundedBoxGeometry(x,y,z,3,Math.min(0.018,x/4,y/4,z/4)),slot);mesh.position.set(px,py,pz);return mesh}
  for(const s of [-1,1])box('walk-in-end',t,h,w,s*(l-t)/2,h/2,0)
  box('walk-in-rear',l-t*2,h,t,0,h/2,(w-t)/2)
  box('walk-in-front-left',doorLeft+l/2,h,t,(-l/2+doorLeft)/2,h/2,-(w-t)/2)
  box('walk-in-front-right',l/2-doorRight,h,t,(l/2+doorRight)/2,h/2,-(w-t)/2)
  box('walk-in-threshold',doorWidth,threshold,t,doorX,threshold/2,-(w-t)/2)
  const floor=new Shape();floor.moveTo(-l/2+t/2,-w/2+t/2);floor.lineTo(l/2-t/2,-w/2+t/2);floor.lineTo(l/2-t/2,w/2-t/2);floor.lineTo(-l/2+t/2,w/2-t/2);floor.closePath()
  const hole=new Path();hole.absarc(drainPosition[0],-drainPosition[1],0.026,0,Math.PI*2,true);floor.holes.push(hole)
  const floorGeometry=new ExtrudeGeometry(floor,{depth:threshold,bevelEnabled:false,curveSegments:48});floorGeometry.rotateX(-Math.PI/2)
  add(root,'walk-in-floor',floorGeometry,'shell')
  const seatX=sign*(l/2-t-seatDepth/2)
  box('walk-in-seat',seatDepth,seatHeight-threshold,w-t*2,seatX,(seatHeight+threshold)/2,0,'seat')
  const backHeight=h-seatHeight-0.025,backAngle=node.seatBackrestAngle*Math.PI/180
  const back=box('walk-in-seat-back',t*1.2,backHeight,w-t*2,sign*(l/2-t*1.8-Math.sin(backAngle)*backHeight/2),seatHeight+Math.cos(backAngle)*backHeight/2,0,'seat');back.rotation.z=sign*backAngle
  const door=new Group();door.name='walk-in-door-pivot';door.position.set(doorX-sign*doorWidth/2,threshold,-w/2+t/2);door.rotation.y=-sign*node.doorOpening*Math.PI/2;root.add(door)
  const doorHeight=h-threshold-0.025
  const panel=add(door,'walk-in-door',new RoundedBoxGeometry(doorWidth-0.006,doorHeight,t*0.7,4,0.018),'door');panel.position.set(sign*doorWidth/2,doorHeight/2,0)
  const seal=new Shape();seal.moveTo(0.005,0);seal.lineTo(doorWidth-0.005,0);seal.lineTo(doorWidth-0.005,doorHeight);seal.lineTo(0.005,doorHeight);seal.closePath()
  const sealHole=new Path();sealHole.moveTo(0.012,0.012);sealHole.lineTo(doorWidth-0.012,0.012);sealHole.lineTo(doorWidth-0.012,doorHeight-0.012);sealHole.lineTo(0.012,doorHeight-0.012);sealHole.closePath();seal.holes.push(sealHole)
  const sealGeometry=new ExtrudeGeometry(seal,{depth:0.002,bevelEnabled:false});if(sign<0)sealGeometry.scale(-1,1,1)
  add(door,'walk-in-door-seal',sealGeometry,'seal').position.z=t*0.36
  const handle=add(door,'walk-in-door-handle',new RoundedBoxGeometry(0.05,0.14,0.06,4,0.02),'handle');handle.position.set(sign*(doorWidth-0.07),doorHeight*0.7,-t/2-0.02)
  if(node.grabHandles) {
    const y=Math.max(seatHeight+0.12,h-0.12),z=w/2-t-0.035
    const curve=new CatmullRomCurve3([new Vector3(-l*0.18,y,z+0.025),new Vector3(-l*0.18,y,z),new Vector3(l*0.18,y,z),new Vector3(l*0.18,y,z+0.025)])
    add(root,'walk-in-grab-handle',new TubeGeometry(curve,32,0.014,12,false),'handle')
  }
  if(node.drainCover)add(root,'bathtub-drain',new CylinderGeometry(0.03,0.03,0.006,48),'drain').position.set(drainPosition[0],threshold+0.003,drainPosition[1])
  for(const mesh of [...root.children])if(mesh instanceof Mesh&&mesh.userData.slotId==='shell'){
    const g=mesh.geometry,index=g.index,normals=g.getAttribute('normal'),position=mesh.position
    const [exterior,interior]=partitionBathSurface(g,offset=>{
      const ids=[0,1,2].map(i=>index?index.getX(offset+i):offset+i),nx=ids.reduce((sum,id)=>sum+normals.getX(id),0),ny=ids.reduce((sum,id)=>sum+normals.getY(id),0),nz=ids.reduce((sum,id)=>sum+normals.getZ(id),0)
      if(mesh.name==='walk-in-floor')return ny>0.1
      if(ny>0.1)return true
      if(mesh.name==='walk-in-end')return nx*position.x<0
      if(mesh.name==='walk-in-rear')return nz<0
      if(mesh.name.startsWith('walk-in-front')||mesh.name==='walk-in-threshold')return nz>0
      return false
    })
    mesh.geometry=exterior;const inner=add(root,mesh.name+'-interior',interior,'interior');inner.position.copy(position);inner.rotation.copy(mesh.rotation)
  }
  addBathPlumbing(root,node,ctx)
  for(const target of createBathTargets(node,ctx?.parent?{[ctx.parent.id]:ctx.parent}:{}))root.add(target)
  return root
}
