import type { PoolNode } from '../core/schema'

type EditHost = {
  current: () => PoolNode | null
  readOnly: () => boolean
  preview: (patch: Partial<PoolNode>) => void
  clear: (fields: string[]) => void
  commit: (patch: Partial<PoolNode>) => void
}

/** Transient edits never enter scene history; release writes the complete patch once. */
export function createPoolEditSession(host: EditHost) {
  let base: PoolNode | null = null
  let patch: Partial<PoolNode> = {}
  const cancel = () => {
    host.clear(Object.keys(patch))
    base = null
    patch = {}
  }
  return {
    preview(next: Partial<PoolNode>) {
      if (host.readOnly()) return
      base ??= host.current()
      if (!base || host.current() !== base) { cancel(); return }
      patch = { ...patch, ...next }
      host.preview(patch)
    },
    commit() {
      const next = patch
      const valid = base && host.current() === base && !host.readOnly()
      // Keep the override until the committed value is visible to scene subscribers.
      try {
        if (valid && Object.keys(next).length) host.commit(next)
      } finally { cancel() }
    },
    cancel,
  }
}
