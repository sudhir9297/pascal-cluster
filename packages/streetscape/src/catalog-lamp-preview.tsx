'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { CatalogLampModel } from './catalog-lamp-model'
import type { CatalogLampNode } from './catalog-lamp-config'

export default function CatalogLampPreview({ node }: { node: CatalogLampNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <CatalogLampModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}

