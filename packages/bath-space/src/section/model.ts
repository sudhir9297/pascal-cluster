export type SectionDimension = {
  key: string
  label: string
  value: number
  min: number
  max: number
  step: number
  view: 'plan' | 'section'
  axis: 'x' | 'y'
  span: number
  start?: number
  direction?: 1 | -1
  handle?: boolean
  unit?: string
  patch?: (value: number) => Record<string, unknown>
}
export type SectionDrawing = {
  width: number
  depth: number
  height: number
  fixtureHeight?: number
  cutAxis?: 'x' | 'y'
  sectionWidth?: number
  plan: string
  planDetail?: string
  section: string
  detail?: string
  planParts?: string[]
  sectionParts?: string[]
  floor?: boolean
  cutPosition?: number
  datum?: { y: number; label: string }
}
export { basinSection } from './basin-section'
export { vanitySection } from './vanity-section'
export { tapSection } from './tap-section'

export function boundedDimensionValue(field: SectionDimension, value: number) {
  if (!Number.isFinite(value)) return field.value
  const bounded = Math.max(field.min, Math.min(field.max, value))
  return Number(
    Math.max(field.min, Math.min(field.max, Math.round(bounded / field.step) * field.step)).toFixed(
      6,
    ),
  )
}
