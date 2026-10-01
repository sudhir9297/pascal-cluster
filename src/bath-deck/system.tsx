'use client'
import { getEffectiveNode, sceneRegistry, type AnyNode, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Mesh, type BufferGeometry } from 'three'
import { bathDeckLocalY } from './attachment'
import { deckBaths } from './geometry'
import { BATH_DECK, BathDeckNode } from './schema'
import { deckSurfaceGeometry } from './geometry'
export default function BathDeckSystem({sceneApi}: {sceneApi:SceneApi}) {
  const cache = useRef(new Map<Mesh,{key:string;geometry:BufferGeometry}>())
  useEffect(()=>()=>{for(const entry of cache.current.values())entry.geometry.dispose();cache.current.clear()},[])
  useFrame(()=>{
    const nodes=sceneApi.nodes(),seen=new Set<Mesh>()
    for(const id of sceneRegistry.byType[BATH_DECK]??[]) {
      const raw=nodes[id as AnyNodeId],root=sceneRegistry.nodes.get(id)
      if(!raw||!root)continue
      const node=BathDeckNode.parse(getEffectiveNode(raw)),surface=root.getObjectByName('bath-deck-surface')
      if(!(surface instanceof Mesh))continue
      seen.add(surface)
      const children=node.children.map(id=>nodes[id as AnyNodeId]).filter((child): child is AnyNode => Boolean(child)).map(child=>getEffectiveNode(child))
      for(const bath of deckBaths(node,children)) {
        const object=sceneRegistry.nodes.get(bath.id);if(object)object.position.y=bathDeckLocalY(node,bath)
      }
      const key=JSON.stringify([node.length,node.width,node.height,node.thickness,children])
      const cached=cache.current.get(surface)
      if(cached?.key===key&&surface.geometry===cached.geometry)continue
      cached?.geometry.dispose()
      const geometry=deckSurfaceGeometry(node,children);surface.geometry=geometry
      cache.current.set(surface,{key,geometry})
    }
    for(const [mesh,entry] of cache.current)if(!seen.has(mesh)){entry.geometry.dispose();cache.current.delete(mesh)}
  },2)
  return null
}
