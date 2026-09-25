import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
import { dimensions, drawnOutline } from '../../shared/schema'

export const CONCRETESLAB_KIND = 'landscape:concrete-slab'
export const ConcreteSlabNode = BaseNode.extend({
  id: objectId('concrete-slab'),
  type: nodeType(CONCRETESLAB_KIND),
  ...dimensions,
  ...drawnOutline,
  width: dimensions.width.default(4),
  depth: dimensions.depth.default(3),
  thickness: dimensions.thickness.default(0.15),
})
export type ConcreteSlabNode = z.infer<typeof ConcreteSlabNode>
