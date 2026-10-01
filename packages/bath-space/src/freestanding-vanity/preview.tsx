import {vanityPresets, type VanityPresetId} from './presets'
import {WALL_MOUNTED_VANITY,CORNER_VANITY,type VanityNode} from './schema'
const thumbnails={
  'freestanding--modern':new URL('./assets/freestanding--modern.png',import.meta.url).href,
  'freestanding--shaker':new URL('./assets/freestanding--shaker.png',import.meta.url).href,
  'freestanding--fluted':new URL('./assets/freestanding--fluted.png',import.meta.url).href,
  'freestanding--console':new URL('./assets/freestanding--console.png',import.meta.url).href,
  'wall--modern':new URL('./assets/wall--modern.png',import.meta.url).href,
  'wall--shaker':new URL('./assets/wall--shaker.png',import.meta.url).href,
  'wall--fluted':new URL('./assets/wall--fluted.png',import.meta.url).href,
  'wall--console':new URL('./assets/wall--console.png',import.meta.url).href,
  'corner--angled':new URL('./assets/corner--angled.png',import.meta.url).href,
} as const
export function VanityPreview({design='modern',wallMounted=false,corner=false}:{design?:VanityPresetId;wallMounted?:boolean;corner?:boolean}){
 const key=corner?'corner--angled':`${wallMounted?'wall':'freestanding'}--${design}` as keyof typeof thumbnails
 return <img src={thumbnails[key]} alt="" loading="lazy" className="h-full w-full object-contain" />
}
export function PlacedVanityPreview({node}:{node:VanityNode}){
 const preset=vanityPresets.find(p=>Object.entries(p.settings).every(([key,value])=>node[key as keyof VanityNode]===value))
 const design=preset?.id??(node.frontStyle==='fluted'?'fluted':node.storageLayout==='console'?'console':node.frontStyle==='shaker'?'shaker':'modern')
 return <VanityPreview design={design} wallMounted={node.type===WALL_MOUNTED_VANITY} corner={node.type===CORNER_VANITY}/>
}
