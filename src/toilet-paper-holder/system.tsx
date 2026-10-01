'use client'
import {getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi} from '@pascal-app/core'
import {useFrame} from '@react-three/fiber'
import {TOILET_PAPER_HOLDER, ToiletPaperHolderNode} from './schema'
import {holderPlacement} from './placement'
export default function HolderSystem({sceneApi}: {sceneApi: SceneApi}) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for(const id of sceneRegistry.byType[TOILET_PAPER_HOLDER] ?? []) {
      const raw = nodes[id as AnyNodeId], root = sceneRegistry.nodes.get(id)
      if(!raw || !root) continue
      const n = ToiletPaperHolderNode.parse(getEffectiveNode(raw)), wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
      if(wall?.type !== 'wall') continue
      const p = holderPlacement(n,getEffectiveNode(wall),n.position[0],n.side,0,true)
      if(p) {root.position.set(...p.position); root.rotation.set(0,p.rotation,0)}
    }
  },3)
  return null
}
