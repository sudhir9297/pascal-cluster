import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const SHOWER_VALVE = 'bath-space:shower-valve'
export const ShowerValveNode = BaseNode.extend({
  id: objectId('bath-space-shower-valve'),
  type: nodeType(SHOWER_VALVE),
  children: z.array(z.string()).default([]),
  slotId: z.literal('valve-body').default('valve-body'),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 0, 0]),
  rotation: z.number().finite().default(0),
  family: z
    .enum(['pressure-balance', 'thermostatic', 'transfer', 'stop', 'universal'])
    .default('pressure-balance'),
  bodyShape: z.enum(['round', 'rectangular']).default('round'),
  width: z.number().finite().min(0.06).max(0.24).default(0.12),
  height: z.number().finite().min(0.06).max(0.3).default(0.12),
  mountingDepth: z.number().finite().min(0.04).max(0.2).default(0.085),
  portDiameter: z.number().finite().min(0.015).max(0.035).default(0.022),
  portLength: z.number().finite().min(0.01).max(0.04).default(0.022),
  outletCount: z.number().int().min(1).max(3).default(2),
  serviceStops: z.boolean().default(false),
  housingEnabled: z.boolean().default(false),
  slots: z.record(z.string(), z.string()).optional(),
})
export type ShowerValveNode = z.infer<typeof ShowerValveNode>
export const showerValvePresets = [
  {
    id: 'pressure-balance',
    label: 'Pressure-balancing',
    family: 'pressure-balance',
    outletCount: 2,
  },
  {
    id: 'pressure-balance-stops',
    label: 'With service stops',
    family: 'pressure-balance',
    outletCount: 2,
    serviceStops: true,
    width: 0.16,
  },
  {
    id: 'thermostatic',
    label: 'Thermostatic',
    family: 'thermostatic',
    bodyShape: 'rectangular',
    height: 0.22,
    outletCount: 2,
    serviceStops: true,
  },
  { id: 'transfer', label: 'Three-outlet transfer', family: 'transfer', outletCount: 3 },
  {
    id: 'stop',
    label: 'Stop valve',
    family: 'stop',
    outletCount: 1,
    width: 0.075,
    height: 0.075,
  },
  {
    id: 'universal',
    label: 'Installation box',
    family: 'universal',
    outletCount: 3,
    width: 0.16,
    height: 0.16,
    housingEnabled: true,
  },
] as const
export function valvePresetNode(p: (typeof showerValvePresets)[number]) {
  const { id, label, ...params } = p
  return ShowerValveNode.parse({ ...params, name: label })
}
