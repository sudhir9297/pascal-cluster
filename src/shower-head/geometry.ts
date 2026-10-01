import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { CylinderGeometry, ExtrudeGeometry, Group, Mesh, Shape, SphereGeometry, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { ShowerHeadNode } from './schema'
export const isCircularHead = (n: ShowerHeadNode) => ['round-rain','compact','bell'].includes(n.style)
export function nozzlePositions(n: ShowerHeadNode) {
  const round = isCircularHead(n), w = n.width/2, d = (round ? n.width : n.depth)/2, margin = Math.max(.008,n.nozzleDiameter*2)
  const points: [number,number][] = []
  const inside = (x:number,z:number) => {
    if(round) return Math.hypot(x,z) <= w-margin
    if(Math.abs(x)>w-margin || Math.abs(z)>d-margin) return false
    const r=n.style==='soft-square' ? Math.min(n.cornerRadius,w,d) : 0
    return !r || Math.hypot(Math.max(0,Math.abs(x)-(w-r)), Math.max(0,Math.abs(z)-(d-r))) <= Math.max(0,r-margin)
  }
  if(n.nozzleLayout==='rings' && round) {
    points.push([0,0])
    for(let radius=n.nozzleSpacing;radius<=w-margin;radius+=n.nozzleSpacing) {
      const count=Math.max(6,Math.round(2*Math.PI*radius/n.nozzleSpacing))
      for(let i=0;i<count;i++) points.push([Math.cos(i/count*Math.PI*2)*radius,Math.sin(i/count*Math.PI*2)*radius])
    }
  } else {
    const nx=Math.floor((2*w-2*margin)/n.nozzleSpacing), nz=Math.floor((2*d-2*margin)/n.nozzleSpacing)
    for(let ix=0;ix<=nx;ix++) for(let iz=0;iz<=nz;iz++) {const x=(ix-nx/2)*n.nozzleSpacing,z=(iz-nz/2)*n.nozzleSpacing;if(inside(x,z)) points.push([x,z])}
  }
  return points
}
function plate(n: ShowerHeadNode, thickness:number, inset=0): BufferGeometry {
  if(isCircularHead(n)) return new CylinderGeometry(n.width/2-inset,n.width/2-inset,thickness,64)
  const w=n.width/2-inset,d=n.depth/2-inset,r=n.style==='soft-square' ? Math.max(.001,Math.min(n.cornerRadius-inset,w,d)) : .0001
  const s=new Shape();s.moveTo(-w+r,-d);s.lineTo(w-r,-d);s.quadraticCurveTo(w,-d,w,-d+r);s.lineTo(w,d-r);s.quadraticCurveTo(w,d,w-r,d);s.lineTo(-w+r,d);s.quadraticCurveTo(-w,d,-w,d-r);s.lineTo(-w,-d+r);s.quadraticCurveTo(-w,-d,-w+r,-d)
  const g=new ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(0,-thickness/2,0);return g
}
export function buildShowerHeadGeometry(n: ShowerHeadNode,ctx?: GeometryContext) {
  const root=new Group(), body=new Group();root.add(body)
  body.rotation.set(n.tilt*Math.PI/180,n.swivel*Math.PI/180,0)
  const add=(g:BufferGeometry,slot:string,y:number)=>{const ref=n.slots?.[slot];const mat=(ref ? resolveMaterialRef(ref,ctx?.materials,'rendered'):null)??createDefaultMaterial('#ffffff',slot==='nozzles'?.65:.22,'rendered');const mesh=new Mesh(g,mat);mesh.position.y=y;mesh.userData={slotId:slot,__fromGeometry:true};body.add(mesh);return mesh}
  add(new SphereGeometry(n.neckDiameter*.65,24,16),'connector',-n.neckDiameter*.65)
  add(new CylinderGeometry(n.neckDiameter/2,n.neckDiameter/2,n.neckLength,32),'connector',-n.neckLength/2)
  const h=n.style==='bell'?n.bellHeight:n.thickness
  if(n.style==='bell') add(new CylinderGeometry(n.width*.16,n.width/2,h,64),'body',-n.neckLength-h/2)
  else add(plate(n,h),'body',-n.neckLength-h/2)
  const faceY=-n.neckLength-h
  add(plate(n,.002,.004),'face',faceY-.001)
  if(n.nozzlesEnabled){const parts=nozzlePositions(n).map(([x,z])=>{const g=new CylinderGeometry(n.nozzleDiameter/2,n.nozzleDiameter/2,.003,8);g.translate(x,faceY-.003,z);return g});if(parts.length){const merged=mergeGeometries(parts)!;for(const g of parts)g.dispose();add(merged,'nozzles',0)}}
  return root
}
export const showerHeadGeometryKey=(n:ShowerHeadNode)=>JSON.stringify([n.style,n.width,n.depth,n.thickness,n.neckLength,n.neckDiameter,n.cornerRadius,n.bellHeight,n.nozzleSpacing,n.nozzleDiameter,n.nozzleLayout,n.nozzlesEnabled,n.tilt,n.swivel,n.slots])
