import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const BODY_JET = 'bath-space:body-jet'
const metres = (min: number, max: number, value: number) =>
  z.number().finite().min(min).max(max).default(value)
export const BodyJetNode = BaseNode.extend({
  id: objectId('bath-space-body-jet'),
  type: nodeType(BODY_JET),
  children: z.array(z.string()).default([]),
  wallId: z.string().nullable().default(null),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 1.2, 0]),
  rotation: z.number().finite().default(0),
  side: z.enum(['front', 'back']).default('front'),
  mountingHeight: metres(0.5, 3.5, 1.2),
  tubeSize: metres(0.015, 0.05, 0.024),
  flangeEnabled: z.boolean().default(true),
  flangeSize: metres(0.05, 0.22, 0.1),
  flangeThickness: metres(0.003, 0.018, 0.006),
  style: z
    .enum([
      'round-flush',
      'square-flush',
      'round-swivel',
      'square-swivel',
      'slim-rectangle',
      'massage-dome',
    ])
    .default('round-flush'),
  width: metres(0.04, 0.18, 0.085),
  height: metres(0.04, 0.2, 0.085),
  projection: metres(0.008, 0.09, 0.018),
  faceDepth: metres(0.004, 0.018, 0.008),
  pitch: z.number().finite().min(-30).max(30).default(0),
  yaw: z.number().finite().min(-30).max(30).default(0),
  jetCount: z.number().int().min(1).max(4).default(1),
  groupDirection: z.enum(['vertical', 'horizontal']).default('vertical'),
  groupSpacing: metres(0.1, 0.5, 0.28),
  nozzlesEnabled: z.boolean().default(true),
  nozzleSpacing: metres(0.006, 0.025, 0.012),
  nozzleDiameter: metres(0.0015, 0.005, 0.0025),
  slots: z.record(z.string(), z.string()).optional(),
})
export type BodyJetNode = z.infer<typeof BodyJetNode>
export const bodyJetPresets = [
  { id: 'round-flush', label: 'Round flush', style: 'round-flush' },
  { id: 'square-flush', label: 'Square flush', style: 'square-flush' },
  {
    id: 'round-swivel',
    label: 'Round adjustable',
    style: 'round-swivel',
    projection: 0.055,
  },
  {
    id: 'square-swivel',
    label: 'Square adjustable',
    style: 'square-swivel',
    projection: 0.055,
  },
  {
    id: 'slim',
    label: 'Rectangular body spray',
    style: 'slim-rectangle',
    width: 0.15,
    height: 0.07,
  },
  { id: 'massage', label: 'Massage dome', style: 'massage-dome', projection: 0.045 },
  { id: 'vertical-group', label: 'Three vertical', style: 'square-flush', jetCount: 3 },
  {
    id: 'horizontal-group',
    label: 'Three horizontal',
    style: 'round-flush',
    jetCount: 3,
    groupDirection: 'horizontal',
  },
] as const
export function bodyJetPresetNode(p: (typeof bodyJetPresets)[number]) {
  const { id, label, ...params } = p
  return BodyJetNode.parse({ ...params, name: label })
}
export function bodyJetPresetParameters(p: (typeof bodyJetPresets)[number]) {
  const {
    id,
    type,
    object,
    parentId,
    children,
    wallId,
    position,
    rotation,
    side,
    mountingHeight,
    metadata,
    visible,
    name,
    slots,
    ...params
  } = bodyJetPresetNode(p)
  return params
}
