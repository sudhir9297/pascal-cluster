import {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
  TrafficBollardNode,
  RoadBarrierNode,
  DrivewayNode,
  MailboxNode,
  ParcelBoxNode,
  TrashBinNode,
  RecyclingBinNode,
  ResidentialGateNode,
  SpeedHumpNode,
  type DrainageInletNode as DrainageInletNodeType,
  type FireHydrantNode as FireHydrantNodeType,
  type ManholeCoverNode as ManholeCoverNodeType,
  type TrafficSignalNode as TrafficSignalNodeType,
  type TrafficBollardNode as TrafficBollardNodeType,
  type RoadBarrierNode as RoadBarrierNodeType,
  type DrivewayNode as DrivewayNodeType,
  type MailboxNode as MailboxNodeType,
  type ParcelBoxNode as ParcelBoxNodeType,
  type TrashBinNode as TrashBinNodeType,
  type RecyclingBinNode as RecyclingBinNodeType,
  type ResidentialGateNode as ResidentialGateNodeType,
  type SpeedHumpNode as SpeedHumpNodeType,
} from './schema'

export const STREET_INFRASTRUCTURE_KINDS = [
  'streetscape:traffic-signal',
  'streetscape:drainage-inlet',
  'streetscape:manhole-cover',
  'streetscape:fire-hydrant',
  'streetscape:traffic-bollard',
  'streetscape:road-barrier',
  'streetscape:driveway',
  'streetscape:mailbox',
  'streetscape:parcel-box',
  'streetscape:trash-bin',
  'streetscape:recycling-bin',
  'streetscape:residential-gate',
  'streetscape:speed-hump',
] as const

export type StreetInfrastructureKind = (typeof STREET_INFRASTRUCTURE_KINDS)[number]
export const RESIDENTIAL_ROAD_ASSET_KINDS = [
  'streetscape:driveway',
  'streetscape:mailbox',
  'streetscape:parcel-box',
  'streetscape:trash-bin',
  'streetscape:recycling-bin',
  'streetscape:residential-gate',
  'streetscape:speed-hump',
] as const
export type ResidentialRoadAssetKind = (typeof RESIDENTIAL_ROAD_ASSET_KINDS)[number]
export type StreetInfrastructureNode =
  | TrafficSignalNodeType
  | DrainageInletNodeType
  | ManholeCoverNodeType
  | FireHydrantNodeType
  | TrafficBollardNodeType
  | RoadBarrierNodeType
  | DrivewayNodeType
  | MailboxNodeType
  | ParcelBoxNodeType
  | TrashBinNodeType
  | RecyclingBinNodeType
  | ResidentialGateNodeType
  | SpeedHumpNodeType

export type StreetInfrastructureVariant = {
  kind: StreetInfrastructureKind
  label: string
  description: string
  family: 'Traffic control' | 'Drainage' | 'Fire safety' | 'Traffic safety' | 'Residential frontage' | 'Traffic calming'
  icon: string
  schema:
    | typeof TrafficSignalNode
    | typeof DrainageInletNode
    | typeof ManholeCoverNode
    | typeof FireHydrantNode
    | typeof TrafficBollardNode
    | typeof RoadBarrierNode
    | typeof DrivewayNode
    | typeof MailboxNode
    | typeof ParcelBoxNode
    | typeof TrashBinNode
    | typeof RecyclingBinNode
    | typeof ResidentialGateNode
    | typeof SpeedHumpNode
}

