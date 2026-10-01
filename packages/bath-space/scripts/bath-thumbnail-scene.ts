import {SiteNode,BuildingNode,LevelNode,SlabNode,type AnyNode} from '@pascal-app/core'
import {BathtubNode,bathtubPresets,bathUsesDeck} from '../src/bathtub/schema'
import {dropInAssembly} from '../src/bath-deck/assembly'
export function bathThumbnailGraph(shape?:string){
 const site=SiteNode.parse({name:'Bath thumbnail studio'}),building=BuildingNode.parse({name:'Bath Space',parentId:site.id}),level=LevelNode.parse({name:'One bath at a time',parentId:building.id,height:2.8})
 const floor=SlabNode.parse({name:'Studio floor',parentId:level.id,polygon:[[-2,-1.5],[2,-1.5],[2,1.5],[-2,1.5]],thickness:.05,elevation:0})
 site.children=[building.id];building.children=[level.id];level.children=[floor.id]
 const nodes:Record<string,AnyNode>=Object.fromEntries([site,building,level,floor].map(n=>[n.id,n]))
 if(shape){const preset=bathtubPresets.find(p=>p.shape===shape);if(!preset)throw new Error('Unknown bath shape')
  const bath=BathtubNode.parse({shape:preset.shape,name:preset.label,...(shape==='walk-in'?{length:1.5,height:.99}:{}),...(shape==='corner'?{length:1.4,width:1.4}:{}),drainEnd:shape==='alcove'?'left':'center',tapMount:'none'})
  if(bathUsesDeck(bath)){const a=dropInAssembly(bath,level.id);a.deck.parentId=level.id;a.deck.children=[a.bath.id];nodes[a.deck.id]=a.deck as unknown as AnyNode;nodes[a.bath.id]=a.bath as unknown as AnyNode;level.children.push(a.deck.id)}else{bath.parentId=level.id;nodes[bath.id]=bath as unknown as AnyNode;level.children.push(bath.id)}
 }
 return {nodes,rootNodeIds:[site.id],collections:{},materials:{},installedPlugins:['pascal:bath-space']}
}
