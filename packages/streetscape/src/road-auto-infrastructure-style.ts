import type { RoadStylePreset } from './schema'
import type { RoadAutoInfrastructureSettings } from './road-auto-infrastructure-settings'
import {
  resolveRoadSideComponents,
  withRoadSideComponents,
  type RoadSideComponentConfigs,
} from './road-cross-section'

export const AUTO_DRAINAGE_MIN_GUTTER_WIDTH = 0.8
export const AUTO_HYDRANT_MIN_VERGE_WIDTH = 1.2

export function applyRoadAutoInfrastructureClearances(
  style: RoadStylePreset,
  settings: RoadAutoInfrastructureSettings,
): RoadStylePreset {
  if (!settings.enabled) return style
  let changed = false
  const sides = Object.fromEntries((['left', 'right'] as const).map((side) => {
    const components = resolveRoadSideComponents(style, side)
    if (components.curbWidth <= 0) return [side, components]
    const next = {
      ...components,
      gutterWidth: settings.items['streetscape:drainage-inlet']
        ? Math.max(components.gutterWidth, AUTO_DRAINAGE_MIN_GUTTER_WIDTH)
        : components.gutterWidth,
      vergeWidth: settings.items['streetscape:fire-hydrant']
        ? Math.max(components.vergeWidth, AUTO_HYDRANT_MIN_VERGE_WIDTH)
        : components.vergeWidth,
    }
    changed ||= next.gutterWidth !== components.gutterWidth
      || next.vergeWidth !== components.vergeWidth
    return [side, next]
  })) as RoadSideComponentConfigs
  return changed ? withRoadSideComponents(style, sides) : style
}
