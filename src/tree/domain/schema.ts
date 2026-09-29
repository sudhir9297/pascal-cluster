import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
import { isTreeSpecies } from './species'

export const TREE_KIND = 'landscape:tree'

export const TreeNode = BaseNode.extend({
  id: objectId('tree'),
  type: nodeType(TREE_KIND),
  position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).default([0, 0, 0]),
  rotation: z.tuple([z.literal(0), z.number().finite(), z.literal(0)]).default([0, 0, 0]),
  species: z.string().refine(isTreeSpecies, 'Unknown SeedThree species').default('whiteOak'),
  controls: z.record(z.string(), z.unknown()).default({}),
  lod: z.record(z.string(), z.union([z.number().finite(), z.boolean()])).default({}),
})

export type TreeNode = z.infer<typeof TreeNode>
