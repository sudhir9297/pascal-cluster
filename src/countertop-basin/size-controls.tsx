'use client'
import {createContext,useContext,useState,type ReactNode,type ComponentProps} from 'react'
import {useScene} from '@pascal-app/core'
import {SliderControl,PanelButton} from '../inspector-controls'
import {basinDimensionSnapValues} from './size-options'
import type {BasinNode} from './schema'
const SizeContext=createContext<{node:BasinNode;enabled:boolean;setEnabled:(value:boolean)=>void}|null>(null)
export const useBasinSizeContext=()=>useContext(SizeContext)
export function BasinSizingProvider({node,children}:{node:BasinNode;children:ReactNode}){
 const [enabled,setEnabled]=useState(true)
 return <SizeContext.Provider value={{node,enabled,setEnabled}}>{children}</SizeContext.Provider>
}
export function BasinSliderControl({dimensionKey,...props}:ComponentProps<typeof SliderControl>&{dimensionKey?:string}){
 const context=useBasinSizeContext()
 const readOnly=useScene(state=>state.readOnly)
 const key=dimensionKey
 const values=context&&key&&key!=='height'?basinDimensionSnapValues(context.node,key):[]
 const presets=key==='wallThickness'&&context?.node.type==='bath-space:countertop-basin'?[.005]:values
 const change=(value:number)=>{
  if(readOnly)return
  props.onChange(context?.enabled&&values.length?values.reduce((best,item)=>Math.abs(item-value)<Math.abs(best-value)?item:best):value)
 }
 return <div><SliderControl {...props} min={Math.min(props.min??0,...presets)} precision={Math.max(props.precision??2,...presets.map(value=>Number(value.toFixed(6)).toString().split('.')[1]?.length??0))} onChange={change}/>{presets.length>0&&<div className="flex flex-wrap gap-1 pb-2">{presets.map(value=><PanelButton key={value} disabled={readOnly} onClick={()=>props.onChange(value)}>{Number((value*1000).toFixed(1))} mm</PanelButton>)}</div>}</div>
}
