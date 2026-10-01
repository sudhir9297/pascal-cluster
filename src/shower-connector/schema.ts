import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
export const SHOWER_CONNECTOR = 'bath-space:shower-connector'
export const ShowerConnectorNode = BaseNode.extend({
  id: objectId('bath-space-shower-connector'),
  type: nodeType(SHOWER_CONNECTOR),
  children: z.array(z.string()).default([]),
  position: z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .default([0, 0, 0]),
  rotation: z.number().finite().default(0),
  slotId: z.string().default('shower-head'),
  outletType: z.enum(['head','hose']).default('head'),
  style: z
    .enum(['coupling', 'extension', 'elbow', 'swivel', 'articulated', 'reducer'])
    .default('coupling'),
  length: z.number().finite().min(0.025).max(0.5).default(0.05),
  diameter: z.number().finite().min(0.025).max(0.06).default(0.032),
  inletDiameter: z.number().finite().min(0.018).max(0.035).default(0.021),
  outletDiameter: z.number().finite().min(0.018).max(0.035).default(0.021),
  collarLength: z.number().finite().min(0.005).max(0.025).default(0.012),
  angle: z.number().finite().min(-90).max(90).default(45),
  azimuth: z.number().finite().min(-180).max(180).default(0),
  threadFamily: z.enum(['generic', 'G', 'IPS']).default('generic'),
  inletNominal: z.enum(['1/2', '3/4']).default('1/2'),
  outletNominal: z.enum(['1/2', '3/4']).default('1/2'),
  slots: z.record(z.string(), z.string()).optional(),
})
export type ShowerConnectorNode = z.infer<typeof ShowerConnectorNode>
export const showerConnectorPresets = [
  { id:'hose-coupling',label:'Hose outlet coupling',style:'coupling',outletType:'hose' },
  { id:'hose-elbow',label:'Angled hose adapter',style:'elbow',angle:45,outletType:'hose' },
  { id: 'coupling', label: 'Short shower coupling', style: 'coupling' },
  { id: 'extension', label: 'Straight outlet extension', style: 'extension', length: 0.12 },
  { id: 'elbow-45', label: '45 degree outlet adapter', style: 'elbow', angle: 45 },
  { id: 'elbow-90', label: '90 degree outlet adapter', style: 'elbow', angle: 90 },
  { id: 'swivel', label: 'Ball swivel adapter', style: 'swivel' },
  { id: 'articulated', label: 'Articulated shower extension', style: 'articulated', length: 0.25 },
  {
    id: 'reducer',
    label: 'Reducing shower adapter',
    style: 'reducer',
    inletDiameter: 0.027,
    inletNominal: '3/4',
  },
] as const
export function connectorPresetNode(p: (typeof showerConnectorPresets)[number]) {
  const { id, label, ...params } = p
  return ShowerConnectorNode.parse({ ...params, name: label })
}
