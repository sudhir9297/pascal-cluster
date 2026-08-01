import type { ParametricDescriptor } from '@pascal-app/core'
import type { RoadSplineNode } from './schema'

export const roadSplineParametrics: ParametricDescriptor<RoadSplineNode> = {
  groups: [
    {
      label: 'Road',
      fields: [
        {
          key: 'pathMode',
          kind: 'enum',
          options: ['spline', 'orthogonal'],
          display: 'segmented',
        },
        { key: 'width', kind: 'number', unit: 'm', min: 1, max: 40, step: 0.25 },
        { key: 'laneCount', kind: 'number', min: 1, max: 6, step: 1 },
        {
          key: 'centerLineStyle',
          kind: 'enum',
          options: ['none', 'single', 'double', 'dashed'],
          display: 'segmented',
        },
        { key: 'edgeLines', kind: 'boolean' },
        { key: 'thickness', kind: 'number', unit: 'm', min: 0.03, max: 0.5, step: 0.01 },
        { key: 'surfaceColor', kind: 'color' },
        { key: 'centerLineColor', kind: 'color' },
        { key: 'laneLineColor', kind: 'color' },
        { key: 'textureScale', kind: 'number', unit: 'm', min: 0.5, max: 20, step: 0.25 },
      ],
    },
    {
      label: 'Position',
      fields: [{ key: 'position', kind: 'vec3' }],
    },
  ],
}
