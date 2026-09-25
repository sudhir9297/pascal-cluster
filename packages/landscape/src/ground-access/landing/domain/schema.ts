import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
import { dimensions, drawnOutline } from '../../shared/schema'

export const LANDING_KIND = 'landscape:landing'
export const LandingNode = BaseNode.extend({
  id: objectId('landing'),
  type: nodeType(LANDING_KIND),
  ...dimensions,
  ...drawnOutline,
  width: dimensions.width.default(2),
  depth: dimensions.depth.default(2),
  thickness: dimensions.thickness.default(0.18),
})
export type LandingNode = z.infer<typeof LandingNode>
