'use client'
import { getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { SHOWER_CONNECTOR, ShowerConnectorNode } from './schema'
import { connectorOutlet } from './geometry'
export default function ShowerConnectorSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[SHOWER_CONNECTOR] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = ShowerConnectorNode.parse(getEffectiveNode(raw)),
        pose = connectorOutlet(n)
      for (const childId of n.children) {
        const child = nodes[childId as AnyNodeId],
          object = sceneRegistry.nodes.get(childId)
        if (child?.parentId === id && object) {
          object.position.fromArray(pose.position)
          object.quaternion.fromArray(pose.quaternion)
        }
      }
    }
  }, 2)
  return null
}
