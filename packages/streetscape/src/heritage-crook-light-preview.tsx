'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { HeritageCrookLightModel } from './heritage-crook-light-model'
import type { HeritageCrookLightNode } from './schema'

export default function HeritageCrookLightPreview({
  node,
}: {
  node: HeritageCrookLightNode
}) {
  return (
    <group layers={EDITOR_LAYER}>
      <HeritageCrookLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
