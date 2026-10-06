import type {GeometryContext} from '@pascal-app/core'
import {createDefaultMaterial,resolveMaterialRef} from '@pascal-app/viewer'
import {Group,Mesh,CylinderGeometry,SphereGeometry} from 'three'
import type {TowelRailNode} from './schema'
export function buildTowelRailGeometry(n:TowelRailNode,ctx?:GeometryContext){
 const root=new Group()
 const material=(n.slots?.metal?resolveMaterialRef(n.slots.metal,ctx?.materials,'rendered'):null)??createDefaultMaterial('#bbc3cb',0.2,'rendered')
 const add=(geometry:CylinderGeometry|SphereGeometry,x:number,z:number)=>{
  const mesh=new Mesh(geometry,material);mesh.position.set(x,0,z);mesh.castShadow=true;mesh.receiveShadow=true
  mesh.userData={slotId:'metal',__fromGeometry:true};root.add(mesh);return mesh
 }
 const half=n.width/2-0.025
 for(const x of [-half,half]){
  add(new CylinderGeometry(0.025,0.025,0.008,32),x,0.004).rotation.x=Math.PI/2
  add(new CylinderGeometry(0.009,0.009,n.depth-0.008,24),x,(n.depth+0.008)/2).rotation.x=Math.PI/2
 }
 for(const z of n.shape==='double'?[n.depth*0.55,n.depth]:[n.depth]){
  add(new CylinderGeometry(0.01,0.01,half*2,32),0,z).rotation.z=Math.PI/2
  for(const x of [-half,half])add(new SphereGeometry(0.01,20,12),x,z)
 }
 return root
}
export const towelRailGeometryKey=(n:TowelRailNode)=>JSON.stringify([n.shape,n.width,n.depth,n.slots])
