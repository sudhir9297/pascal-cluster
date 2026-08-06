import type { ParametricDescriptor } from '@pascal-app/core'
import type { StreetInfrastructureNode } from './street-infrastructure-config'

const trafficSignalParametrics: ParametricDescriptor<any> = {
  groups: [
    {
      label: 'Signal',
      fields: [
        {
          key: 'mount',
          kind: 'enum',
          options: ['post', 'mast-arm', 'span-wire'],
          display: 'segmented',
        },
        {
          key: 'headLayout',
          kind: 'enum',
          options: [
            'three-section',
            'three-section-turn',
            'four-section-turn',
            'five-section-cluster',
          ],
          display: 'select',
        },
        {
          key: 'signalState',
          kind: 'enum',
          options: ['dark', 'red', 'yellow', 'flashing-yellow', 'green', 'green-arrow'],
          display: 'select',
        },
        {
          key: 'headCount',
          kind: 'enum',
          options: ['one', 'two'],
          display: 'segmented',
          visibleIf: (node: any) => node.mount !== 'post',
        },
        {
          key: 'visorStyle',
          kind: 'enum',
          options: ['cap', 'tunnel', 'none'],
          display: 'segmented',
        },
        { key: 'backplate', kind: 'boolean' },
        {
          key: 'reflectiveBorder',
          kind: 'boolean',
          visibleIf: (node: any) => node.backplate,
        },
        { key: 'cabinet', kind: 'boolean' },
        {
          key: 'streetNameSign',
          kind: 'boolean',
          visibleIf: (node: any) => node.mount === 'mast-arm',
        },
      ],
    },
    {
      label: 'Signal colors',
      fields: [
        { key: 'redColor', kind: 'color' },
        { key: 'yellowColor', kind: 'color' },
        { key: 'greenColor', kind: 'color' },
      ],
    },
    {
      label: 'Support',
      fields: [
        { key: 'supportHeight', kind: 'number', unit: 'm', min: 2.4, max: 8, step: 0.1 },
        {
          key: 'armReach',
          kind: 'number',
          unit: 'm',
          min: 1,
          max: 12,
          step: 0.1,
          visibleIf: (node: any) => node.mount === 'mast-arm',
        },
        { key: 'poleColor', kind: 'color' },
        { key: 'housingColor', kind: 'color' },
      ],
    },
    { label: 'Position', fields: [{ key: 'position', kind: 'vec3' }] },
  ],
}

const drainageInletParametrics: ParametricDescriptor<any> = {
  groups: [
    {
      label: 'Inlet',
      fields: [
        { key: 'inletType', kind: 'enum', options: ['grate', 'combination'], display: 'segmented' },
        {
          key: 'gratePattern',
          kind: 'enum',
          options: ['bicycle-safe', 'reticuline', 'parallel', 'curved-vane'],
          display: 'select',
        },
        { key: 'width', kind: 'number', unit: 'm', min: 0.3, max: 1.5, step: 0.05 },
        { key: 'length', kind: 'number', unit: 'm', min: 0.5, max: 2.5, step: 0.05 },
        {
          key: 'curbHeight',
          kind: 'number',
          unit: 'm',
          min: 0.08,
          max: 0.3,
          step: 0.01,
          visibleIf: (node: any) => node.inletType === 'combination',
        },
      ],
    },
    {
      label: 'Finish',
      fields: [
        { key: 'metalColor', kind: 'color' },
        { key: 'wetness', kind: 'number', min: 0, max: 1, step: 0.05 },
      ],
    },
    { label: 'Position', fields: [{ key: 'position', kind: 'vec3' }] },
  ],
}

const manholeCoverParametrics: ParametricDescriptor<any> = {
  groups: [
    {
      label: 'Cover',
      fields: [
        { key: 'diameter', kind: 'number', unit: 'm', min: 0.45, max: 1.2, step: 0.05 },
        { key: 'treadPattern', kind: 'enum', options: ['radial', 'grid', 'rings'], display: 'segmented' },
      ],
    },
    {
      label: 'Finish',
      fields: [
        { key: 'metalColor', kind: 'color' },
        { key: 'wetness', kind: 'number', min: 0, max: 1, step: 0.05 },
      ],
    },
    { label: 'Position', fields: [{ key: 'position', kind: 'vec3' }] },
  ],
}

const fireHydrantParametrics: ParametricDescriptor<any> = {
  groups: [
    {
      label: 'Hydrant',
      fields: [
        { key: 'height', kind: 'number', unit: 'm', min: 0.65, max: 1.5, step: 0.05 },
        {
          key: 'barrelType',
          kind: 'enum',
          options: ['dry-barrel', 'wet-barrel'],
          display: 'segmented',
        },
        {
          key: 'outletLayout',
          kind: 'enum',
          options: ['two-hose-one-pumper', 'two-hose', 'one-hose'],
          display: 'select',
        },
      ],
    },
    {
      label: 'Finish',
      fields: [
        { key: 'bodyColor', kind: 'color' },
        { key: 'bonnetColor', kind: 'color' },
        { key: 'capColor', kind: 'color' },
        { key: 'weathering', kind: 'number', min: 0, max: 1, step: 0.05 },
      ],
    },
    { label: 'Position', fields: [{ key: 'position', kind: 'vec3' }] },
  ],
}

export function getStreetInfrastructureParametrics(
  kind: string,
): ParametricDescriptor<StreetInfrastructureNode> {
  if (kind === 'environment:traffic-signal') return trafficSignalParametrics
  if (kind === 'environment:drainage-inlet') return drainageInletParametrics
  if (kind === 'environment:manhole-cover') return manholeCoverParametrics
  return fireHydrantParametrics
}
