import {BaseNode,nodeType,objectId} from '@pascal-app/core'
import {z} from 'zod'
export const BATH_SCREEN='bath-space:bath-screen'
export const BathScreenNode=BaseNode.extend({
  id:objectId('bath-space-bath-screen'),type:nodeType(BATH_SCREEN),children:z.array(z.string()).default([]),
  position:z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]).default([0,0,0]),rotation:z.number().finite().default(0),
  width:z.number().min(0.4).max(1.1).default(0.75),height:z.number().min(1).max(1.6).default(1.35),thickness:z.number().min(0.004).max(0.012).default(0.006),
  profile:z.enum(['square','rounded']).default('rounded'),cornerRadius:z.number().min(0.02).max(0.25).default(0.12),
  mounting:z.enum(['preview','wall']).default('preview'),wallId:z.string().nullable().default(null),
  side:z.enum(['automatic','left','right']).default('automatic'),opening:z.number().min(-90).max(90).default(0),framed:z.boolean().default(false),slots:z.record(z.string(),z.string()).optional(),
})
export type BathScreenNode=z.infer<typeof BathScreenNode>
