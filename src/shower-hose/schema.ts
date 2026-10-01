import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const SHOWER_HOSE = 'bath-space:shower-hose'
export const ShowerHoseNode = BaseNode.extend({
  id: objectId('bath-space-shower-hose'),
  type: nodeType(SHOWER_HOSE),
  children: z.array(z.string()).default([]),
  slotId: z.literal('hose').default('hose'),
  followHostHandset:z.boolean().default(false),
  targetId: z.string().nullable().default(null),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 0, 0]),
  rotation: z.number().finite().default(0),
  style: z.enum(['smooth', 'metal', 'ribbon']).default('smooth'),
  length: z.number().finite().min(0.5).max(3).default(1.6),
  diameter: z.number().finite().min(0.01).max(0.025).default(0.014),
  connectorLength: z.number().finite().min(0.015).max(0.05).default(0.028),
  ribSpacing: z.number().finite().min(0.003).max(0.015).default(0.006),
  bow: z.number().finite().min(0).max(0.3).default(0.06),
  slots: z.record(z.string(), z.string()).optional(),
})
export type ShowerHoseNode = z.infer<typeof ShowerHoseNode>
export const showerHosePresets = [
  { style: 'smooth', label: 'Smooth' },
  { style: 'metal', label: 'Ribbed metal' },
  { style: 'ribbon', label: 'Ribbon' },
] as const
