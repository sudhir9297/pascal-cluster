'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import { StreetInfrastructureModel } from './street-infrastructure-model'

export default function StreetInfrastructurePreview({ node }: { node: StreetInfrastructureNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <StreetInfrastructureModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
