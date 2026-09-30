import type { VanityParameters } from './schema'

export const vanityPresets = [
  {
    id: 'modern', label: 'Modern', description: 'Flat fronts · edge pulls · metal legs',
    settings: { storageLayout: 'drawers', drawerRows: 2, drawerColumns: 1, drawerType: 'standard', frontStyle: 'flat', frontMount: 'overlay', handleStyle: 'edge', baseStyle: 'metal', legHeight: 0.14, lowerShelf: false, countertopEnabled: true, backsplashHeight: 0 },
  },
  {
    id: 'shaker', label: 'Shaker', description: 'Framed fronts · bar pulls · tapered legs',
    settings: { storageLayout: 'drawers', drawerRows: 2, drawerColumns: 1, drawerType: 'shallow-top', frontStyle: 'shaker', frontMount: 'overlay', handleStyle: 'bar', baseStyle: 'tapered', legHeight: 0.16, lowerShelf: false, countertopEnabled: true, backsplashHeight: 0 },
  },
  {
    id: 'fluted', label: 'Fluted', description: 'Reeded fronts · knobs · recessed base',
    settings: { storageLayout: 'doors', doorCount: 2, frontStyle: 'fluted', frontMount: 'overlay', handleStyle: 'knob', baseStyle: 'plinth', legHeight: 0.09, lowerShelf: false, countertopEnabled: true, backsplashHeight: 0 },
  },
  {
    id: 'console', label: 'Open console', description: 'Shallow drawer · open shelf · square legs',
    settings: { storageLayout: 'console', drawerRows: 1, drawerColumns: 1, drawerType: 'standard', frontStyle: 'flat', frontMount: 'inset', handleStyle: 'bar', baseStyle: 'square', legHeight: 0.12, lowerShelf: false, countertopEnabled: true, backsplashHeight: 0 },
  },
] satisfies { id: string; label: string; description: string; settings: Partial<VanityParameters> }[]

export type VanityPresetId = (typeof vanityPresets)[number]['id']

export function vanityPreset(id: string) {
  return vanityPresets.find((preset) => preset.id === id) ?? vanityPresets[1]!
}
