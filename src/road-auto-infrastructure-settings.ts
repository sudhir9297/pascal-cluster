import type { StreetInfrastructureKind } from './street-infrastructure-config'

export type RoadAutoInfrastructureSettings = {
  enabled: boolean
  items: Record<StreetInfrastructureKind, boolean>
}

export const DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS: RoadAutoInfrastructureSettings = {
  enabled: true,
  items: {
    'environment:traffic-signal': true,
    'environment:drainage-inlet': true,
    'environment:manhole-cover': true,
    'environment:fire-hydrant': true,
    'environment:traffic-bollard': true,
    'environment:road-barrier': true,
  },
}

export const ROAD_AUTO_INFRASTRUCTURE_OPTIONS: ReadonlyArray<{
  kind: StreetInfrastructureKind
  label: string
}> = [
  { kind: 'environment:traffic-signal', label: 'Traffic signals' },
  { kind: 'environment:drainage-inlet', label: 'Drainage grates' },
  { kind: 'environment:manhole-cover', label: 'Manhole covers' },
  { kind: 'environment:fire-hydrant', label: 'Fire hydrants' },
  { kind: 'environment:traffic-bollard', label: 'Traffic bollards' },
  { kind: 'environment:road-barrier', label: 'Road barriers' },
]
