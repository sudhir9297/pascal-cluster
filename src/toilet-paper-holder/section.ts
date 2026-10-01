import {sectionDimension,sectionRect,sectionEllipse} from '../section/fields'
import type {ToiletPaperHolderNode} from './schema'
export function holderSection(n: ToiletPaperHolderNode) {
  const r=n.rollRadius, depth=n.projection+r+(n.shape==='covered'?0.0095:0.004), height=Math.max(0.05,2*r+n.paperLength)
  return {drawing:{width:n.width,depth,height,sectionWidth:depth,
    plan:sectionRect(0,0,n.width,0.009)+sectionRect(0.01,0,0.018,n.projection)+(n.shape==='open' ? '' : sectionRect(n.width-0.028,0,0.018,n.projection))+sectionRect(0.018,n.projection-0.008,n.width-0.036,0.016),
    planDetail:n.showRoll ? sectionRect((n.width-n.rollWidth)/2,n.projection-r,n.rollWidth,2*r) : '',
    section:sectionRect(0,r-0.025,0.009,0.05)+sectionRect(0,r-0.009,n.projection,0.018)+(n.showRoll ? sectionEllipse(2*r,2*r,n.projection-r,0)+sectionEllipse(0.036,0.036,n.projection-0.018,r-0.018)+`M${n.projection+r},${r}Q${n.projection+r},${r+n.paperLength/2} ${n.projection+r+0.004},${r+n.paperLength}` : '')+(n.shape==='covered' ? `M${n.projection-r-0.008},${r}A${r+0.008},${r+0.008} 0 0,1 ${n.projection+r+0.008},${r}` : '')},
    dimensions:[sectionDimension('width','Width',n.width,0.14,0.3,0.005,'plan','x'),sectionDimension('projection','Projection',n.projection,0.075,0.18,0.005,'section','x'),sectionDimension('rollWidth','Roll width',n.rollWidth,0.07,0.13,0.005,'plan','x'),sectionDimension('rollRadius','Roll radius',r,0.025,0.065,0.001),sectionDimension('paperLength','Paper length',n.paperLength,0,0.25,0.005)]}
}
