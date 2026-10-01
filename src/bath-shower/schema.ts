import {nodeType,objectId} from '@pascal-app/core'
import {z} from 'zod'
import {ShowerAssemblyNode} from '../shower-assembly/schema'
export const BATH_SHOWER='bath-space:bath-shower'
export const BathShowerNode=ShowerAssemblyNode.extend({
 id:objectId('bath-space-bath-shower'),type:nodeType(BATH_SHOWER),
 end:z.enum(['left','right']).default('left'),mountingHeight:ShowerAssemblyNode.shape.mountingHeight.default(1.15),height:ShowerAssemblyNode.shape.height.default(1),
})
export type BathShowerNode=z.infer<typeof BathShowerNode>
/** Shared geometry/slot builders consume the same parameters without changing the saved kind or ID. */
export const bathShowerAssembly=(node:BathShowerNode)=>node as unknown as ShowerAssemblyNode
