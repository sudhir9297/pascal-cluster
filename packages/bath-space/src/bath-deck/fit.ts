import type { AnyNode } from '@pascal-app/core'
import { BathtubNode, bathUsesDeck } from '../bathtub/schema'
import { BathDeckNode } from './schema'
import { deckBaths } from './geometry'
export function bathHalfBounds(bath: BathtubNode) {
  const c=Math.cos(bath.rotation),s=Math.sin(bath.rotation)
  if(bath.shape==='undermount'&&bath.builtInShape==='rectangle')return [Math.abs(c)*bath.length/2+Math.abs(s)*bath.width/2,Math.abs(s)*bath.length/2+Math.abs(c)*bath.width/2] as const
  return [Math.hypot(c*bath.length/2,s*bath.width/2),Math.hypot(s*bath.length/2,c*bath.width/2)] as const
}
export function bathDimensionLimits(bath:BathtubNode,deck:BathDeckNode|null) {
  const limits={length:2.2,width:bath.shape==='corner'?1.8:1.1,height:bath.shape==='walk-in'?1.15:0.75}
  if(!deck)return limits
  const c=Math.abs(Math.cos(bath.rotation)),s=Math.abs(Math.sin(bath.rotation))
  const ax=deck.length/2-0.04-Math.abs(bath.position[0]),az=deck.width/2-0.04-Math.abs(bath.position[2])
  const rectangle=bath.shape==='undermount'&&bath.builtInShape==='rectangle'
  const limit=(space:number,other:number,weight:number)=>weight<1e-8?Infinity:2*(rectangle?Math.max(0,space-other):Math.sqrt(Math.max(0,space*space-other*other)))/weight
  limits.length=Math.min(limits.length,limit(ax,s*bath.width/2,c),limit(az,c*bath.width/2,s))
  limits.width=Math.min(limits.width,limit(ax,c*bath.length/2,s),limit(az,s*bath.length/2,c))
  limits.height=Math.min(limits.height,deck.height+(bath.shape==='undermount'?-deck.thickness-0.002:0.025))
  return limits
}
export function fitBathToDeck(bath:BathtubNode,deck:BathDeckNode) {
  if(!bathUsesDeck(bath))return null
  const [hx,hz]=bathHalfBounds(bath)
  if(hx>deck.length/2-0.04+1e-8||hz>deck.width/2-0.04+1e-8||bath.height>deck.height+(bath.shape==='undermount'?-deck.thickness-0.002:0.025)+1e-8)return null
  return {...bath,position:[Math.max(-deck.length/2+0.04+hx,Math.min(deck.length/2-0.04-hx,bath.position[0])),0,Math.max(-deck.width/2+0.04+hz,Math.min(deck.width/2-0.04-hz,bath.position[2]))] as [number,number,number]}
}
export function deckMinimumDimensions(deck:BathDeckNode,children:readonly AnyNode[]) {
  const minimum={length:1.5,width:0.9,height:0.4}
  for(const bath of deckBaths(deck,children)) {
    const [hx,hz]=bathHalfBounds(bath)
    minimum.length=Math.max(minimum.length,2*(Math.abs(bath.position[0])+hx+0.04))
    minimum.width=Math.max(minimum.width,2*(Math.abs(bath.position[2])+hz+0.04))
    minimum.height=Math.max(minimum.height,bath.height+(bath.shape==='undermount'?deck.thickness+0.002:-0.025))
  }
  return minimum
}

export function deckMaximumThickness(deck:BathDeckNode,children:readonly AnyNode[]) {
  return Math.min(0.1,...deckBaths(deck,children).filter(bath=>bath.shape==='undermount').map(bath=>0.8-bath.height-0.002))
}
