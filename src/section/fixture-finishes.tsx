import { PanelSection, PanelButton } from '../inspector-controls'

const finishes = [
  { label: 'Chrome', color: '#c0c0c0' },
  { label: 'Brushed steel', color: '#969b9e' },
  { label: 'Brass', color: '#c4a46a' },
  { label: 'Black', color: '#252525' },
  { label: 'White', color: '#f4f4f1' },
] as const
export function FixtureFinishes({
  slots,
  parts,
  onChange,
}: {
  slots?: Record<string, string>
  parts: readonly string[]
  onChange: (slots: Record<string, string>) => void
}) {
  return (
    <PanelSection title="Finish" defaultExpanded>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Fixture finish">
        {finishes.map((finish) => (
          <PanelButton
            key={finish.label}
            type="button"
            aria-label={finish.label}
            aria-pressed={parts.every((part) => (slots?.[part] ?? '#c0c0c0') === finish.color)}
            onClick={() =>
              onChange({
                ...slots,
                ...Object.fromEntries(parts.map((part) => [part, finish.color])),
              })
            }
            className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-ring ${parts.every((part) => (slots?.[part] ?? '#c0c0c0') === finish.color) ? 'border-primary bg-accent' : 'border-border'}`}
          >
            <span
              className="h-6 w-6 rounded-full border border-border"
              style={{ background: finish.color }}
            />
            {finish.label}
          </PanelButton>
        ))}
      </div>
    </PanelSection>
  )
}
