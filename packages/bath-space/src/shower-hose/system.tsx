'use client'
import {
  getEffectiveNode,
  sceneRegistry,
  useScene,
  type AnyNodeId,
  type SceneApi,
  type GeometryContext,
} from '@pascal-app/core'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, type Material } from 'three'
import { SHOWER_HOSE, ShowerHoseNode } from './schema'
import { hoseConnection } from './connection'
import { buildHoseAt, showerHoseGeometryKey } from './geometry'
export default function ShowerHoseSystem({ sceneApi }: { sceneApi: SceneApi }) {
  const materialState = useRef({ value: useScene.getState().materials, version: 0 })
  useFrame(() => {
    const materials = useScene.getState().materials
    if (materialState.current.value !== materials) {
      materialState.current.value = materials
      materialState.current.version++
    }
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[SHOWER_HOSE] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = ShowerHoseNode.parse(getEffectiveNode(raw)),
        pose = hoseConnection(n, (id) => nodes[id as AnyNodeId]),
        signature = JSON.stringify([
          showerHoseGeometryKey(n),
          pose?.end.toArray(),
          pose?.endDirection.toArray(),
          materialState.current.version,
        ])
      if (root.userData.hoseSignature === signature) continue
      root.userData.hoseSignature = signature
      for (const child of [...root.children]) {
        if (
          child.userData.hoseDerived ||
          (child instanceof Mesh && child.userData.__fromGeometry)
        ) {
          child.traverse((o) => {
            if (o instanceof Mesh) {
              o.geometry.dispose()
              for (const m of (Array.isArray(o.material) ? o.material : [o.material]) as Material[])
                if (!m.userData.__pascalCachedMaterial) m.dispose()
            }
          })
          root.remove(child)
        }
      }
      if (pose) {
        root.position.fromArray(pose.slot.position)
        root.rotation.set(...pose.slot.rotation)
        const ctx = {
            resolve: sceneApi.get,
            materials: useScene.getState().materials,
          } as GeometryContext,
          model = buildHoseAt(n, pose.end, pose.endDirection, ctx)
        model.userData.hoseDerived = true
        root.add(model)
      }
    }
  }, 3)
  return null
}
