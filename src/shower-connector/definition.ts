import type { NodeDefinition } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { SHOWER_CONNECTOR, ShowerConnectorNode } from './schema'
import { buildShowerConnectorGeometry } from './geometry'
export const showerConnectorDefinition: NodeDefinition<typeof ShowerConnectorNode> = {
  kind: SHOWER_CONNECTOR,
  schemaVersion: 1,
  schema: ShowerConnectorNode,
  category: 'furnish',
  defaults: () => {
    const { id, type, ...rest } = ShowerConnectorNode.parse({ name: 'Shower connector' })
    return rest
  },
  geometry: buildShowerConnectorGeometry,
  system: { module: () => import('./system'), priority: 2 },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    paint: createSlotPaint(
      (s): s is 'body' | 'collars' | 'joint' => ['body', 'collars', 'joint'].includes(String(s)),
      0.25,
    ),
    slots: () =>
      ['body', 'collars', 'joint'].map((slotId) => ({ slotId, label: slotId, default: '#ffffff' })),
  },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  presentation: {
    label: 'Shower connector',
    description: 'Couplings, swivels and extensions for overhead outlets.',
    icon: { kind: 'iconify', name: 'lucide:plug' },
  },
  toolHints: [
    { key: 'Left click', label: 'Insert or replace adapter on overhead outlet' },
    { key: 'Esc', label: 'Cancel' },
  ],
}
