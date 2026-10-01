import { z } from 'zod'
import { sectionDetail } from './fields'
import type { SectionDimension } from './model'

const labels: Record<string, string> = {
  tubeSize: 'Body or rail size',
  projection: 'Projection from wall',
  holderTilt: 'Handset angle',
  sliderPosition: 'Holder position',
  mountingHeight: 'Mount height above floor',
  flangeSize: 'Flange size',
  plateWidth: 'Plate width or diameter',
  width: 'Width',
  depth: 'Depth',
  height: 'Height',
  length: 'Length',
}
export function schemaDimensions(
  shape: Record<string, z.ZodType>,
  node: Record<string, unknown>,
  fields: readonly string[],
): SectionDimension[] {
  return fields.flatMap((key) => {
    let field: unknown = shape[key]
    while (field instanceof z.ZodDefault || field instanceof z.ZodOptional) field = field.unwrap()
    const value = node[key]
    if (!(field instanceof z.ZodNumber) || typeof value !== 'number') return []
    const angle = /angle|tilt|pitch|yaw|swivel|azimuth|slope/i.test(key)
    const ratio = key === 'sliderPosition' || key === 'holderSlide'
    const integer = field.isInt
    const min = field.minValue ?? Math.min(0, value)
    const max = field.maxValue ?? Math.max(4, value + 1)
    const label =
      labels[key] ??
      key
        .replace(/([A-Z])/g, (_, c: string) => ` ${c.toLowerCase()}`)
        .replace(/^./, (c) => c.toUpperCase())
    return [
      sectionDetail(
        key,
        label,
        value,
        min,
        max,
        integer || angle ? 1 : ratio ? 0.01 : 0.001,
        angle ? '°' : integer || ratio ? '' : 'm',
      ),
    ]
  })
}

// A primary dimension stays above the detail disclosure; editing patches only
// the actual node field rather than resizing the whole projected envelope.
export function primaryDimension(
  dimensions: SectionDimension[],
  key: string,
  view: 'plan' | 'section',
  axis: 'x' | 'y',
) {
  return dimensions.map((field) =>
    field.key === key ? { ...field, handle: true, view, axis, span: field.value } : field,
  )
}
