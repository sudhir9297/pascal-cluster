'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import type { RoadSplineNode } from './schema'
import { RoadSplineModel } from './road-spline-model'

export default function RoadSplinePreview({ node }: { node: RoadSplineNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <RoadSplineModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
