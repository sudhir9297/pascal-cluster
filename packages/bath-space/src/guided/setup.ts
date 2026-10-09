import type { AnyNode } from '@pascal-app/core'
import { areaAnchors, areas, levelFixtures, type Area } from './bathroom-review'
import { bathingMetadataKey, readBathingArea } from './bathing-area'
import type { BathroomStage } from './workflow'

export function includedBathroomAreas(levelId: string, nodes: Readonly<Record<string, AnyNode>>): Area[] {
  const excluded = nodes[levelId]?.metadata?.bathSpaceExcludedAreas
  const fixtures = levelFixtures(levelId, nodes)
  return areas.filter((area) => !Array.isArray(excluded) || !excluded.includes(area.id) || areaAnchors(area.id, fixtures).length > 0).map((area) => area.id)
}

export function adjacentBathroomStage(current: Area, direction: 'next' | 'back', included: Area[]): BathroomStage {
  const index = areas.findIndex((area) => area.id === current)
  const candidates = direction === 'next' ? areas.slice(index + 1) : areas.slice(0, index).reverse()
  return candidates.find((area) => included.includes(area.id))?.id ?? (direction === 'next' ? 'accessories' : current)
}

export function bathroomSetupPatch(levelId: string, nodes: Readonly<Record<string, AnyNode>>, selected: Area[], kind: 'shower' | 'bath' | 'both') {
  const fixtures = levelFixtures(levelId, nodes)
  const included = areas.filter((area) => selected.includes(area.id) || areaAnchors(area.id, fixtures).length > 0).map((area) => area.id)
  const flow = readBathingArea(nodes[levelId]?.metadata?.[bathingMetadataKey])
  return {
    bathSpaceSetupComplete: true,
    bathSpaceReviewed: false,
    bathSpaceExcludedAreas: areas.filter((area) => !included.includes(area.id)).map((area) => area.id),
    bathSpaceLayoutComplete: false,
    bathSpaceStage: included.length ? 'layout' : 'review',
    ...(!areaAnchors('bathing', fixtures).length && included.includes('bathing') ? { [bathingMetadataKey]: { ...flow, kind, step: kind === 'shower' ? 'shower' : 'bath' } } : !flow.kind && included.includes('bathing') ? { [bathingMetadataKey]: { ...flow, kind } } : {}),
  }
}
