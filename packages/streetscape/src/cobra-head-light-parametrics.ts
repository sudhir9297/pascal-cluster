import type { ParametricDescriptor } from '@pascal-app/core'
import type { CobraHeadLightNode } from './schema'

export const cobraHeadLightParametrics: ParametricDescriptor<CobraHeadLightNode> = {
  groups: [
    {
      label: 'Cobra-head roadway light',
      fields: [
        { key: 'height', kind: 'number', unit: 'm', min: 0.5, max: 30, step: 0.1 },
        { key: 'armLength', kind: 'number', unit: 'm', min: 0.5, max: 3, step: 0.1 },
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
          max: 5000,
          step: 100,
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
