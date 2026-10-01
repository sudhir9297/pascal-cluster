import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const BATH_DECK = 'bath-space:bath-deck'
export const BathDeckNode = BaseNode.extend({
  supportSlabId: z.string().optional(),
  id: objectId('bath-space-bath-deck'),
  type: nodeType(BATH_DECK),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 0, 0]),
  rotation: z.number().finite().default(0),
  children: z.array(z.string()).default([]),
  length: z.number().min(1.5).max(3.5).default(2.2),
  width: z.number().min(0.9).max(2.5).default(1.3),
  height: z.number().min(0.4).max(0.8).default(0.55),
  thickness: z.number().min(0.02).max(0.1).default(0.04),
  enclosure: z.boolean().default(true),
  slots: z.record(z.string(), z.string()).optional(),
})
export type BathDeckNode = z.infer<typeof BathDeckNode>
