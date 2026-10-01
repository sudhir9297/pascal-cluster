'use client'

import {
  PanelSection as EditorPanelSection,
  PanelWrapper as EditorPanelWrapper,
  SliderControl as EditorSliderControl,
} from '@pascal-app/editor'
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  SelectHTMLAttributes,
  ReactNode,
  InputHTMLAttributes,
} from 'react'

const controlStyle =
  'border border-border rounded-md bg-accent hover:bg-secondary text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40'
// Keep layout-specific classes; control appearance belongs to this module.
const layoutClasses = (classes = '') =>
  classes
    .split(/\s+/)
    .filter(
      (value) =>
        !/^(?:bg-|rounded|border(?:-|$)|text-(?:xs|sm|base|\[|foreground|muted|primary)|h-\d|px-|py-|p-\d|focus:|focus-visible:)/.test(
          value,
        ),
    )
    .join(' ')
const sentenceCase = (title: string) =>
  title.replace(/\b[A-Z][a-z]+\b/g, (word, offset: number) =>
    offset === 0 ? word : word.toLowerCase(),
  )

export function PanelWrapper({ title, ...props }: ComponentProps<typeof EditorPanelWrapper>) {
  return <EditorPanelWrapper {...props} title={sentenceCase(title)} />
}

export function PanelSection({ title, ...props }: ComponentProps<typeof EditorPanelSection>) {
  return <EditorPanelSection {...props} title={sentenceCase(title)} />
}

export function SliderControl(props: ComponentProps<typeof EditorSliderControl>) {
  return <EditorSliderControl {...props} className={`h-9 text-xs ${props.className ?? ''}`} />
}

export function PanelSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`w-full h-9 px-3 ${controlStyle} ${layoutClasses(className)}`} />
  )
}

export function PanelButton({
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      className={`min-h-8 px-3 py-2 ${controlStyle} aria-pressed:border-primary aria-pressed:bg-primary/15 ${layoutClasses(className)}`}
    />
  )
}

export function ToggleControl({
  label,
  checked,
  onChange,
  className,
  mixed,
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  mixed?: boolean
}) {
  return (
    <label
      className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md bg-accent px-3 text-xs ${layoutClasses(className)}`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        aria-checked={mixed ? 'mixed' : checked}
        ref={(input) => {
          if (input) input.indeterminate = Boolean(mixed)
        }}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-ring"
      />
    </label>
  )
}

export function PanelNumberInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="number"
      className={`h-9 w-20 px-2 text-right font-mono tabular-nums ${controlStyle} ${layoutClasses(className)}`}
    />
  )
}
