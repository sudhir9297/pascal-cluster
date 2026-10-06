'use client'
import { getMaterialsForCategory, toLibraryMaterialRef, toSceneMaterialRef, useScene } from '@pascal-app/core'
import { ActionButton, PanelSection } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState } from 'react'
import { PanelSelect } from '../inspector-controls'
import { coordinatedFinishTargets, coordinatedFinishUpdates } from './coordinated-finishes'
export default function CoordinatedFinishesPanel() {
 const nodes=useScene(state=>state.nodes),materials=useScene(state=>state.materials),readOnly=useScene(state=>state.readOnly)
 const selection=useViewer(state=>state.selection)
 const [scope,setScope]=useState('selected'),[ref,setRef]=useState(''),[result,setResult]=useState('')
 const targets=coordinatedFinishTargets(nodes,scope==='selected'?{selectedIds:selection.selectedIds}:scope==='level'?{levelId:selection.levelId,selectedIds:selection.levelId?undefined:[]}:{})
 const choices=new Map(getMaterialsForCategory('metal').map(item=>[toLibraryMaterialRef(item.id),item.label]))
 for(const item of Object.values(materials))choices.set(toSceneMaterialRef(item.id),item.name)
 const valid=!ref || choices.has(ref)
 const updates=coordinatedFinishUpdates(nodes,targets,ref)
 return <PanelSection title="Coordinated finishes" defaultExpanded={false}>
  <p className="text-[11px] text-muted-foreground">Coordinate accessory metal, taps and shower fittings. Mirror surfaces, nozzles, shelves and flexible hoses keep their own finishes. Hidden fixtures are excluded.</p>
  <label className="block space-y-1 text-xs">Apply to<PanelSelect aria-label="Coordinated finish scope" value={scope} onChange={e=>{setScope(e.target.value);setResult('')}}>
   <option value="selected">Selected fixtures</option><option value="level">Visible fixtures on current level</option><option value="project">Visible fixtures in project</option>
  </PanelSelect></label>
  <label className="block space-y-1 text-xs">Finish<PanelSelect aria-label="Coordinated finish material" value={valid?ref:''} onChange={e=>{setRef(e.target.value);setResult('')}}>
   <option value="">Each slot's default finish</option>{[...choices].map(([value,label])=><option key={value} value={value}>{label}</option>)}
  </PanelSelect></label>
  <p role="status" className="text-xs text-muted-foreground">{targets.length} fixture slots · {updates.length} fixtures to change</p>
  <ul className="space-y-1 text-[11px] text-muted-foreground">{targets.map(target=><li key={`${target.fixture.id}:${target.slot}`}>{target.fixture.label} · {target.fixture.level} · {target.label}</li>)}</ul>
  {!targets.length && <p className="text-xs text-muted-foreground">Select an accessory, tap or shower fitting, or choose a visible-fixture scope.</p>}
  <ActionButton type="button" label="Apply coordinated finish" disabled={readOnly||!valid||!updates.length} onClick={()=>{
   const state=useScene.getState()
   if(state.readOnly)return
   const currentTargets=coordinatedFinishTargets(state.nodes,scope==='selected'?{selectedIds:useViewer.getState().selection.selectedIds}:scope==='level'?{levelId:useViewer.getState().selection.levelId,selectedIds:useViewer.getState().selection.levelId?undefined:[]}:{})
   const changes=coordinatedFinishUpdates(state.nodes,currentTargets,ref)
   state.updateNodes(changes)
   setResult(`Updated ${changes.length} fixture${changes.length===1?'':'s'}. Undo restores their previous finishes.`)
  }}/>
  {result && <p role="status" className="text-xs text-muted-foreground">{result}</p>}
 </PanelSection>
}
