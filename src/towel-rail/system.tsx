'use client'
import {getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi} from '@pascal-app/core'
import {useFrame} from '@react-three/fiber'
import {TOWEL_RAIL, TowelRailNode} from './schema'
import {towelRailPlacement} from './placement'
export default function TowelRailSystem({sceneApi}: {sceneApi: SceneApi}) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for(const id of sceneRegistry.byType[TOWEL_RAIL] ?? []) {
      const raw = nodes[id as AnyNodeId], root = sceneRegistry.nodes.get(id)
      if(!raw || !root) continue
      const n = TowelRailNode.parse(getEffectiveNode(raw)), wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
      if(wall?.type !== 'wall') continue
      const p = towelRailPlacement(n,getEffectiveNode(wall),n.position[0],n.side,0,true,nodes)
      if(p) {root.position.set(...p.position); root.rotation.set(0,p.rotation,0)}
    }
  },3)
  return null
}
