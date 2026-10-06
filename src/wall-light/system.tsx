'use client'
import { getEffectiveNode, sceneRegistry, useScene, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useItemLightPool } from '@pascal-app/viewer'
import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { WALL_LIGHT, WallLightNode, lightColors } from './schema'
import { wallLightPlacement } from './placement'

export default function WallLightSystem({sceneApi}:{sceneApi:SceneApi}) {
 const nodes=useScene(state=>state.nodes)
 useEffect(()=>{
  const keys:string[]=[]
  for(const raw of Object.values(nodes)) {
   if(String(raw.type)!==WALL_LIGHT)continue
   const n=WallLightNode.parse(raw),key=`bathspace-light:${n.id}`
   keys.push(key)
   useItemLightPool.getState().register({key,nodeId:n.id as AnyNodeId,color:lightColors[n.temperature],distance:5,
    getWorldPosition:out=>{
     const root=sceneRegistry.nodes.get(n.id)
     if(!root)return false
     out.set(0,0,n.depth+0.04);root.localToWorld(out);return true
    },
    getIntensity:()=>{
     const current=useScene.getState().nodes[n.id as AnyNodeId]
     if(!current)return 0
     const value=WallLightNode.parse(getEffectiveNode(current))
     return value.enabled?value.brightness*0.08:0
    },
    isEligible:()=>{
     const current=useScene.getState().nodes[n.id as AnyNodeId]
     return Boolean(current && WallLightNode.parse(getEffectiveNode(current)).enabled)
    },
   })
  }
  return ()=>{for(const key of keys)useItemLightPool.getState().unregister(key)}
 },[nodes])
 useFrame(()=>{
  const nodes=sceneApi.nodes()
  for(const id of sceneRegistry.byType[WALL_LIGHT]??[]) {
   const raw=nodes[id as AnyNodeId],root=sceneRegistry.nodes.get(id)
   if(!raw||!root)continue
   const n=WallLightNode.parse(getEffectiveNode(raw)),wall=nodes[(n.wallId??n.parentId) as AnyNodeId]
   if(wall?.type!=='wall')continue
   const p=wallLightPlacement(n,getEffectiveNode(wall),n.position[0],n.side,0,true,nodes)
   if(p){root.position.set(...p.position);root.rotation.set(0,p.rotation,0)}
  }
 },3)
 return null
}
