import {SiteNode,BuildingNode,LevelNode,SlabNode,type AnyNode} from '@pascal-app/core'
import {FreestandingVanityNode,WallMountedVanityNode,CornerVanityNode} from '../src/freestanding-vanity/schema'
import {vanityPresets} from '../src/freestanding-vanity/presets'
export function vanityThumbnailGraph(item?:string){
 const site=SiteNode.parse({name:'Vanity thumbnail studio'}),building=BuildingNode.parse({name:'Bath Space',parentId:site.id}),level=LevelNode.parse({name:'One vanity at a time',parentId:building.id,height:2.8})
 const floor=SlabNode.parse({name:'Studio floor',parentId:level.id,polygon:[[-2,-1.5],[2,-1.5],[2,1.5],[-2,1.5]],thickness:.05,elevation:0})
 site.children=[building.id];building.children=[level.id];level.children=[floor.id]
 const nodes:Record<string,AnyNode>=Object.fromEntries([site,building,level,floor].map(n=>[n.id,n]))
 if(item){const [kind,design]=item.split('--');const preset=vanityPresets.find(p=>p.id===design);const schema=kind==='corner'?CornerVanityNode:kind==='wall'?WallMountedVanityNode:FreestandingVanityNode;const node=schema.parse({name:item,parentId:level.id,...(kind==='corner'?{}:preset?.settings)});nodes[node.id]=node as unknown as AnyNode;level.children.push(node.id)}
 return {nodes,rootNodeIds:[site.id],collections:{},materials:{},installedPlugins:['pascal:bath-space']}
}
export const vanityThumbnailItems=[...['freestanding','wall'].flatMap(kind=>vanityPresets.map(p=>`${kind}--${p.id}`)),'corner--angled']
