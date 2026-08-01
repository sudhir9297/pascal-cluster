'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { CobraHeadLightModel } from './cobra-head-light-model'
import type { CobraHeadLightNode } from './schema'

export default function CobraHeadLightPreview({ node }: { node: CobraHeadLightNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <CobraHeadLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
