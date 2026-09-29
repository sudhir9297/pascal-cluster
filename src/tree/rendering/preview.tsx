'use client'
import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import type { TreeNode } from '../domain/schema'
import { buildTreeGeometry, disposeTreeGeometry } from './geometry'

export default function TreePreview({ node }: { node: TreeNode }) {
  const group = useMemo(() => {
    const result = buildTreeGeometry(node)
    result.traverse((object: Object3D) => { object.raycast = () => {} })
    return result
  }, [node])
  useEffect(() => () => disposeTreeGeometry(group), [group])
  return <primitive object={group} />
}
