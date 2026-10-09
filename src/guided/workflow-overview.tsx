'use client'
import { useScene, type LevelNode } from '@pascal-app/core'
import { bathroomWorkflow, type BathroomStage } from './workflow'

export default function WorkflowOverview({ levelId, stage, onStage }: { levelId: LevelNode['id']; stage: BathroomStage; onStage: (stage: BathroomStage) => void }) {
  const nodes = useScene((state) => state.nodes)
  const workflow = bathroomWorkflow(levelId, nodes)
  return (
    <nav aria-label="Bathroom areas" className="mx-4 mt-3 shrink-0 border-b border-border/60 pb-3">
      <select aria-label="Current bathroom area" value={stage} onChange={(event) => onStage(event.target.value as BathroomStage)} className="min-h-9 w-full min-w-0 rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        {workflow.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
      </select>
    </nav>
  )
}
