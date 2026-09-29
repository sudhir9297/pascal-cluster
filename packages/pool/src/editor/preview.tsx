'use client'

import { useEffect, useMemo } from 'react'
import type { Material, Mesh } from 'three'
import { buildPoolPlacementPreviewGeometry } from '../core/geometry'
import type { PoolNode } from '../core/schema'

const NO_RAYCAST = () => {}

export default function PoolPreview({ node }: { node: PoolNode }) {
  const pool = useMemo(() => {
    const group = buildPoolPlacementPreviewGeometry(node)
    group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.raycast = NO_RAYCAST
    })
    return group
  }, [node])

  useEffect(() => () => {
    pool.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) material.dispose()
    })
  }, [pool])

  return <primitive object={pool} />
}
