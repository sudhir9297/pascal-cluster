import type { SectionDrawing } from './model'

// Side silhouette projected from the same geometry used by the scene.
export function FixturePreview({ drawing }: { drawing: SectionDrawing }) {
  const width = drawing.sectionWidth ?? drawing.width
  const height = drawing.fixtureHeight ?? drawing.height
  const pad = Math.max(width, height) * 0.12
  return <svg aria-hidden="true" viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} className="h-full w-full" fill="none" stroke="currentColor">
    <path d={drawing.detail ?? drawing.section} fill="currentColor" fillOpacity="0.08" strokeWidth={Math.max(width, height) * 0.007} strokeLinejoin="round" />
  </svg>
}
