import type { MirrorNode } from './schema'
import { mirrorProjection, mirrorOutline } from './geometry'
import { sectionDimension as dim, sectionDetail as detail, sectionRect as rect, type SectionModel } from '../section/fields'
export function mirrorSection(n: MirrorNode): SectionModel {
 const outline=(width:number,height:number)=>`M${mirrorOutline(n,width,height).getPoints(64).map(point=>`${point.x+n.width/2},${n.height/2-point.y}`).join('L')}Z`
 const height=n.shape==='round'?n.width:n.height, projection=mirrorProjection(n), total=n.mountingHeight+height/2
 const dimensions=[dim('width',n.shape==='round'?'Diameter':'Width',n.width,.3,2.4,.01,'plan','x'),{...dim('depth','Depth',n.depth,.01,.08,.001,'plan','y',projection),spanOffset:n.wallGap+n.glassThickness},{...dim('mountingHeight','Centre height from floor',n.mountingHeight,0,5,.01),start:total,direction:-1 as const}]
 if(n.shape!=='round')dimensions.push({...dim('height','Height',height,.3,2.4,.01),start:height,direction:-1})
 if(n.frameEnabled) dimensions.push(detail('frameWidth','Frame width',n.frameWidth,0,.08,.001))
 dimensions.push(detail('glassThickness','Glass thickness',n.glassThickness,.003,.01,.001),detail('wallGap','Wall gap',n.wallGap,0,.06,.001))
 return {drawing:{width:n.width,depth:projection,height:total,fixtureHeight:height,plan:rect(0,0,n.width,projection),section:outline(n.width,height),detail:n.frameEnabled?outline(n.width-2*n.frameWidth,height-2*n.frameWidth):undefined,floor:true},dimensions}
}
