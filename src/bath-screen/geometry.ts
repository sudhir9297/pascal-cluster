import type {GeometryContext} from '@pascal-app/core'
import {createDefaultMaterial,resolveMaterialRef} from '@pascal-app/viewer'
import {BoxGeometry,CurvePath,LineCurve3,Vector3,TubeGeometry,DoubleSide,ExtrudeGeometry,Group,Mesh,MeshPhysicalMaterial,Shape,type BufferGeometry} from 'three'
import {BathScreenNode} from './schema'
export function bathScreenPanelGeometry(node:BathScreenNode) {
  const w=node.width,h=node.height,r=node.profile==='rounded'?Math.min(node.cornerRadius,w/2,h/2):0,s=new Shape()
  s.moveTo(0,0);s.lineTo(w,0);s.lineTo(w,h-r);if(r)s.quadraticCurveTo(w,h,w-r,h);s.lineTo(0,h);s.closePath()
  const geometry=new ExtrudeGeometry(s,{depth:node.thickness,bevelEnabled:false,curveSegments:32});geometry.translate(0,0,-node.thickness/2);return geometry
}
export function buildBathScreenGeometry(raw:BathScreenNode,ctx?:GeometryContext) {
  const node=BathScreenNode.parse(raw),root=new Group(),leaf=new Group();leaf.name='bath-screen-leaf';leaf.rotation.y=node.opening*Math.PI/180;root.add(leaf)
  const add=(parent:Group,name:string,geometry:BufferGeometry,slot:string)=>{
    const material=(node.slots?.[slot]?resolveMaterialRef(node.slots[slot]!,ctx?.materials,'rendered'):null)??(slot==='glass'?new MeshPhysicalMaterial({color:'#d9f3fa',roughness:0.08,metalness:0,transparent:true,opacity:0.28,transmission:0.45,thickness:node.thickness,side:DoubleSide,depthWrite:false}):createDefaultMaterial('#c0c0c0',0.22,'rendered'))
    const mesh=new Mesh(geometry,material);mesh.name=name;mesh.userData={slotId:slot,__fromGeometry:true};mesh.castShadow=slot!=='glass';mesh.receiveShadow=true;parent.add(mesh);return mesh
  }
  add(leaf,'bath-screen-glass',bathScreenPanelGeometry(node),'glass')
  for(const fraction of [0.2,0.8]) {
    const hinge=add(root,'bath-screen-fixed-hinge',new BoxGeometry(0.045,0.07,0.025),'hardware');hinge.position.set(-0.0225,node.height*fraction,0)
    const clamp=add(leaf,'bath-screen-glass-clamp',new BoxGeometry(0.055,0.07,0.025),'hardware');clamp.position.set(0.028,node.height*fraction,0)
  }
  const seal=add(leaf,'bath-screen-bottom-seal',new BoxGeometry(node.width,0.008,node.thickness+0.005),'seal');seal.position.set(node.width/2,0.004,0)
  if(node.framed) {
    const w=node.width,h=node.height,r=node.profile==='rounded'?Math.min(node.cornerRadius,w/2,h/2):0
    const points=[new Vector3(0,0,0),new Vector3(w,0,0),new Vector3(w,h-r,0)]
    if(r)for(let i=1;i<=32;i++){const t=i/32;points.push(new Vector3(w-r*t*t,h-r*(1-t)*(1-t),0))}
    points.push(new Vector3(0,h,0),new Vector3(0,0,0))
    const outline=new CurvePath<Vector3>()
    for(let i=1;i<points.length;i++)outline.add(new LineCurve3(points[i-1]!,points[i]!))
    add(leaf,'bath-screen-frame',new TubeGeometry(outline,160,0.008,8,false),'hardware')
  }
  return root
}
