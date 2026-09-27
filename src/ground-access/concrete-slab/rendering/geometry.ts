import type { GeometryContext } from '@pascal-app/core'
import type { ConcreteSlabNode } from '../domain/schema'
import { buildAccessFloorplan, buildAccessGeometry } from '../../shared/geometry'

export const buildConcreteSlabGeometry = (node: ConcreteSlabNode, ctx?: GeometryContext) => buildAccessGeometry(node, 'concrete-slab', ctx)
export const buildConcreteSlabFloorplan = (node: ConcreteSlabNode, ctx: GeometryContext) =>
  buildAccessFloorplan(node, 'concrete-slab', ctx)
