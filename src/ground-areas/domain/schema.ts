import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const GROUND_AREA_KIND = 'landscape:ground-area'

const point = z.tuple([z.number().finite(), z.number().finite()])
export type Point = z.infer<typeof point>

export const GROUND_SURFACES = [
  'grass',
  'soil',
  'mulch',
  'gravel',
  'sand',
  'mud',
] as const
export type GroundSurface = (typeof GROUND_SURFACES)[number]

export const GroundAreaNode = BaseNode.extend({
  id: objectId('ground-area'),
  type: nodeType(GROUND_AREA_KIND),
  // The editor initializes the tool before the first point exists. Placement
  // validates that completed areas have at least three points.
  outline: z
    .array(point)
    .refine((points) => points.length === 0 || points.length >= 3, {
      message: 'A ground area needs at least three outline points.',
    })
    .default([]),
  surface: z.enum(GROUND_SURFACES).default('grass'),
  elevation: z.number().finite().min(-100).max(100).default(0),
})
export type GroundAreaNode = z.infer<typeof GroundAreaNode>
