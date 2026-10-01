import type { ReactNode } from 'react'

export function CatalogEmptyState({ children }: { children: ReactNode }) {
  return <p style={{ padding: '28px 12px' }} className="rounded-lg border border-dashed border-border/70 px-3 py-7 text-center text-xs text-muted-foreground">{children}</p>
}
