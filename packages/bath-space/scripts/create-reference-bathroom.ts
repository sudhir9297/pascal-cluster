import { SiteNode, BuildingNode, LevelNode, WallNode, SlabNode, DoorNode, WindowNode, ShelfNode, BlockNode, createBoxBlockTopology } from '@pascal-app/core'
import { WallMountedVanityNode } from '../src/freestanding-vanity/schema'
import { wallVanityPlacement } from '../src/freestanding-vanity/wall-placement'
import { CountertopBasinNode } from '../src/countertop-basin/schema'
import { TapNode } from '../src/taps/schema'
import { WallHungToiletNode } from '../src/wall-hung-toilet/schema'
import { toiletPlacement } from '../src/wall-hung-toilet/placement'
import { defaultToiletControl } from '../src/flush-control/attachment'
import { dividerSegment } from '../src/shower-divider/schema'
import { kitAnchor, createKitChanges, showerKitPresets } from '../src/shower-kit/bundle'
import { showerArmPlacement } from '../src/shower-arm/placement'
const nodes:any={}; const add=(n:any)=>{nodes[n.id]=n;const p=nodes[n.parentId];if(p?.children&&!p.children.includes(n.id))p.children.push(n.id);return n}
const site=add(SiteNode.parse({name:'Woodland bathroom reference'}));const building=add(BuildingNode.parse({name:'Bath Space reference room',parentId:site.id}));const level=add(LevelNode.parse({name:'Bathroom',parentId:building.id,height:2.5}));
const materials:any={};const mat=(id:string,color:string,roughness=.6,metalness=0,extra={})=>{materials[id]={id,name:id,material:{properties:{color,roughness,metalness,...extra}}};return 'scene:'+id};
const oak='library:wood-woodplank19', walnut='library:wood-finewood27';const cream=mat('Warm limestone','#d8c7a6',.82);const grout=mat('Tile grout','#9c927f',.9);const black=mat('Graphite trim','#292825',.48,.3);const chrome=mat('Polished chrome','#e2e1dc',.18,.9);const white=mat('Warm porcelain','#faf7ee',.22);const glass=mat('Clear shower glass','#dbe5e3',.08,0,{transparent:true,opacity:.18,side:'double'});const coral=mat('Coral towels','#e9987b',.96);const mirror=mat('Mirror surface','#e0e4e0',.02,1);
add(SlabNode.parse({name:'Bathroom floor',parentId:level.id,polygon:[[-2.1,0],[2.1,0],[2.1,3.6],[-2.1,3.6]],elevation:0,thickness:.08,slots:{surface:grout,side:cream}}));
for(let x=0;x<7;x++)for(let z=0;z<6;z++)add(SlabNode.parse({name:`Limestone tile ${x+1}-${z+1}`,parentId:level.id,polygon:[[-2.1+x*.6+.003,z*.6+.003],[-2.1+(x+1)*.6-.003,z*.6+.003],[-2.1+(x+1)*.6-.003,(z+1)*.6-.003],[-2.1+x*.6+.003,(z+1)*.6-.003]],elevation:.012,thickness:.008,slots:{surface:cream,side:cream}}));
const wall=(name:string,start:any,end:any)=>add(WallNode.parse({name,parentId:level.id,start,end,height:2.5,thickness:.12,slots:{interior:oak,exterior:oak}}));
const back=wall('Oak rear wall',[-2.1,0],[2.1,0]),left=wall('Oak window wall',[-2.1,3.6],[-2.1,0]),right=wall('Oak entrance wall',[2.1,0],[2.1,3.6]);
const box=(name:string,pos:any,size:any,material:string)=>add(BlockNode.parse({name,parentId:level.id,position:pos,topology:createBoxBlockTopology(...size),slots:{body:material}}));
box('Rear dark skirting',[0,0,.075],[4.08,.07,.025],black);box('Left dark skirting',[-2.025,0,1.8],[.025,.07,3.5],black);box('Right dark skirting',[2.025,0,1.8],[.025,.07,3.5],black);
add(DoorNode.parse({name:'Bathroom entrance',parentId:right.id,wallId:right.id,position:[2.55,1.05,0],width:.85,height:2.1,threshold:false,slots:{panel:white,frame:white,hardware:chrome}}));
add(WindowNode.parse({name:'Shower daylight window',parentId:left.id,wallId:left.id,position:[2.62,1.84,0],width:.65,height:.85,windowType:'louvered',slots:{frame:white,glass:glass}}));
let vanity=WallMountedVanityNode.parse({name:'Floating walnut vanity',height:.8,width:1.25,depth:.52,mountingHeight:.3,frontStyle:'flat',storageLayout:'custom',storageBays:[{id:'open',kind:'open',widthWeight:.65,shelves:0},{id:'drawer',kind:'drawers',widthWeight:1.35,drawerHeights:[1],shelves:0}],drawerRows:1,handleStyle:'bar',handleLength:.22,slots:{front:walnut,carcass:walnut,interior:walnut,countertop:white,hardware:chrome}});vanity=add(WallMountedVanityNode.parse({...vanity,...wallVanityPlacement(vanity,back,3.46,'front')}));
const basin=add(CountertopBasinNode.parse({name:'Round vessel basin',parentId:vanity.id,position:[.14,.8,-.035],shape:'round',width:.42,depth:.42,height:.14,slots:{bowl:white,drain:chrome}}));add(TapNode.parse({name:'Chrome arc basin mixer',parentId:basin.id,position:[0,0,.265],presetId:'tap-006',height:.31,reach:.18}));
let toilet=WallHungToiletNode.parse({name:'Wall hung rounded toilet',shape:'rounded',flushControlsSeparated:true});toilet=add(WallHungToiletNode.parse({...toilet,...toiletPlacement(toilet,back,2.27,'front')}));const control=defaultToiletControl(toilet,nodes);if(control)add(control);
const divider=dividerSegment([-.56,.08],[-.56,2.02],{parentId:level.id,height:2.25,frameWidth:.025,slots:{frame:black,glass}});if(divider)add(divider);
const preset=showerKitPresets[1]!;let anchor=kitAnchor(preset);anchor={...anchor,...showerArmPlacement(anchor,back,.72,'front')!};const kit=createKitChanges(preset,anchor,nodes);if(!kit)throw Error('Shower bundle failed');for(const c of kit.create)add({...c.node,metadata:{}});
add(ShelfNode.parse({name:'Rear bathroom ledge',parentId:level.id,position:[-.52,0,.17],width:2.75,depth:.22,height:1.12,thickness:.035,bracketStyle:'hidden',slots:{shelves:walnut,frame:walnut}}));
// Accessories remain ordinary editable blocks, explicitly named as approximations.
for(let i=0;i<3;i++)box('Folded coral towel approximation '+(i+1),[1.75,.805+i*.028,.4],[.3,.026,.26],coral);
box('Chrome towel rail approximation',[1.98,1.95,.52],[.025,.025,.62],chrome);for(const z of [.24,.8])box('Towel rail support',[1.91,1.93,z],[.16,.025,.025],chrome);
box('Toilet paper holder approximation',[-.27,.74,.17],[.13,.16,.09],white);
for(const [x,y,z] of [[-1.79,1.16,.16],[-.48,1.16,.16],[.85,.81,.22],[1.7,.81,.19]]){box('Toiletry bottle approximation',[x,y,z],[.065,.15,.065],white);box('Bottle cap',[x,y+.15,z],[.035,.025,.035],chrome)}
// Oval mirror: an editable extruded 48-sided block, rather than a new plugin fixture.
function oval(name:string,w:number,h:number,d:number,z:number,material:string){const vertices:any[]=[],edges:any[]=[],faces:any[]=[];const N=48;for(let layer=0;layer<2;layer++)for(let i=0;i<N;i++){const a=i*2*Math.PI/N;vertices.push({id:`v${layer*N+i}`,position:[w/2*Math.cos(a),h/2*Math.sin(a),layer*d]})}for(let i=0;i<N;i++){let j=(i+1)%N;for(let l=0;l<2;l++)edges.push({id:`e${l}-${i}`,vertexIds:[`v${l*N+i}`,`v${l*N+j}`]});edges.push({id:`s${i}`,vertexIds:[`v${i}`,`v${N+i}`]});faces.push({id:`side${i}`,vertexIds:[`v${i}`,`v${j}`,`v${N+j}`,`v${N+i}`],materialSlot:'body'})}faces.push({id:'front',vertexIds:Array.from({length:N},(_,i)=>`v${N+i}`),materialSlot:'body'},{id:'rear',vertexIds:Array.from({length:N},(_,i)=>`v${N-1-i}`),materialSlot:'body'});add(BlockNode.parse({name,parentId:level.id,position:[1.22,1.57,z],topology:{vertices,edges,faces},slots:{body:material}}))}
oval('Oval mirror black rim approximation',.67,.94,.025,.075,black);oval('Oval mirror polished face approximation',.635,.905,.008,.102,mirror);
vanity.storageBays.reverse();
for (const n of Object.values(nodes) as any[]) {
  if (n.name.startsWith('Limestone tile')) {const p=n.polygon;p[0][0]+=.008;p[0][1]+=.008;p[1][0]-=.008;p[1][1]+=.008;p[2][0]-=.008;p[2][1]-=.008;p[3][0]+=.008;p[3][1]-=.008;}
  if (['bath-space:tap','bath-space:shower-arm','bath-space:shower-head','bath-space:shower-mount','bath-space:hand-shower','bath-space:shower-hose','bath-space:shower-control'].includes(n.type)) n.slots=Object.fromEntries(['body','trim','handle','arm','flange','connector','face','nozzles','rail','slider','holder','outlet','hose','connectors','plate','controls','spout','aerator'].map(k=>[k,chrome]));
}
const graph={nodes,rootNodeIds:[site.id],collections:{},materials,installedPlugins:['pascal:bath-space']};
await Bun.write(new URL('../doc/reference-woodland-bathroom.scene.json',import.meta.url),JSON.stringify(graph,null,2));const res=await fetch('http://localhost:3002/api/scenes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bath Space · woodland reference bathroom',graph})});if(!res.ok)throw Error(await res.text());console.log(JSON.stringify(await res.json()));
