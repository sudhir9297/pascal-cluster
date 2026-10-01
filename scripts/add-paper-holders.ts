import {ToiletPaperHolderNode,holderPresets} from '../src/toilet-paper-holder/schema'
import {holderPlacement} from '../src/toilet-paper-holder/placement'
const url='http://localhost:3002/api/scenes/7df12c22f685'
const response=await fetch(url)
if(!response.ok) throw new Error(await response.text())
const scene=await response.json(), graph=scene.graph
const wall=Object.values(graph.nodes).find((n:any)=>n.type==='wall' && n.name.startsWith('Wall flush plates')) as any
if(!wall) throw new Error('Display wall missing')
for(const [i,preset] of holderPresets.entries()) {
  if(Object.values(graph.nodes).some((n:any)=>n.type==='bath-space:toilet-paper-holder' && n.shape===preset.shape)) continue
  const draft=ToiletPaperHolderNode.parse({...preset,name:`${preset.label} toilet paper holder`,mountingHeight:0.7})
  const node=ToiletPaperHolderNode.parse({...draft,...holderPlacement(draft,wall,2.25+i*3,'front')})
  graph.nodes[node.id]=node; wall.children.push(node.id)
}
const save=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:scene.name,graph})})
if(!save.ok) throw new Error(await save.text())
await Bun.write(new URL('../doc/toilet-showcase.scene.json',import.meta.url),JSON.stringify(graph,null,2))
console.log('Added three paper holders to the showcase')
