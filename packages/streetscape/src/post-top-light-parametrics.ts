import type { ParametricDescriptor } from '@pascal-app/core'
import type { PedestrianPostLightNode } from './schema'

export const postTopLightParametrics: ParametricDescriptor<PedestrianPostLightNode> = {
  groups: [
    {
      label: 'Pedestrian post-top',
      fields: [
        { key: 'height', kind: 'number', unit: 'm', min: 0.5, max: 30, step: 0.1 },
        { key: 'poleColor', kind: 'color' },
      ],
    },
    {
      label: 'Lamp',
      fields: [
        { key: 'lightOn', kind: 'boolean' },
        { key: 'lightColor', kind: 'color', visibleIf: (n) => n.lightOn },
        {
          key: 'intensity',
          kind: 'number',
          min: 0,
          max: 3000,
          step: 50,
          visibleIf: (n) => n.lightOn,
        },
      ],
    },
    {
      label: 'Position',
      fields: [{ key: 'position', kind: 'vec3' }],
    },
  ],
}
