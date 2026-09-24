import { parseOsmMapResponse, prepareOsmStreetImport, completeOsmStreetImport } from '../../../src/osm-import'
import { sampleRoadEdgePoints, buildJunctionBoundaryGeometry } from '../../../src/road-network-geometry'
import { buildRoadCrossSection } from '../../../src/road-cross-section'
const dir = import.meta.dir
const raw = await Bun.file(`${dir}/manhattan-response.json`).json()
const data = parseOsmMapResponse(raw)
const prepared = await prepareOsmStreetImport({lat:40.758,lon:-73.9855},250,{loadMapData:async()=>data})
const result = await completeOsmStreetImport(prepared)
const conflicts:any[]=[]
const steps:any[]=[]
const fanWarnings:any[]=[]
for (const graph of result.graphs) {
 const cuts = new Map<string,number>()
 for (const j of Object.values(graph.junctions)) {
  const incident = Object.values(graph.edges).filter(e=>e.startNodeId===j.nodeId||e.endNodeId===j.nodeId)
  const approaches = incident.map(e=>{
   const pts=sampleRoadEdgePoints(graph,e);if(e.endNodeId===j.nodeId)pts.reverse()
   return {edgeId:e.id,angle:Math.atan2(pts[1]![2]-pts[0]![2],pts[1]![0]-pts[0]![0]),halfWidth:buildRoadCrossSection(graph.stylePresets[e.styleId]!).carriagewayWidth/2}
  })
  const solution=buildJunctionBoundaryGeometry(approaches,j.cornerRadii)
  const signed = solution.indices.reduce<number[]>((out,_,i)=>{
   if(i%3)return out
   const a=solution.indices[i]!*3,b=solution.indices[i+1]!*3,c=solution.indices[i+2]!*3,p=solution.positions
   out.push((p[b]!-p[a]!)*(p[c+2]!-p[a+2]!)-(p[b+2]!-p[a+2]!)*(p[c]!-p[a]!));return out
  },[])
  if(signed.some(x=>x>1e-6)&&signed.some(x=>x< -1e-6))fanWarnings.push({nodeId:j.nodeId,positive:signed.filter(x=>x>1e-6).length,negative:signed.filter(x=>x< -1e-6).length})
  for(const [id,cut] of Object.entries(solution.approachCuts)) cuts.set(id,(cuts.get(id)??0)+cut)
  const heights=[...new Set(incident.map(e=>graph.stylePresets[e.styleId]!.surfaceThickness))]
  if(heights.length>1)steps.push({nodeId:j.nodeId,heights})
 }
 for(const e of Object.values(graph.edges)){
  const pts=sampleRoadEdgePoints(graph,e)
  const length=pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-pts[i]![0],p[2]-pts[i]![2]),0)
  if((cuts.get(e.id)??0)>length)conflicts.push({edgeId:e.id,name:graph.stylePresets[e.styleId]!.name,length,cuts:cuts.get(e.id)})
 }
}
const count=(key:string)=>data.ways.filter(w=>key in w.tags).length
const summary={timestamp:raw.osm3s.timestamp_osm_base,fetchedWays:data.ways.length,fetchedPointObjects:data.pointFeatures.length,tagCoverage:Object.fromEntries(['lanes','width','est_width','surface','oneway','turn:lanes','ele','tunnel','layer'].map(k=>[k,count(k)])),importStats:result.stats,importedAssets:result.assets.length,overcommittedApproachCuts:conflicts,junctionSurfaceHeightDifferences:steps,mixedWindingJunctionFans:fanWarnings}
await Bun.write(`${dir}/analysis.json`,JSON.stringify(summary,null,2))
await Bun.write(`${dir}/imported-graphs.json`,JSON.stringify(result,null,2))
console.log(JSON.stringify(summary,null,2))
