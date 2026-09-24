'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import type { StreetLightNode } from './schema'
import { StreetLightModel } from './street-light-model'

export default function StreetLightPreview({ node }: { node: StreetLightNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <StreetLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