export const STREET_INFRASTRUCTURE_VARIANTS: readonly StreetInfrastructureVariant[] = [
  {
    kind: 'streetscape:traffic-signal',
    label: 'Traffic signal',
    description: 'A field-detailed modular vehicle signal with multiple head layouts and mounting systems.',
    family: 'Traffic control',
    icon: 'lucide:traffic-cone',
    schema: TrafficSignalNode,
  },
  {
    kind: 'streetscape:drainage-inlet',
    label: 'Drainage grate',
    description: 'A framed road, curb, or sweeper inlet with bicycle-safe and decorative grate patterns.',
    family: 'Drainage',
    icon: 'lucide:rows-3',
    schema: DrainageInletNode,
  },
  {
    kind: 'streetscape:manhole-cover',
    label: 'Manhole cover',
    description: 'A flush cast-metal access cover with configurable utility markings.',
    family: 'Drainage',
    icon: 'lucide:circle-dot',
    schema: ManholeCoverNode,
  },
  {
    kind: 'streetscape:fire-hydrant',
    label: 'Fire hydrant',
      description: 'A tall, proportioned dry- or wet-barrel hydrant with configurable outlet silhouettes.',
    family: 'Fire safety',
    icon: 'lucide:fire-extinguisher',
    schema: FireHydrantNode,
  },
  {
    kind: 'streetscape:traffic-bollard',
    label: 'Traffic bollard',
    description: 'A standalone reflective, steel, or flexible bollard for protected corners and road edges.',
    family: 'Traffic safety',
    icon: 'lucide:barrier',
    schema: TrafficBollardNode,
  },
  {
    kind: 'streetscape:road-barrier',
    label: 'Road barrier',
    description: 'A standalone jersey, guardrail, water-filled, or crowd-control barrier segment.',
    family: 'Traffic safety',
    icon: 'lucide:construction',
    schema: RoadBarrierNode,
  },
  {
    kind: 'streetscape:driveway',
    label: 'Driveway',
    description: 'A paved residential driveway or parking apron with a shallow finished edge.',
    family: 'Residential frontage',
    icon: 'lucide:car-front',
    schema: DrivewayNode,
  },
  {
    kind: 'streetscape:mailbox',
    label: 'Mailbox',
    description: 'A curbside residential mailbox on a simple post.',
    family: 'Residential frontage',
    icon: 'lucide:mailbox',
    schema: MailboxNode,
  },
  {
    kind: 'streetscape:parcel-box',
    label: 'Parcel box',
    description: 'A larger lockable curbside parcel-delivery box.',
    family: 'Residential frontage',
    icon: 'lucide:package',
    schema: ParcelBoxNode,
  },
  {
    kind: 'streetscape:trash-bin',
    label: 'Trash bin',
    description: 'A wide reinforced four-caster commercial refuse container.',
    family: 'Residential frontage',
    icon: 'lucide:trash-2',
    schema: TrashBinNode,
  },
  {
    kind: 'streetscape:recycling-bin',
    label: 'Recycling bin',
    description: 'A tall green wheeled recycling bin with a moulded hinged lid.',
    family: 'Residential frontage',
    icon: 'lucide:recycle',
    schema: RecyclingBinNode,
  },
  {
    kind: 'streetscape:residential-gate',
    label: 'Driveway gate',
    description: 'A double-leaf timber driveway gate with arched framing, crossed braces, and dark metal hardware.',
    family: 'Residential frontage',
    icon: 'lucide:door-open',
    schema: ResidentialGateNode,
  },
  {
    kind: 'streetscape:speed-hump',
    label: 'Speed hump',
    description: 'A narrow modular black-and-yellow rubber speed hump with reflective markings.',
    family: 'Traffic calming',
    icon: 'lucide:triangle',
    schema: SpeedHumpNode,
  },
] as const

const VARIANTS_BY_KIND = new Map(
  STREET_INFRASTRUCTURE_VARIANTS.map((variant) => [variant.kind, variant]),
)

export function getStreetInfrastructureVariant(
  kind: string,
): StreetInfrastructureVariant | undefined {
  return VARIANTS_BY_KIND.get(kind as StreetInfrastructureKind)
}

export function isStreetInfrastructureKind(kind: string): kind is StreetInfrastructureKind {
  return VARIANTS_BY_KIND.has(kind as StreetInfrastructureKind)
}

export function isResidentialRoadAssetKind(kind: string): kind is ResidentialRoadAssetKind {
  return (RESIDENTIAL_ROAD_ASSET_KINDS as readonly string[]).includes(kind)
}

export function parseStreetInfrastructure(
  kind: StreetInfrastructureKind,
  input: Record<string, unknown>,
): StreetInfrastructureNode {
  const variant = getStreetInfrastructureVariant(kind)
  if (!variant) throw new Error(`Unknown street infrastructure kind: ${kind}`)
  return variant.schema.parse({ ...input, type: kind }) as StreetInfrastructureNode
}
