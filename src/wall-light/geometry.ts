import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { lightColors, type WallLightNode } from './schema'
export function buildWallLightGeometry(n:WallLightNode,ctx?:GeometryContext) {
 const root=new Group()
 const housing=(n.slots?.housing ? resolveMaterialRef(n.slots.housing,ctx?.materials,'rendered'):null) ?? createDefaultMaterial('#393c40',0.25,'rendered')
 const body=new Mesh(new BoxGeometry(n.width,n.height,n.depth),housing)
 body.position.z=n.depth/2;body.castShadow=true;body.receiveShadow=true
 body.userData={slotId:'housing',__fromGeometry:true};root.add(body)
 const color=lightColors[n.temperature]
 const diffuser=new Mesh(new BoxGeometry(n.width-0.02,n.height-0.02,0.004),new MeshStandardMaterial({color:'#faf8f2',roughness:0.45,emissive:color,emissiveIntensity:n.enabled?n.brightness/50:0}))
 diffuser.position.z=n.depth+0.002;diffuser.userData={__fromGeometry:true};root.add(diffuser)
 return root
}
export const wallLightGeometryKey=(n:WallLightNode)=>JSON.stringify([n.width,n.height,n.depth,n.enabled,n.brightness,n.temperature,n.slots])
