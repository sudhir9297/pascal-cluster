import type { ResidentialRoadAssetKind, StreetInfrastructureKind } from './street-infrastructure-config'

export type RoadAutoInfrastructureKind = Exclude<StreetInfrastructureKind, ResidentialRoadAssetKind>

export type RoadAutoInfrastructureSettings = {
  enabled: boolean
  items: Record<RoadAutoInfrastructureKind, boolean>
}

export const DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS: RoadAutoInfrastructureSettings = {
  enabled: false,
  items: {
    'environment:traffic-signal': false,
    'environment:drainage-inlet': false,
    'environment:manhole-cover': false,
    'environment:fire-hydrant': false,
    'environment:traffic-bollard': false,
    'environment:road-barrier': false,
  },
}

export const ROAD_AUTO_INFRASTRUCTURE_OPTIONS: ReadonlyArray<{
  kind: RoadAutoInfrastructureKind
  label: string
}> = [
  { kind: 'environment:traffic-signal', label: 'Traffic signals' },
  { kind: 'environment:drainage-inlet', label: 'Drainage grates' },
  { kind: 'environment:manhole-cover', label: 'Manhole covers' },
  { kind: 'environment:fire-hydrant', label: 'Fire hydrants' },
  { kind: 'environment:traffic-bollard', label: 'Traffic bollards' },
  { kind: 'environment:road-barrier', label: 'Road barriers' },
]
