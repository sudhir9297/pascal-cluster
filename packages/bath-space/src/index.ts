import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { freestandingVanityDefinition } from './freestanding-vanity/definition'
import { wallMountedVanityDefinition } from './freestanding-vanity/wall-mounted-definition'
import { cornerVanityDefinition } from './freestanding-vanity/corner-definition'

type BathSpaceHostPanel = {
  id: string
  pluginId: string
  label: string
  description: string
  creator: { name: string; url?: string }
  pluginUrl: string
  icon: { kind: 'iconify'; name: string }
  component: () => Promise<{ default: React.ComponentType }>
  defaultInstalled: boolean
}

export const bathSpacePlugin: Plugin = {
  id: 'pascal:bath-space',
  apiVersion: 1,
  nodes: [freestandingVanityDefinition as unknown as AnyNodeDefinition, wallMountedVanityDefinition as unknown as AnyNodeDefinition, cornerVanityDefinition as unknown as AnyNodeDefinition],
}

export const bathSpaceHostPanel: BathSpaceHostPanel = {
  id: 'pascal:bath-space:catalog',
  pluginId: bathSpacePlugin.id,
  label: 'Bath Space',
  description: 'Procedural bathroom fixtures and furniture.',
  creator: { name: 'Pascal' },
  pluginUrl: 'https://editor.pascal.app/docs/developers/plugins',
  icon: { kind: 'iconify', name: 'lucide:bath' },
  component: () => import('./panel'),
  defaultInstalled: true,
}

export { freestandingVanityDefinition } from './freestanding-vanity/definition'
export { wallMountedVanityDefinition } from './freestanding-vanity/wall-mounted-definition'
export { cornerVanityDefinition } from './freestanding-vanity/corner-definition'
export { FreestandingVanityNode, WallMountedVanityNode, CornerVanityNode, VanityNode, VanityParameters } from './freestanding-vanity/schema'
export { buildFreestandingVanityGeometry, vanityGeometryKey } from './freestanding-vanity/geometry'
export { vanityPresets } from './freestanding-vanity/presets'
