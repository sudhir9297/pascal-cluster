import type { ResidentialRoadAssetKind, StreetInfrastructureKind } from './street-infrastructure-config'

export type RoadAutoInfrastructureKind = Exclude<StreetInfrastructureKind, ResidentialRoadAssetKind>

export type RoadAutoInfrastructureSettings = {
  enabled: boolean
  items: Record<RoadAutoInfrastructureKind, boolean>
}

export const DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS: RoadAutoInfrastructureSettings = {
  enabled: false,
  items: {
    'streetscape:traffic-signal': false,
    'streetscape:drainage-inlet': false,
    'streetscape:manhole-cover': false,
    'streetscape:fire-hydrant': false,
    'streetscape:traffic-bollard': false,
    'streetscape:road-barrier': false,
  },
}

export const FULL_ROAD_AUTO_INFRASTRUCTURE_SETTINGS: RoadAutoInfrastructureSettings = {
  enabled: true,
  items: {
    'streetscape:traffic-signal': true,
    'streetscape:drainage-inlet': true,
    'streetscape:manhole-cover': true,
    'streetscape:fire-hydrant': true,
    'streetscape:traffic-bollard': true,
    'streetscape:road-barrier': true,
  },
}

export const ROAD_AUTO_INFRASTRUCTURE_OPTIONS: ReadonlyArray<{
  kind: RoadAutoInfrastructureKind
  label: string
}> = [
  { kind: 'streetscape:traffic-signal', label: 'Traffic signals' },
  { kind: 'streetscape:drainage-inlet', label: 'Drainage grates' },
  { kind: 'streetscape:manhole-cover', label: 'Manhole covers' },
  { kind: 'streetscape:fire-hydrant', label: 'Fire hydrants' },
  { kind: 'streetscape:traffic-bollard', label: 'Traffic bollards' },
  { kind: 'streetscape:road-barrier', label: 'Road barriers' },
]
