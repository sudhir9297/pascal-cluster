import { COUNTERTOP_BASIN, WALL_HUNG_BASIN, FULL_PEDESTAL_BASIN, HALF_PEDESTAL_BASIN, UNDERMOUNT_BASIN, DROP_IN_BASIN, SEMI_RECESSED_BASIN, type BasinNode } from './schema'
export type BasinSizeOption = {label:string;patch:Record<string,number>;source:string}
const catalogue='https://www.duravit.com/en-in/products/sink-area/sinks/countertop-sinks-and-wash-bowls/'
export function basinSizeOptions(node:BasinNode):BasinSizeOption[] {
 if(node.type===COUNTERTOP_BASIN){
  const sizes=node.shape==='round'?[[400,400],[430,430]]:node.shape==='rectangle'?[[400,400],[500,380],[600,380],[600,400]]:[[500,350],[500,400],[550,450],[700,400],[800,400]]
  return sizes.map(([w,d])=>({label:node.shape==='round'?`Ø ${w} mm`:`${w} × ${d} mm`,patch:{width:w!/1000,depth:d!/1000},source:node.shape==='round'?(w===400?'https://www.duravit.com/en-in/p/D-Neo-Washbowl-2371400070/':'https://pro.duravit.co.uk/pro/content/homepage/products/sizes/overview/products~402880943a1b6e1b013a1bd2b8e3005b.uk-en.html?ncat=washbasins&nser=0021&product=6437284'):catalogue}))
 }
 if([WALL_HUNG_BASIN,FULL_PEDESTAL_BASIN,HALF_PEDESTAL_BASIN].includes(node.type))return [{label:'550 × 430 mm',patch:{width:.55,depth:.43,height:.165},source:'https://pro.duravit.in/pro/content/homepage/products/sizes/overview/products~402880943a1b6e1b013a1bd2b8e3005b.in-en.html?ncat=washbasins&nser=0151&product=755545&sp=1'}]
 if(node.type===UNDERMOUNT_BASIN && node.shape!=='oval'){
  const [w,d,h,sku]=node.shape==='round'?[400,400,171,'2883']:[503,396,172,'2882']
  return [{label:`${w} × ${d} mm overall`,patch:{width:Number(w)/1000-2*node.flangeWidth,depth:Number(d)/1000-2*node.flangeWidth,height:Number(h)/1000},source:`https://techcomm.kohler.com/techcomm/pdf/K-${sku}_spec_${sku==='2883'?'IN':'US-CA'}_Kohler_en.pdf`}]
 }
 if(node.type===DROP_IN_BASIN && node.shape!=='round'){
  const [w,d,h,sku]=node.shape==='oval'?[514,445,187,'2196-4']:[575,494,200,'2356-4']
  return [{label:`${w} × ${d} mm overall`,patch:{width:Number(w)/1000-2*node.flangeWidth,depth:Number(d)/1000-2*node.flangeWidth,height:Number(h)/1000-node.rimHeight},source:`https://techcomm.kohler.com/techcomm/pdf/K-${sku}_spec_US-CA_Kohler_en.pdf`}]
 }
 if(node.type===SEMI_RECESSED_BASIN && node.shape==='oval')return [{label:'550 × 440 mm',patch:{width:.55,depth:.44,height:.2},source:'https://pro.duravit.co.uk/pro/content/homepage/products/sizes/overview/products~402880943a1b6e1b013a1bd2b8e3005b.uk-en.html?ncat=washbasins&nser=7120&product=94836&sp=1'}]
 if(node.type===UNDERMOUNT_BASIN && node.shape==='oval')return [{label:'433 × 352 mm overall',patch:{width:.433-2*node.flangeWidth,depth:.352-2*node.flangeWidth,height:.194},source:'https://techcomm.kohler.com/techcomm/pdf/K-2209_spec_US-CA_Kohler_en.pdf'}]
 if(node.type===DROP_IN_BASIN && node.shape==='round')return [{label:'Ø 483 mm overall',patch:{width:.483-2*node.flangeWidth,depth:.483-2*node.flangeWidth,height:.187-node.rimHeight},source:'https://techcomm.kohler.com/techcomm/pdf/K-2202-4_spec_US-CA_Kohler_en.pdf'}]
 if(node.type===SEMI_RECESSED_BASIN && node.shape==='rectangle')return [{label:'550 × 460 mm',patch:{width:.55,depth:.46},source:'https://www.duravit.com.au/basins/03765500002'},{label:'550 × 470 mm',patch:{width:.55,depth:.47,height:.17},source:'https://pro.duravit.at/pro/content/homepage/produkte/serien/uebersicht/produkt~402880943a1b6e1b013a1bd20b39003d.at-de.html?ncat=washbasins&nser=0202&product=115015&sp=1'}]
 return []
}

// Dimension references are sampled within each mounting family. They describe
// generic planning geometry, rather than reproducing a manufacturer's product.
export function basinDimensionSnapValues(node:BasinNode,key:string):number[] {
 const wall=[WALL_HUNG_BASIN,FULL_PEDESTAL_BASIN,HALF_PEDESTAL_BASIN].includes(node.type)
 if(key==='height'){
  if(wall)return [.165]
  if(node.type===UNDERMOUNT_BASIN)return [.171,.172,.191,.194]
  if(node.type===DROP_IN_BASIN)return [.187-node.rimHeight,.2-node.rimHeight]
  if(node.type===SEMI_RECESSED_BASIN)return [.17,.2]
  return [.125,.14,.15]
 }
 if(key==='totalHeight')return [.876]
 if(key==='elevation'){
  if(wall)return [.784,.863]
  const above=node.type===COUNTERTOP_BASIN?node.height:node.type===DROP_IN_BASIN?node.rimHeight:node.type===SEMI_RECESSED_BASIN?node.height-node.recessDepth:0
  return [.864-above]
 }
 let options=basinSizeOptions(node)
 if(!options.length){
  if(node.type===UNDERMOUNT_BASIN && node.shape==='round'){
   if(key==='width'||key==='depth')return [.4-2*node.flangeWidth,.43-2*node.flangeWidth]
  }
  const shape=node.type===DROP_IN_BASIN?'round':node.type===UNDERMOUNT_BASIN?'oval':'rectangle'
  options=basinSizeOptions({...node,shape})
 }
 return [...new Set(options.flatMap(option=>option.patch[key]===undefined?[]:[option.patch[key]!]))].sort((a,b)=>a-b)
}
