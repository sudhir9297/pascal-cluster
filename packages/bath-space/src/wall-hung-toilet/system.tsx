'use client'
import { useEffect } from 'react'
import { separateLegacyToiletControls } from '../flush-control/migration'
import {
  getEffectiveNode,
  useScene,
  sceneRegistry,
  type AnyNodeId,
  type SceneApi,
} from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { WALL_HUNG_TOILET, WallHungToiletNode } from './schema'
import { toiletPlacement } from './placement'
export default function ToiletSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useEffect(() => {
    let running = false
    const migrate = () => {
      const state = useScene.getState()
      if (running || state.readOnly) return
      const changes = separateLegacyToiletControls(state.nodes)
      if (!changes.update.length) return
      running = true
      const history = useScene.temporal.getState(),
        wasTracking = history.isTracking
      if (wasTracking) history.pause()
      try {
        state.applyNodeChanges(changes)
      } finally {
        if (wasTracking) history.resume()
        running = false
      }
    }
    migrate()
    return useScene.subscribe(migrate)
  }, [])
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[WALL_HUNG_TOILET] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = WallHungToiletNode.parse(getEffectiveNode(raw)),
        wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
      if (wall?.type !== 'wall') continue
      const target = toiletPlacement(
        n,
        getEffectiveNode(wall),
        n.position[0],
        n.side,
        0,
        true,
      )
      if (target) {
        root.position.set(...target.position)
        root.rotation.y = target.rotation
      }
    }
  }, 2)
  return null
}
