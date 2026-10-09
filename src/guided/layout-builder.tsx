'use client'
import { useEffect, useState } from 'react'
import { useScene, type AnyNodeId, type LevelNode } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import BathSpaceCatalog from '../catalog-panel'
import ShowerKitCatalog from '../shower-kit/catalog'
import ShowerAssemblyCatalog from '../shower-assembly/catalog'
import ShowerArmCatalog from '../shower-arm/catalog'
import { bathroomLayout, type LayoutTarget } from './layout'

export default function LayoutBuilder({ levelId, onFinish, onWashArea }: { levelId: LevelNode['id']; onFinish: () => void; onWashArea: () => void }) {
  const nodes = useScene((state) => state.nodes)
  const layout = bathroomLayout(levelId, nodes)
  const [target, setTarget] = useState<LayoutTarget>(() => layout.find((fixture) => !fixture.node)?.id ?? layout[0]?.id ?? 'wash-area')
  const [withoutVanity, setWithoutVanity] = useState(false)
  const [system, setSystem] = useState<'kit' | 'assembly' | 'custom'>('kit')
  const current = layout.find((fixture) => fixture.id === target) ?? layout[0]
  const index = layout.findIndex((fixture) => fixture.id === current?.id)
  const ready = layout.length > 0 && layout.every((fixture) => fixture.node)
  const stop = () => { useEditor.getState().setTool(null); useEditor.getState().setMode('select') }
  const go = (next: LayoutTarget) => { stop(); setTarget(next) }
  useEffect(() => { if (current?.node) stop() }, [current?.node?.id])
  const next = layout[index + 1]
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-3 p-4">
        <div><h1 className="text-sm font-semibold">Plan your layout</h1><p className="mt-1 text-xs text-muted-foreground">Place the main fixtures first. Check their positions in the room before adding fittings.</p></div>
        <nav aria-label="Layout fixtures" className="flex flex-wrap gap-1">
          {layout.map((fixture) => <button key={fixture.id} type="button" aria-current={current?.id === fixture.id ? 'step' : undefined} onClick={() => go(fixture.id)} className={`rounded-md border px-2 py-2 text-xs ${current?.id === fixture.id ? 'border-primary bg-primary/10' : 'border-border'}`}>{fixture.label}{fixture.node ? ' · Placed' : ''}</button>)}
        </nav>
        <h2 className="text-sm font-semibold">{current?.node ? `Check your ${current.label.toLowerCase()}` : `Place your ${current?.label.toLowerCase() ?? 'fixture'}`}</h2>
        <p role="status" className="text-xs text-muted-foreground">{current?.node ? 'Select the fixture to adjust its position in the scene.' : 'Choose a style, then click in the scene to place it.'}</p>
        {current?.node && <button type="button" className="text-xs underline" onClick={() => { stop(); useViewer.getState().setSelection({ levelId, selectedIds: [current.node!.id as AnyNodeId] }) }}>Select {current.node.name || current.label}</button>}
        {!current?.node && current?.id === 'wash-area' && <button type="button" className="text-xs underline" onClick={() => { stop(); setWithoutVanity(!withoutVanity) }}>{withoutVanity ? 'Use a vanity instead' : 'Use a basin without a vanity'}</button>}
        {!current?.node && current?.id === 'shower' && <select aria-label="Shower system" value={system} onChange={(event) => { stop(); setSystem(event.target.value as typeof system) }} className="w-full rounded-md border border-border bg-secondary p-2 text-xs"><option value="kit">Complete shower</option><option value="assembly">Shower column or panel</option><option value="custom">Choose each part separately</option></select>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!current?.node && (current?.id === 'shower' ? system === 'kit' ? <ShowerKitCatalog query="" /> : system === 'assembly' ? <ShowerAssemblyCatalog query="" /> : <ShowerArmCatalog query="" /> : <BathSpaceCatalog category={current?.id === 'wash-area' ? withoutVanity ? 'Basin' : 'Vanity' : current?.id === 'toilet' ? 'Toilet' : 'Bath'} basinMount={withoutVanity ? 'wall' : undefined} />)}
        {ready && <p className="px-4 text-xs text-muted-foreground">Main fixtures are placed. Check spacing and door access in the scene, then continue to fittings.</p>}
      </div>
      {current?.id === 'wash-area' && current.node && <button type="button" onClick={() => { stop(); onWashArea() }} className="mx-4 mb-3 min-h-9 rounded-md bg-secondary px-3 py-2 text-xs font-medium">Add basin and tap</button>}
      <footer className="flex shrink-0 gap-2 border-t border-border p-4">
        {index > 0 && <button type="button" onClick={() => go(layout[index - 1]!.id)} className="rounded-md border border-border px-3 py-2 text-xs">Back</button>}
        <button type="button" disabled={!current?.node} onClick={() => { if (next) go(next.id); else if (ready) { stop(); onFinish() } else go(layout.find((fixture) => !fixture.node)!.id) }} className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40">{next ? `Next: ${next.label}` : ready ? 'Continue to fittings' : 'Finish placing fixtures'}</button>
      </footer>
    </div>
  )
}
