import { WallNode } from '@pascal-app/core'
import { WallFlushPlateNode, flushPlatePresets } from '../src/flush-control/schema'
import { flushPlatePlacement } from '../src/flush-control/placement'
const key = process.argv[2] ?? 'rectangle'
const url = 'http://localhost:3002/api/scenes/90469fd342d2'
const response = await fetch(url)
if (!response.ok) throw new Error(await response.text())
const old = await response.json()
const graph = old.graph
const find = (type: string) => Object.values(graph.nodes).find((n: any) => n.type === type) as any
const site = find('site'), building = find('building'), level = find('level'), floor = find('slab')
const wall = WallNode.parse({...find('wall'), name:'Thumbnail wall', start:[-1,0],end:[1,0],height:1.8,thickness:0.12,children:[]})
const preset = flushPlatePresets.find(p => p.shape === key)
if (!preset) throw new Error(`Unknown flush plate ${key}`)
const draft = WallFlushPlateNode.parse({...preset,name:preset.label,mountingHeight:1})
const plate = WallFlushPlateNode.parse({...draft,...flushPlatePlacement(draft,wall,1,'front')})
site.children=[building.id];building.children=[level.id]
level.children=[floor.id,wall.id];level.name=`${preset.label} thumbnail`;level.baseElevation=0
wall.children=[plate.id]
graph.nodes=Object.fromEntries([site,building,level,floor,wall,plate].map(n=>[n.id,n]))
graph.rootNodeIds=[site.id]
const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bath Space — flush plate thumbnail studio',graph,expectedVersion:old.version})})
if(!saved.ok)throw new Error(await saved.text())
console.log(JSON.stringify({key,label:preset.label,node:plate,camera:{eye:[0.25,1.13,0.65],target:[0,1,0.07]},version:(await saved.json()).version}))
