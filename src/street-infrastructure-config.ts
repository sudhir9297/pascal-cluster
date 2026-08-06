import {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
  type DrainageInletNode as DrainageInletNodeType,
  type FireHydrantNode as FireHydrantNodeType,
  type ManholeCoverNode as ManholeCoverNodeType,
  type TrafficSignalNode as TrafficSignalNodeType,
} from './schema'

export const STREET_INFRASTRUCTURE_KINDS = [
  'environment:traffic-signal',
  'environment:drainage-inlet',
  'environment:manhole-cover',
  'environment:fire-hydrant',
] as const

export type StreetInfrastructureKind = (typeof STREET_INFRASTRUCTURE_KINDS)[number]
export type StreetInfrastructureNode =
  | TrafficSignalNodeType
  | DrainageInletNodeType
  | ManholeCoverNodeType
  | FireHydrantNodeType

export type StreetInfrastructureVariant = {
  kind: StreetInfrastructureKind
  label: string
  description: string
  family: 'Traffic control' | 'Drainage' | 'Fire safety'
  icon: string
  schema:
    | typeof TrafficSignalNode
    | typeof DrainageInletNode
    | typeof ManholeCoverNode
    | typeof FireHydrantNode
}

export const STREET_INFRASTRUCTURE_VARIANTS: readonly StreetInfrastructureVariant[] = [
  {
    kind: 'environment:traffic-signal',
    label: 'Traffic signal',
    description: 'A field-detailed modular vehicle signal with multiple head layouts and mounting systems.',
    family: 'Traffic control',
    icon: 'lucide:traffic-cone',
    schema: TrafficSignalNode,
  },
  {
    kind: 'environment:drainage-inlet',
    label: 'Drainage grate',
    description: 'A configurable road inlet with bicycle-safe and decorative grate patterns.',
    family: 'Drainage',
    icon: 'lucide:rows-3',
    schema: DrainageInletNode,
  },
  {
    kind: 'environment:manhole-cover',
    label: 'Manhole cover',
    description: 'A flush cast-metal access cover with configurable utility markings.',
    family: 'Drainage',
    icon: 'lucide:circle-dot',
    schema: ManholeCoverNode,
  },
  {
    kind: 'environment:fire-hydrant',
    label: 'Fire hydrant',
      description: 'A tall, proportioned dry- or wet-barrel hydrant with configurable outlet silhouettes.',
    family: 'Fire safety',
    icon: 'lucide:fire-extinguisher',
    schema: FireHydrantNode,
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

export function parseStreetInfrastructure(
  kind: StreetInfrastructureKind,
  input: Record<string, unknown>,
): StreetInfrastructureNode {
  const variant = getStreetInfrastructureVariant(kind)
  if (!variant) throw new Error(`Unknown street infrastructure kind: ${kind}`)
  return variant.schema.parse({ ...input, type: kind }) as StreetInfrastructureNode
}
