import type { ReactNode } from 'react'

export function CatalogCard({
  label,
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
      style={{
        minWidth: 0,
        padding: 0,
        overflow: 'hidden',
        borderRadius: 12,
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        background: 'var(--secondary)',
        color: 'inherit',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          background: '#eeeade',
        }}
      >
        {children}
      </div>
      <span
        style={{
          display: 'block',
          padding: '10px 8px',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </button>
  )
}
