'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { TrussRoadwayLightModel } from './truss-roadway-light-model'
import type { TrussRoadwayLightNode } from './schema'

export default function TrussRoadwayLightPreview({ node }: { node: TrussRoadwayLightNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <TrussRoadwayLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
