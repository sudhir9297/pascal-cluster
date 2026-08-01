'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { MultiHeadAreaLightModel } from './multi-head-area-light-model'
import type { MultiHeadAreaLightNode } from './schema'

export default function MultiHeadAreaLightPreview({ node }: { node: MultiHeadAreaLightNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <MultiHeadAreaLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
