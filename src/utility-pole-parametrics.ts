import type { ParametricDescriptor } from '@pascal-app/core'
import type { UtilityPoleNode } from './schema'
import { STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M } from './utility-pole-geometry'

export const utilityPoleParametrics: ParametricDescriptor<UtilityPoleNode> = {
  groups: [
    {
      label: 'Utility pole',
      fields: [
        { key: 'height', kind: 'number', unit: 'm', min: 7.62, max: 15.85, step: 0.01 },
        {
          key: 'crossarmLength',
          kind: 'number',
          unit: 'm',
          min: STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
          max: 3.66,
          step: 0.01,
        },
        {
          key: 'assembly',
          kind: 'enum',
          options: ['tangent', 'small-angle', 'junction', 'dead-end'],
          display: 'segmented',
        },
        { key: 'woodColor', kind: 'color' },
      ],
    },
    {
      label: 'Equipment',
      fields: [
        { key: 'transformerMounted', kind: 'boolean' },
        {
          key: 'transformerColor',
          kind: 'color',
          visibleIf: (node) => node.transformerMounted,
        },
      ],
    },
    {
      label: 'Position',
      fields: [{ key: 'position', kind: 'vec3' }],
    },
  ],
}
