'use client'

import { useCallback, useMemo } from 'react'
import { GeometryPreview } from '../../editor/geometry-preview'
import { useAttachmentPool } from '../../editor/attachment-pool'
import { buildPoolStairGeometry } from '../core/geometry'
import type { PoolStairNode } from '../core/schema'
import { resolvePoolStairMounting } from '../design/mounting'
import { resolveMountedPoolStair } from '../design/placement'

export default function PoolStairPreview({ node }: { node: PoolStairNode }) {
  const pool = useAttachmentPool(node.poolId, true)
  const committedPool = useAttachmentPool(node.poolId)
  const mounted = useMemo(() => resolveMountedPoolStair(node, pool), [node, pool])
  const committedMounted = useMemo(() => resolveMountedPoolStair(node, committedPool), [node, committedPool])
  const mounting = resolvePoolStairMounting(committedMounted, committedPool)
  const buildGeometry = useCallback(
    (value: PoolStairNode) => buildPoolStairGeometry(value, mounting),
    [mounting.deckReach, mounting.innerOffset, mounting.railHeight],
  )
  return <GeometryPreview node={mounted} geometryNode={committedMounted} buildGeometry={buildGeometry} />
}
