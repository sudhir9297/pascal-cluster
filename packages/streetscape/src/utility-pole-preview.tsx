'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import type { UtilityPoleNode } from './schema'
import { UtilityPoleModel } from './utility-pole-model'

export default function UtilityPolePreview({ node }: { node: UtilityPoleNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <UtilityPoleModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
