import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'

import { pergolaDefinition } from './pergola/definition'
import { pathwayDefinition } from './pathways/definition'
import { groundAreaDefinition } from './ground-areas/definition'

type PluginHostPanel = {
  id: string
  label: string
  icon: { kind: 'url'; src: string }
  component: () => Promise<{ default: React.ComponentType }>
  pluginId: string
  description: string
  creator: { name: string; url?: string }
  pluginUrl: string
  defaultInstalled: boolean
}

const LANDSCAPE_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#78a86b" d="M2 19 8.5 8l3.3 5.1 2.5-3.6L22 19z"/><path fill="#a8c98d" d="m2 19 6.5-7 3.3 3.5 2.5-2.2L22 19z"/></svg>',
  )

/** Public plugin manifest. Landscape tools and node kinds can be added here. */
export const landscapePlugin: Plugin = {
  id: 'pascal:landscape',
  apiVersion: 1,
  nodes: [
    pergolaDefinition as unknown as AnyNodeDefinition,
    pathwayDefinition as unknown as AnyNodeDefinition,
    groundAreaDefinition as unknown as AnyNodeDefinition,
  ],
}

/** Editor panel entry point for the landscape plugin. */
export const landscapeHostPanel: PluginHostPanel = {
  id: 'pascal:landscape:landscape',
  label: 'Landscape',
  icon: { kind: 'url', src: LANDSCAPE_ICON },
  component: () => import('./landscape-panel'),
  pluginId: landscapePlugin.id,
  description: 'Tools for designing landscape scenes.',
  creator: { name: 'Sudhir Yadav', url: 'https://github.com/sudhir9297' },
  pluginUrl: 'https://github.com/sudhir9297/landscape-pascal-plugin',
  defaultInstalled: true,
}

export { PergolaNode } from './pergola/domain/schema'
export { pergolaDefinition } from './pergola/definition'
export { PathwayNode } from './pathways/domain/schema'
export { pathwayDefinition } from './pathways/definition'
export { GroundAreaNode, GROUND_AREA_KIND } from './ground-areas/domain/schema'
export { groundAreaDefinition } from './ground-areas/definition'
