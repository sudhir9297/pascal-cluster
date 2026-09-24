import type { ParametricDescriptor } from '@pascal-app/core'
import type { HeritageCrookLightNode } from './schema'

export const heritageCrookLightParametrics: ParametricDescriptor<HeritageCrookLightNode> = {
  groups: [
    {
      label: "Bishop's Crook",
      fields: [
        { key: 'height', kind: 'number', unit: 'm', min: 0.5, max: 30, step: 0.1 },
        { key: 'armReach', kind: 'number', unit: 'm', min: 0.5, max: 1.5, step: 0.05 },
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
          max: 3500,
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
