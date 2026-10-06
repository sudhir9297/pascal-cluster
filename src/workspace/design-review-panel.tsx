'use client'
import { useScene } from '@pascal-app/core'
import { ActionButton, PanelSection, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState } from 'react'
import { bathroomDesignReview } from './design-review'
import { fixtureInventory } from './inventory'

export default function BathroomDesignReviewPanel() {
  const nodes = useScene(state => state.nodes)
  const materials = useScene(state => state.materials)
  const [includeHidden, setIncludeHidden] = useState(false)
  const inventory = fixtureInventory(nodes, materials)
  const issues = bathroomDesignReview(nodes, materials).filter(issue => includeHidden || !issue.fixture.hidden)
  const count = inventory.filter(row => includeHidden || !row.hidden).length
  return <section aria-label="Bathroom design review" className="space-y-3 pt-3">
    <PanelSection title="Design review">
      <p className="text-xs text-muted-foreground">Checks supporting walls, mirror, rail and light wall fit, and unavailable assigned finishes. Door swings, approach space and service clearances still require review.</p>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={includeHidden} onChange={event => setIncludeHidden(event.currentTarget.checked)} />Include hidden fixtures</label>
      <p role="status" className="text-xs text-muted-foreground">{count} fixtures reviewed · {issues.length} issues</p>
      {!issues.length && <p className="py-3 text-xs text-muted-foreground">{count ? 'No issues found in these checks.' : 'Place bathroom fixtures to review their attachments and finishes.'}</p>}
      <ul className="space-y-2">{issues.map(issue => <li key={issue.id} className="rounded-lg border border-border/50 p-2">
        <ActionButton type="button" label={`Review ${issue.fixture.label}`} className="justify-start" onClick={() => {
          const editor = useEditor.getState()
          editor.setTool(null); editor.setMode('select'); editor.setPhase('furnish')
          useViewer.getState().setSelection({ buildingId: issue.fixture.buildingId, levelId: issue.fixture.levelId, zoneId: null, selectedIds: [issue.fixture.id] })
        }} />
        <p className="mt-1 text-[11px] text-muted-foreground">{issue.fixture.level}{issue.fixture.hidden ? ' · Hidden' : ''}</p>
        <p className="mt-1 text-xs">{issue.message}</p>
      </li>)}</ul>
    </PanelSection>
  </section>
}
