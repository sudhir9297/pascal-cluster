import type { ParametricDescriptor } from '@pascal-app/core'
import type { CatalogLampNode } from './catalog-lamp-config'

export const catalogLampParametrics: ParametricDescriptor<CatalogLampNode> = {
  groups: [
    {
      label: 'Lamp form',
      fields: [
        {
          key: 'height',
          kind: 'number',
          unit: 'm',
          min: 0.5,
          max: 30,
          step: 0.1,
          visibleIf: (node) =>
            node.type !== 'streetscape:tunnel-luminaire'
              && node.type !== 'streetscape:canopy-soffit-light'
              && node.visualStyle !== 'wall-pack',
        },
        { key: 'armLength', kind: 'number', unit: 'm', min: 0.15, max: 12, step: 0.1 },
        { key: 'poleColor', kind: 'color' },
      ],
    },
    {
      label: 'Lamp',
      fields: [
        { key: 'lightOn', kind: 'boolean' },
        { key: 'lightColor', kind: 'color', visibleIf: (n) => n.lightOn },
        { key: 'intensity', kind: 'number', min: 0, max: 12000, step: 100, visibleIf: (n) => n.lightOn },
      ],
    },
    {
      label: 'Position',
      fields: [{ key: 'position', kind: 'vec3' }],
    },
  ],
}
