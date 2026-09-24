'use client'
import { useEffect, useMemo } from 'react'
import { Mesh } from 'three'
import type { PergolaNode } from '../domain/schema'
import { buildPergolaGeometry, disposePergolaGeometry } from './geometry'

export default function PergolaPreview({ node }: { node: PergolaNode }) {
  const group = useMemo(() => {
    const built = buildPergolaGeometry(node)
    built.traverse((object) => {
      object.raycast = () => {}
      if (object instanceof Mesh) {
        object.castShadow = false
        for (const m of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          m.transparent = true
          m.opacity = 0.45
          m.depthWrite = false
        }
      }
    })
    return built
  }, [node])
  useEffect(() => () => disposePergolaGeometry(group), [group])
  return <primitive object={group} />
}
