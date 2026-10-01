import type { SectionDimension, SectionDrawing } from './model'

export const sectionRect = (x: number, y: number, w: number, h: number) => `M${x},${y}h${w}v${h}h${-w}Z`
export const sectionEllipse = (w: number, d: number, x = 0, y = 0) => `M${x},${y + d / 2}a${w / 2},${d / 2} 0 1,0 ${w},0a${w / 2},${d / 2} 0 1,0 ${-w},0Z`
export function sectionDimension(key: string, label: string, value: number, min: number, max: number, step: number, view: 'plan' | 'section' = 'section', axis: 'x' | 'y' = 'y', span = value): SectionDimension {
  return { key, label, value, min, max, step, view, axis, span }
}
export function sectionDetail(key: string, label: string, value: number, min: number, max: number, step: number, unit = 'm'): SectionDimension {
  return { ...sectionDimension(key, label, value, min, max, step), handle: false, unit }
}
export function sectionFieldPatch(field: SectionDimension, value: number): Record<string, unknown> {
  return field.patch?.(value) ?? { [field.key]: value }
}
export type SectionModel = { drawing: SectionDrawing; dimensions: SectionDimension[] }
