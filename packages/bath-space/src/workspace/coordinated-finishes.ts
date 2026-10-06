import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { fixtureInventory, type FixtureRow } from './inventory'
type FinishRole = {slot:string;label:string}
const metalRoles = (slots:Record<string,string>):FinishRole[] => Object.entries(slots).map(([slot,label])=>({slot,label}))
// Explicit visible-metal slots: keep nozzles, markings, shelves and flexible hoses independent.
const roles: Readonly<Record<string, readonly FinishRole[]>> = {
 'bath-space:mirror':metalRoles({frame:'Frame'}),
 'bath-space:towel-rail':metalRoles({metal:'Rail and brackets'}),
 'bath-space:wall-light':metalRoles({housing:'Housing'}),
 'bath-space:tap':metalRoles({body:'Tap body',trim:'Trim and fittings',handle:'Handles'}),
 'bath-space:shower-arm':metalRoles({arm:'Shower arm',flange:'Wall flange',connector:'Outlet connector'}),
 'bath-space:shower-head':metalRoles({body:'Head body',face:'Spray face',connector:'Connector'}),
 'bath-space:hand-shower':metalRoles({body:'Head body',handle:'Handle',face:'Spray face',connector:'Hose connector'}),
 'bath-space:shower-hose':metalRoles({connectors:'End connectors'}),
 'bath-space:shower-mount':metalRoles({body:'Body and rail',flange:'Wall flange',holder:'Holder',connector:'Outlet connector'}),
 'bath-space:body-jet':metalRoles({body:'Jet body',flange:'Wall flange',face:'Spray face'}),
 'bath-space:shower-flange':metalRoles({cover:'Wall cover'}),
 'bath-space:shower-connector':metalRoles({body:'Connector body',collars:'Collars',joint:'Joint'}),
 'bath-space:shower-control':metalRoles({plate:'Cover plate',body:'Mixer body',handles:'Handles',connectors:'Connectors',spout:'Bath spout',outlet:'Spout rim',diverter:'Bath diverter'}),
 'bath-space:wall-spout':metalRoles({body:'Spout body',flange:'Wall flange',outlet:'Outlet rim',diverter:'Diverter',handle:'Tap handle',connector:'Hose connector'}),
}
export type FinishTarget = {fixture:FixtureRow;slot:string;label:string}
export function coordinatedFinishTargets(nodes:Readonly<Record<string,AnyNode>>, scope:{selectedIds?:readonly string[];levelId?:string|null}):FinishTarget[] {
 return fixtureInventory(nodes).flatMap(fixture=>{
  const role=roles[String(nodes[fixture.id]?.type)]
  if(!role || fixture.hidden || (scope.selectedIds && !scope.selectedIds.includes(fixture.id)) || (scope.levelId && scope.levelId!==fixture.levelId))return []
  return role.map(item=>({fixture,...item}))
 })
}
export function coordinatedFinishUpdates(nodes:Readonly<Record<string,AnyNode>>, targets:readonly FinishTarget[],ref:string):{id:AnyNodeId;data:Partial<AnyNode>}[] {
 const pending=new Map<string,{node:AnyNode;slots:Record<string,string>}>()
 for(const target of targets){
  const node=nodes[target.fixture.id]
  if(!node || !roles[String(node.type)]?.some(role=>role.slot===target.slot))continue
  let entry=pending.get(node.id)
  if(!entry){entry={node,slots:{...((node as AnyNode & {slots?:Record<string,string>}).slots)}};pending.set(node.id,entry)}
  if(ref)entry.slots[target.slot]=ref
  else delete entry.slots[target.slot]
 }
 return [...pending.values()].flatMap(({node,slots})=>{
  const previous=(node as AnyNode & {slots?:Record<string,string>}).slots??{}
  if(Object.keys(previous).length===Object.keys(slots).length && Object.entries(slots).every(([key,value])=>previous[key]===value))return []
  return [{id:node.id as AnyNodeId,data:{slots} as Partial<AnyNode>}]
 })
}
