import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const SHOWER_FLANGE = 'bath-space:shower-flange'
export const ShowerFlangeNode = BaseNode.extend({
  id: objectId('bath-space-shower-flange'),
  type: nodeType(SHOWER_FLANGE),
  children: z.array(z.string()).default([]),
  slotId: z.literal('wall-cover').default('wall-cover'),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 0, 0]),
  rotation: z.number().finite().default(0),
  style: z
    .enum([
      'round-plate',
      'square-plate',
      'soft-square',
      'raised-round',
      'stepped-round',
      'deep-bell',
    ])
    .default('round-plate'),
  width: z.number().finite().min(0.04).max(0.18).default(0.075),
  depth: z.number().finite().min(0.003).max(0.06).default(0.006),
  cornerRadius: z.number().finite().min(0.002).max(0.035).default(0.008),
  clearance: z.number().finite().min(0.0005).max(0.005).default(0.001),
  slots: z.record(z.string(), z.string()).optional(),
})
export type ShowerFlangeNode = z.infer<typeof ShowerFlangeNode>
export const showerFlangePresets = [
  { id: 'round-plate', label: 'Flat round', style: 'round-plate' },
  { id: 'square-plate', label: 'Square', style: 'square-plate' },
  { id: 'soft-square', label: 'Soft square', style: 'soft-square' },
  { id: 'raised-round', label: 'Raised round', style: 'raised-round', depth: 0.018 },
  { id: 'stepped-round', label: 'Stepped round', style: 'stepped-round', depth: 0.015 },
  { id: 'deep-bell', label: 'Deep bell', style: 'deep-bell', depth: 0.04 },
  { id: 'wide-plate', label: 'Wide round', style: 'round-plate', width: 0.12 },
] as const
export function flangePresetNode(p: (typeof showerFlangePresets)[number]) {
  const { id, label, ...params } = p
  return ShowerFlangeNode.parse({ ...params, name: label })
}
