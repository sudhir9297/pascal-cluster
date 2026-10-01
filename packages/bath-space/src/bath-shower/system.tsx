'use client'
import {getEffectiveNode,sceneRegistry,type AnyNodeId,type SceneApi} from '@pascal-app/core'
import {useFrame} from '@react-three/fiber'
import {BATH_SHOWER,BathShowerNode,bathShowerAssembly} from './schema'
import {bathShowerMount} from './mounting'
import {assemblySockets} from '../shower-assembly/targets'
export default function BathShowerSystem({sceneApi}:{sceneApi:SceneApi}){
 useFrame(()=>{const nodes=sceneApi.nodes();for(const id of sceneRegistry.byType[BATH_SHOWER]??[]){
  const raw=nodes[id as AnyNodeId],root=sceneRegistry.nodes.get(id);if(!raw||!root)continue
  const n=BathShowerNode.parse(getEffectiveNode(raw)),pose=bathShowerMount(n,nodes);root.visible=n.visible!==false&&Boolean(pose)
  if(!pose)continue;root.position.fromArray(pose.position);root.rotation.y=pose.rotation
  for(const slot of assemblySockets(bathShowerAssembly(n)))for(const childId of n.children){const child=nodes[childId as AnyNodeId] as unknown as {slotId?:string,parentId?:string}|undefined,object=sceneRegistry.nodes.get(childId);if(child?.parentId===n.id&&child.slotId===slot.id&&object){object.position.fromArray(slot.position);object.rotation.set(...slot.rotation)}}
 }},2);return null
}
