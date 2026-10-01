'use client'
import { useSyncExternalStore } from 'react'
import type { ShowerHeadNode } from './schema'
let style:ShowerHeadNode['style']='round-rain'
const listeners=new Set<()=>void>()
export function setShowerHeadStyle(next:ShowerHeadNode['style']){style=next;for(const listener of listeners)listener()}
export function useShowerHeadStyle(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener)}},()=>style,()=> 'round-rain' as const)}
