import { osmSurfaceMaterial, ROAD_SURFACE_MATERIALS } from './road-surface-material'
import type { RoadSideComponents, RoadStylePreset } from './schema'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'

type Tags = Record<string, string>

/** Keep OSM's exact tag name without making `key:value` look like a URL to the scene validator. */
function sceneTagName(tag: string | undefined): string | undefined {
  return tag?.replaceAll(':', '%3A')
}

/** OSM lengths are metres unless explicitly suffixed. Reject ambiguous lists. */
function length(value: string | undefined): number | undefined {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*(m|ft|')?$/)
  if (!match) return undefined
  const meters = Number(match[1]) * (match[2] === 'ft' || match[2] === "'" ? 0.3048 : 1)
  return meters > 0 && Number.isFinite(meters) ? meters : undefined
}
function lanes(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined
  const count = Number(value)
  return count >= 1 && count <= 12 ? count : undefined
}
function lengthList(value: string | undefined): number[] | undefined {
  if (!value) return undefined
  const values = value.split('|').map((entry) => length(entry))
  return values.every((entry): entry is number => entry !== undefined) ? values : undefined
}
function laneUseList(
  tags: Tags,
  laneCount: number,
  forward?: number,
  backward?: number,
  bothWays = 0,
): Array<'general' | 'bus' | 'bicycle' | 'parking' | 'turning'> {
  const directionalValues = (key: string): string[] | undefined => {
    const all = tags[`${key}:lanes`]?.split('|')
    if (all?.length === laneCount) return all
    if (forward === undefined || backward === undefined) return undefined
    const forwardValues = tags[`${key}:lanes:forward`]?.split('|')
    const backwardValues = tags[`${key}:lanes:backward`]?.split('|')
    const bothValues = tags[`${key}:lanes:both_ways`]?.split('|') ?? []
    if (forwardValues?.length !== forward || backwardValues?.length !== backward || bothValues.length !== bothWays) return undefined
    return [...backwardValues].reverse().concat(bothValues, forwardValues)
  }
  const bus = directionalValues('bus')
  const bicycle = directionalValues('bicycle')
  return Array.from({ length: laneCount }, (_, index) => {
    if (bus?.[index] === 'designated' || bus?.[index] === 'yes') return 'bus'
    if (bicycle?.[index] === 'designated' || bicycle?.[index] === 'yes') return 'bicycle'
    return 'general'
  })
}
function sideValue(tags: Tags, key: string, side: string): string | undefined {
  return tags[`${key}:${side}`] ?? tags[`${key}:both`] ?? tags[key]
}
function sideWidth(tags: Tags, key: string, side: string, fallback: number, max: number): number {
  return Math.min(
    max,
    length(tags[`${key}:${side}:width`] ?? tags[`${key}:both:width`] ?? tags[`${key}:width`]) ??
      fallback,
  )
}
function sideDimensionTag(tags: Tags, key: string, side: 'left' | 'right'): string | undefined {
  for (const candidate of [`${key}:${side}:width`, `${key}:both:width`, `${key}:width`]) {
    if (length(tags[candidate]) !== undefined) return candidate
  }
  if (sideValue(tags, key, side) !== 'separate') return undefined
  for (const candidate of [`${key}:${side}`, `${key}:both`, key]) {
    if (tags[candidate] !== undefined) return candidate
  }
  return undefined
}

/** Build a section for one OSM way. Defaults are estimates, explicit tags win. */
export function buildOsmRoadStyle(tags: Tags, baseId: string, oneWay: boolean): RoadStylePreset {
  const base = DEFAULT_ROAD_STYLE_PRESETS[baseId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS]
  const highway = tags.highway ?? ''
  const fast = /^(motorway|trunk)/.test(highway)
  const service = highway === 'service'
  const link = highway.endsWith('_link')
  const side = (side: 'left' | 'right'): RoadSideComponents => {
    const sidewalk = sideValue(tags, 'sidewalk', side)
    const hasSidewalk =
      sidewalk === 'yes' ||
      sidewalk === 'both' ||
      sidewalk === side ||
      (sidewalk === undefined && !fast && !service && !link)
    const cycle = sideValue(tags, 'cycleway', side)
    const parking =
      tags[`parking:${side}`] ??
      tags['parking:both'] ??
      tags[`parking:lane:${side}`] ??
      tags['parking:lane:both']
    return {
      sidewalkWidth: hasSidewalk ? sideWidth(tags, 'sidewalk', side, 1.8, 6) : 0,
      curbWidth: hasSidewalk ? 0.15 : 0,
      gutterWidth: 0,
      vergeWidth: 0,
      busLaneWidth:
        sideValue(tags, 'busway', side) === 'lane' ||
        tags[`lanes:bus:${side}`] === 'designated' ||
        tags[`bus:lanes:${side}`]?.split('|').some((value) => value === 'designated')
          ? sideWidth(tags, 'busway', side, 3.2, 4)
          : 0,
      bikeLaneWidth:
        cycle === 'lane' || cycle === 'opposite_lane' || cycle === 'track'
          ? sideWidth(tags, 'cycleway', side, 1.5, 3)
          : 0,
      parkingLaneWidth: ['lane', 'parallel', 'diagonal', 'perpendicular'].includes(parking ?? '')
        ? sideWidth(tags, 'parking', side, 2.2, 4)
        : 0,
    }
  }
  const leftSide = side('left')
  const rightSide = side('right')
  const forward = lanes(tags['lanes:forward'])
  const backward = lanes(tags['lanes:backward'])
  const directional =
    forward && backward ? forward + backward + (lanes(tags['lanes:both_ways']) ?? 0) : undefined
  const laneCount =
    lanes(tags.lanes) ??
    (directional && directional <= 12 ? directional : undefined) ??
    (oneWay ? (forward ?? backward) : undefined) ??
    (link || service ? 1 : 2)
  const roadsidePavement =
    leftSide.parkingLaneWidth +
    rightSide.parkingLaneWidth +
    (leftSide.busLaneWidth ?? 0) +
    (rightSide.busLaneWidth ?? 0) +
    leftSide.bikeLaneWidth +
    rightSide.bikeLaneWidth
  const mappedWidth = length(tags.width) ?? length(tags['est_width'])
  const perLane = mappedWidth ? (mappedWidth - roadsidePavement) / laneCount : undefined
  // Do not coerce contradictory or out-of-range dimensions into invalid editor styles.
  const laneWidth = perLane && perLane >= 2.4 && perLane <= 5 ? perLane : fast ? 3.65 : 3.2
  const directLaneWidths = lengthList(tags['width:lanes'])
  const forwardWidths = lengthList(tags['width:lanes:forward'])
  const backwardWidths = lengthList(tags['width:lanes:backward'])
  const bothWaysWidths = lengthList(tags['width:lanes:both_ways'])
  const directionalLaneWidths =
    forward && backward && forwardWidths?.length === forward && backwardWidths?.length === backward
      ? [...backwardWidths].reverse().concat(bothWaysWidths ?? [], forwardWidths)
      : undefined
  const candidateLaneWidths = directLaneWidths?.length === laneCount
    ? directLaneWidths
    : directionalLaneWidths?.length === laneCount
      ? directionalLaneWidths
      : undefined
  const laneWidths = candidateLaneWidths?.every((width) => width >= 2.4 && width <= 5)
    ? candidateLaneWidths
    : Array.from({ length: laneCount }, () => laneWidth)
  const laneDirections = forward && backward
    ? [
        ...Array.from({ length: backward }, () => 'backward' as const),
        ...Array.from({ length: lanes(tags['lanes:both_ways']) ?? 0 }, () => 'both' as const),
        ...Array.from({ length: forward }, () => 'forward' as const),
      ]
    : Array.from({ length: laneCount }, () => oneWay ? 'forward' as const : 'both' as const)
  const laneCountTag = tags.lanes !== undefined
    ? 'lanes'
    : directional !== undefined
      ? 'lanes:forward|lanes:backward|lanes:both_ways'
      : undefined
  const laneWidthTag = candidateLaneWidths
    ? directLaneWidths?.length === laneCount
      ? 'width:lanes'
      : 'width:lanes:forward|width:lanes:backward'
    : mappedWidth
      ? tags.width !== undefined ? 'width' : 'est_width'
      : undefined
  const surfaceMaterial = osmSurfaceMaterial(tags.surface)
  const leftSidewalkTag = sideDimensionTag(tags, 'sidewalk', 'left')
  const rightSidewalkTag = sideDimensionTag(tags, 'sidewalk', 'right')
  return {
    ...base,
    surfaceMaterial,
    surfaceColor: surfaceMaterial
      ? ROAD_SURFACE_MATERIALS[surfaceMaterial].color
      : base.surfaceColor,
    surfaceSource: { kind: surfaceMaterial ? 'mapped' : 'default', tag: tags.surface },
    id: baseId,
    name: (tags.name || `${highway.replaceAll('_', ' ')} street`).slice(0, 64),
    laneCount,
    laneWidth,
    laneWidths,
    laneDirections,
    laneUses: laneUseList(tags, laneCount, forward, backward, lanes(tags['lanes:both_ways']) ?? 0),
    dimensionSources: {
      laneCount: { kind: laneCountTag ? 'mapped' : 'default', ...(laneCountTag ? { tag: sceneTagName(laneCountTag) } : {}) },
      laneWidth: { kind: candidateLaneWidths || tags.width ? 'mapped' : tags.est_width ? 'derived' : 'default', ...(laneWidthTag ? { tag: sceneTagName(laneWidthTag) } : {}) },
      totalWidth: { kind: tags.width ? 'mapped' : tags.est_width ? 'derived' : 'default', ...(tags.width ? { tag: 'width' } : tags.est_width ? { tag: 'est_width' } : {}) },
      leftSidewalk: { kind: leftSidewalkTag ? 'mapped' : 'default', ...(leftSidewalkTag ? { tag: sceneTagName(leftSidewalkTag) } : {}) },
      rightSidewalk: { kind: rightSidewalkTag ? 'mapped' : 'default', ...(rightSidewalkTag ? { tag: sceneTagName(rightSidewalkTag) } : {}) },
    },
    shoulderWidth: 0,
    medianWidth: 0,
    sidewalkWidth: Math.max(leftSide.sidewalkWidth, rightSide.sidewalkWidth),
    leftSide,
    rightSide,
    markings: tags.lane_markings !== 'no' && !service && highway !== 'living_street',
  }
}
