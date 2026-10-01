import { SiteNode, BuildingNode, LevelNode, WallNode, SlabNode, type AnyNode } from '@pascal-app/core'
import { WallHungToiletNode, toiletPresets as wallPresets } from '../src/wall-hung-toilet/schema'
import { FloorStandingToiletNode, toiletPresets as floorPresets } from '../src/floor-standing-toilet/schema'
import { toiletPlacement as placeWall } from '../src/wall-hung-toilet/placement'
import { toiletPlacement as placeFloor } from '../src/floor-standing-toilet/placement'
import { defaultToiletControl } from '../src/flush-control/attachment'
import { WallFlushPlateNode, flushPlatePresets } from '../src/flush-control/schema'
import { flushPlatePlacement } from '../src/flush-control/placement'

const referenceResponse = await fetch('http://localhost:3002/api/scenes/90469fd342d2')
if (!referenceResponse.ok) throw new Error(await referenceResponse.text())
const reference = await referenceResponse.json()
const site = SiteNode.parse({name:'Toilet showcase'})
const building = BuildingNode.parse({name:'Bath Space showroom',parentId:site.id})
const level = LevelNode.parse({name:'Toilets and flush plates',parentId:building.id,height:2.8})
const originalFloor = Object.values(reference.graph.nodes).find((n:any)=>n.type==='slab') as any
const floor = SlabNode.parse({...originalFloor,id:undefined,parentId:level.id,name:'Showroom floor',elevation:0,thickness:0.06,polygon:[[-5.8,-5.4],[5.8,-5.4],[5.8,8],[-5.8,8]]})
const nodes: Record<string,AnyNode> = Object.fromEntries([site,building,level,floor].map(n=>[n.id,n]))
site.children=[building.id];building.children=[level.id];level.children=[floor.id]
function displayWall(name:string,z:number,height=1.35) {
  const wall=WallNode.parse({name,parentId:level.id,start:[-5.25,z],end:[5.25,z],height,thickness:0.12,slots:{interior:'scene:mat_showroom_wall',exterior:'scene:mat_showroom_wall'}})
  nodes[wall.id]=wall;level.children.push(wall.id);return wall
}
function addToilet(draft:WallHungToiletNode|FloorStandingToiletNode,wall:WallNode,station:number,index:number) {
  const toilet=draft.type==='bath-space:wall-hung-toilet'
    ? WallHungToiletNode.parse({...draft,...placeWall(draft,wall,station,'front')})
    : FloorStandingToiletNode.parse({...draft,...placeFloor(draft,wall,station,'front')})
  nodes[toilet.id]=toilet as unknown as AnyNode;wall.children.push(toilet.id)
  const control=defaultToiletControl(toilet,nodes)
  if(control) {
    nodes[control.id]=control as unknown as AnyNode
    if(control.type==='bath-space:wall-flush-plate') {
      Object.assign(control,flushPlatePresets[index%flushPlatePresets.length],{name:`${toilet.name} flush plate`})
      wall.children.push(control.id)
    } else toilet.children.push(control.id)
  }
}
const wallHung=displayWall('Wall hung · five bowl shapes',-5)
wallPresets.forEach((p,i)=>addToilet(WallHungToiletNode.parse({...p,name:`${p.label} wall hung`,flushControlsSeparated:true}),wallHung,1.25+i*2,i))
const standing=displayWall('Floor standing · back-to-wall and two-piece',-2)
floorPresets.slice(0,7).forEach((p,i)=>addToilet(FloorStandingToiletNode.parse({...p,name:p.label,flushControlsSeparated:true}),standing,0.75+i*1.5,i))
const coupled=displayWall('Floor standing · two-piece and one-piece',1)
floorPresets.slice(7).forEach((p,i)=>addToilet(FloorStandingToiletNode.parse({...p,name:p.label,flushControlsSeparated:true}),coupled,0.75+i*1.5,i))
const tanks=displayWall('Wall hung · external cistern options',4,2.1)
for(const [i,tankType] of (['attached','low-level','high-level'] as const).entries()) {
  addToilet(WallHungToiletNode.parse({...wallPresets[0],name:`Rounded · ${tankType} cistern`,tankType,flushControlsSeparated:true}),tanks,2.25+i*3,i)
}
const plateWall=displayWall('Wall flush plates · five shapes',7,1.35)
flushPlatePresets.forEach((p,i)=>{
  const draft=WallFlushPlateNode.parse({...p,name:`${p.label} wall flush plate`,mountingHeight:1})
  const plate=WallFlushPlateNode.parse({...draft,...flushPlatePlacement(draft,plateWall,1.25+i*2,'front')})
  nodes[plate.id]=plate as unknown as AnyNode;plateWall.children.push(plate.id)
})
const graph={nodes,rootNodeIds:[site.id],collections:{},materials:{...reference.graph.materials,mat_showroom_wall:{id:'mat_showroom_wall',name:'Showroom slate',material:{properties:{color:'#727a80',roughness:0.85,metalness:0}}}},installedPlugins:reference.graph.installedPlugins??['pascal:bath-space']}
await Bun.write(new URL('../doc/toilet-showcase.scene.json',import.meta.url),JSON.stringify(graph,null,2))
const response=await fetch('http://localhost:3002/api/scenes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bath Space · complete toilet showcase',graph})})
if(!response.ok)throw new Error(await response.text())
const scene=await response.json()
console.log(JSON.stringify({scene,url:`http://localhost:3002/scene/${scene.id}`,toilets:22,catalogToilets:19,externalCisternExamples:3,standaloneFlushPlates:5,nodes:Object.keys(nodes).length}))
