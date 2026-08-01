'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import type { RoadSignNode } from './schema'
import { RoadSignModel } from './road-sign-model'

export default function RoadSignPreview({ node }: { node: RoadSignNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <RoadSignModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
