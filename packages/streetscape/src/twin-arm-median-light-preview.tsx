'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { TwinArmMedianLightModel } from './twin-arm-median-light-model'
import type { TwinArmMedianLightNode } from './schema'

export default function TwinArmMedianLightPreview({ node }: { node: TwinArmMedianLightNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <TwinArmMedianLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
