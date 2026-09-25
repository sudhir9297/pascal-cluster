import type { GeometryContext } from '@pascal-app/core'
import type { LandingNode } from '../domain/schema'
import { buildAccessFloorplan, buildAccessGeometry } from '../../shared/geometry'

export const buildLandingGeometry = (node: LandingNode) => buildAccessGeometry(node, 'landing')
export const buildLandingFloorplan = (node: LandingNode, ctx: GeometryContext) =>
  buildAccessFloorplan(node, 'landing', ctx)
