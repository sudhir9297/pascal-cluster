import type { ParametricDescriptor } from '@pascal-app/core'
import type { RoadNetworkNode } from './schema'
import { ROAD_STYLE_PRESET_IDS } from './road-style-presets'

export const roadNetworkParametrics: ParametricDescriptor<RoadNetworkNode> = {
  groups: [
    {
      label: 'Network',
      fields: [
        { key: 'activeStyleId', kind: 'enum', options: ROAD_STYLE_PRESET_IDS, display: 'select' },
        { key: 'applyStyleToAll', kind: 'boolean' },
        { key: 'snapTolerance', kind: 'number', unit: 'm', min: 0.05, max: 5, step: 0.05 },
      ],
    },
  ],
}
