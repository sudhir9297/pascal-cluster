export type SectionDimension = {
  key: string
  label: string
  value: number
  min: number
  max: number
  presets?: {value:number;label:string;source:string}[]
  snapValues?: readonly number[]
  step: number
  view: 'plan' | 'section'
  axis: 'x' | 'y'
  span: number
  spanOffset?: number
  crossPosition?: number
  crossOffset?: number
  start?: number
  direction?: 1 | -1
  handle?: boolean
  unit?: string
  patch?: (value: number) => Record<string, unknown>
}
export function dimensionSpanAt(field: SectionDimension, value: number) {
  const offset = field.spanOffset ?? 0
  return offset + value * (field.value ? (field.span - offset) / field.value : 1)
}
export function dimensionCrossAt(field: SectionDimension, value: number) {
  if (field.crossPosition === undefined) return undefined
  const offset = field.crossOffset ?? 0
  return offset + value * (field.value ? (field.crossPosition - offset) / field.value : 1)
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
  const candidates=field.snapValues?.filter(item=>Number.isFinite(item) && item>=field.min && item<=field.max)
  if(candidates?.length)return candidates.reduce((best,item)=>Math.abs(item-value)<Math.abs(best-value)?item:best)
  const bounded = Math.max(field.min, Math.min(field.max, value))
  return Number(
    Math.max(field.min, Math.min(field.max, Math.round(bounded / field.step) * field.step)).toFixed(
      6,
    ),
  )
}
