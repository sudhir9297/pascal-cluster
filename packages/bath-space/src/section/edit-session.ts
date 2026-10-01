import { boundedDimensionValue, type SectionDimension } from './model'

export type DimensionPatch = Record<string, number>
type EditCallbacks = {
  preview: (patch: DimensionPatch) => void
  commit: (patch: DimensionPatch) => void
  clear: () => void
}

/** A transient edit owns its preview until one commit or cancellation. */
export function createDimensionEdit(field: SectionDimension, callbacks: EditCallbacks) {
  let value = field.value
  let finished = false
  return {
    field,
    preview(next: number) {
      if (finished || !Number.isFinite(next)) return
      value = boundedDimensionValue(field, next)
      callbacks.preview({ [field.key]: value })
    },
    finish(commit: boolean) {
      if (finished) return
      finished = true
      try {
        if (commit && value !== field.value) callbacks.commit({ [field.key]: value })
      } finally {
        callbacks.clear()
      }
    },
  }
}
export type DimensionEdit = ReturnType<typeof createDimensionEdit>
