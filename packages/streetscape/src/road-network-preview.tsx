'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { RoadNetworkModel } from './road-network-model'
import type { RoadNetworkNode } from './schema'

export default function RoadNetworkPreview({ node }: { node: RoadNetworkNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <RoadNetworkModel ghost node={node} />
    </group>
  )
}
