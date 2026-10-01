import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const WALL_SPOUT = 'bath-space:wall-spout'
const metres = (min: number, max: number, value: number) =>
  z.number().finite().min(min).max(max).default(value)
export const WallSpoutNode = BaseNode.extend({
  id: objectId('bath-space-wall-spout'),
  type: nodeType(WALL_SPOUT),
  children: z.array(z.string()).default([]),
  wallId: z.string().nullable().default(null),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 0.65, 0]),
  rotation: z.number().finite().default(0),
  side: z.enum(['front', 'back']).default('front'),
  mountingHeight: metres(0.5, 3.5, 0.65),
  fixtureType: z.enum(['spout', 'bib']).default('spout'),
  style: z
    .enum([
      'round-straight',
      'round-curved',
      'round-arched',
      'round-tapered',
      'square-straight',
      'square-angled',
      'waterfall-open',
      'waterfall-closed',
    ])
    .default('round-straight'),
  length: metres(0.08, 0.4, 0.18),
  tubeSize: metres(0.018, 0.07, 0.036),
  drop: metres(0.01, 0.15, 0.04),
  rise: metres(0.02, 0.18, 0.08),
  bendRadius: metres(0.01, 0.08, 0.035),
  waterfallWidth: metres(0.06, 0.3, 0.14),
  waterfallHeight: metres(0.012, 0.05, 0.024),
  waterfallSlope: z.number().finite().min(0).max(20).default(5),
  flangeEnabled: z.boolean().default(true),
  flangeShape: z.enum(['round', 'square', 'rectangle']).default('round'),
  flangeSize: metres(0.035, 0.35, 0.06),
  flangeThickness: metres(0.003, 0.02, 0.006),
  diverterStyle: z.enum(['none', 'pull-up', 'button']).default('none'),
  diverterRaised: z.boolean().default(false),
  diverterSize: metres(0.01, 0.035, 0.018),
  hoseOutletEnabled: z.boolean().default(false),
  handleStyle: z.enum(['lever', 'cross', 'knob']).default('lever'),
  handleLength: metres(0.025, 0.1, 0.05),
  handleAngle: z.number().finite().min(-180).max(180).default(0),
  aeratorEnabled: z.boolean().default(true),
  slots: z.record(z.string(), z.string()).optional(),
})
export type WallSpoutNode = z.infer<typeof WallSpoutNode>
export const waterfallSpout = (n: WallSpoutNode) => n.style.startsWith('waterfall')
export const spoutFootprint = (n: WallSpoutNode) =>
  Math.max(n.tubeSize, n.flangeSize, waterfallSpout(n) ? n.waterfallWidth : 0)
export const wallSpoutPresets = [
  { id: 'round', label: 'Round straight spout', style: 'round-straight' },
  { id: 'curve', label: 'Curved round spout', style: 'round-curved' },
  { id: 'arch', label: 'Arched round spout', style: 'round-arched' },
  { id: 'taper', label: 'Tapered bath spout', style: 'round-tapered', tubeSize: 0.05 },
  { id: 'square', label: 'Square spout', style: 'square-straight', flangeShape: 'square' },
  { id: 'angled', label: 'Angled square spout', style: 'square-angled', flangeShape: 'square' },
  {
    id: 'waterfall-open',
    label: 'Open waterfall spout',
    style: 'waterfall-open',
    flangeShape: 'rectangle',
  },
  {
    id: 'waterfall-closed',
    label: 'Slit waterfall spout',
    style: 'waterfall-closed',
    flangeShape: 'rectangle',
  },
  {
    id: 'round-diverter',
    label: 'Round pull-up diverter spout',
    style: 'round-tapered',
    diverterStyle: 'pull-up',
  },
  {
    id: 'square-diverter',
    label: 'Square pull-up diverter spout',
    style: 'square-straight',
    flangeShape: 'square',
    diverterStyle: 'pull-up',
  },
  {
    id: 'button-diverter',
    label: 'Round button and hose spout',
    style: 'round-straight',
    diverterStyle: 'button',
    hoseOutletEnabled: true,
  },
  {
    id: 'waterfall-diverter',
    label: 'Waterfall button spout',
    style: 'waterfall-closed',
    flangeShape: 'rectangle',
    diverterStyle: 'button',
  },
  {
    id: 'bib-round',
    label: 'Round lever bib tap',
    fixtureType: 'bib',
    style: 'round-curved',
    length: 0.12,
    handleStyle: 'lever',
  },
  {
    id: 'bib-square',
    label: 'Square lever bib tap',
    fixtureType: 'bib',
    style: 'square-straight',
    flangeShape: 'square',
    length: 0.12,
    handleStyle: 'lever',
  },
  {
    id: 'bib-cross',
    label: 'Cross-handle bib tap',
    fixtureType: 'bib',
    style: 'round-curved',
    length: 0.12,
    handleStyle: 'cross',
  },
] as const
export function wallSpoutPresetNode(p: (typeof wallSpoutPresets)[number]) {
  const { id, label, ...params } = p
  return WallSpoutNode.parse({ ...params, name: label })
}
export function wallSpoutPresetParameters(p: (typeof wallSpoutPresets)[number]) {
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
  } = wallSpoutPresetNode(p)
  return params
}
