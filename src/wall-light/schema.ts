import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const WALL_LIGHT = 'bath-space:wall-light'
export const WallLightNode = BaseNode.extend({
  id: objectId('bath-space-wall-light'), type: nodeType(WALL_LIGHT),
  children: z.array(z.string()).default([]),
  position: z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]).default([0,2,0]),
  rotation: z.number().finite().default(0), wallId:z.string().nullable().default(null),
  side:z.enum(['front','back']).default('front'),
  mountingHeight:z.number().finite().min(0).max(5).default(2),
  shape:z.literal('bar').default('bar'),
  width:z.number().finite().min(0.2).max(1.5).default(0.6),
  height:z.number().finite().min(0.04).max(0.3).default(0.08),
  depth:z.number().finite().min(0.03).max(0.2).default(0.06),
  enabled:z.boolean().default(true), brightness:z.number().finite().min(0).max(100).default(60),
  temperature:z.enum(['warm','neutral','cool']).default('warm'),
  slots:z.record(z.string(),z.string()).optional(),
})
export type WallLightNode = z.infer<typeof WallLightNode>
export const wallLightPresets = [{shape:'bar',label:'Bathroom bar light'}] as const
export const lightColors = {warm:'#ffdab0',neutral:'#fff1de',cool:'#e3efff'} as const
