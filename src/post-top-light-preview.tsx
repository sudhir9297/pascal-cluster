'use client'

import { EDITOR_LAYER } from '@pascal-app/editor'
import { PostTopLightModel } from './post-top-light-model'
import type { PedestrianPostLightNode } from './schema'

export default function PostTopLightPreview({ node }: { node: PedestrianPostLightNode }) {
  return (
    <group layers={EDITOR_LAYER}>
      <PostTopLightModel ghost layer={EDITOR_LAYER} node={node} />
    </group>
  )
}
