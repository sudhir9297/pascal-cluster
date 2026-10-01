import { WallHungToiletNode, toiletPresets as wallPresets, toiletLayout as wallLayout } from '../src/wall-hung-toilet/schema'
import { FloorStandingToiletNode, toiletPresets as floorPresets, toiletLayout as floorLayout } from '../src/floor-standing-toilet/schema'
import { toiletPlacement as wallPlacement } from '../src/wall-hung-toilet/placement'
import { toiletPlacement as floorPlacement } from '../src/floor-standing-toilet/placement'
import { defaultToiletControl } from '../src/flush-control/attachment'
import { WallNode } from '@pascal-app/core'
const family = process.argv[2] ?? 'wall'
const key = process.argv[3] ?? 'rounded'
const url = 'http://localhost:3002/api/scenes/90469fd342d2'
const old = await (await fetch(url)).json()
const graph = old.graph
const find = (type: string) => Object.values(graph.nodes).find((n: any) => n.type === type) as any
const site = find('site'), building = find('building'), level = find('level'), floor = find('slab')
const wall = WallNode.parse({...find('wall'), name:'Thumbnail wall', start:[-1,0],end:[1,0],height:1.8,thickness:0.12,children:[]})
const preset = family === 'floor' ? floorPresets.find(p => p.design === key) : wallPresets.find(p => p.style === key)
if (!preset) throw new Error(`Unknown toilet preset ${family}/${key}`)
const label = `${preset.label} ${family === 'floor' ? 'floor standing' : 'wall hung'} toilet`
const draft = family === 'floor' ? FloorStandingToiletNode.parse({...preset,name:label,flushControlsSeparated:true}) : WallHungToiletNode.parse({...preset,name:label,flushControlsSeparated:true})
const toilet = draft.type === 'bath-space:floor-standing-toilet'
  ? FloorStandingToiletNode.parse({...draft,...floorPlacement(draft,wall,1,'front')})
  : WallHungToiletNode.parse({...draft,...wallPlacement(draft,wall,1,'front')})
const layout = toilet.type === 'bath-space:floor-standing-toilet' ? floorLayout(toilet) : wallLayout(toilet)
site.children=[building.id];site.name='Bath Space thumbnail studio'
building.children=[level.id];building.name='Toilet thumbnail studio'
level.children=[floor.id,wall.id];level.name=`${preset.label} toilet thumbnail`;level.baseElevation=0
floor.name='Studio floor';floor.polygon=[[-1.4,-0.15],[1.4,-0.15],[1.4,1.5],[-1.4,1.5]]
wall.children=[toilet.id]
const control = toilet.tankType === 'concealed' ? null : defaultToiletControl(toilet,{[wall.id]:wall})
if(control)toilet.children=[control.id]
graph.nodes=Object.fromEntries([site,building,level,floor,wall,toilet,...(control?[control]:[])].map(n=>[n.id,n]))
graph.rootNodeIds=[site.id]
const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bath Space — toilet thumbnail studio',graph,expectedVersion:old.version})})
if(!response.ok)throw new Error(await response.text())
const targetY = family === 'wall' ? 0.39 : layout.totalHeight / 2
const distance = Math.max(1.65, layout.totalHeight * 1.8)
console.log(JSON.stringify({family,key,label,toiletId:toilet.id,preset,node:toilet,camera:{eye:[distance*0.67,targetY+distance*0.34,distance],target:[0,targetY,layout.projection/2+0.06]},version:(await response.json()).version}))
