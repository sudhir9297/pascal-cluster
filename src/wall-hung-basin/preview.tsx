import type { WallHungBasinNode } from '../countertop-basin/schema'

export function WallBasinPreview({ design }: { design: WallHungBasinNode['wallDesign'] }) {
  const curved = design === 'classic' || design === 'sculpted'
  return <svg aria-hidden="true" viewBox="0 0 112 96" className="h-full w-full p-2 text-foreground/85" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 8v64l70 15V21Z" fill="currentColor" fillOpacity="0.035" strokeOpacity="0.2" />
    <path d={curved ? 'M20 25 69 15 94 30Q96 52 57 54Q27 54 20 40Z' : 'M20 25 69 15 95 29 96 49 49 63 20 44Z'} fill="currentColor" fillOpacity="0.1" />
    <path d={curved ? 'M20 25Q32 47 58 44Q86 44 94 30' : 'M20 25 49 44 95 29M49 44v19'} />
    <path d={curved ? 'M31 27 67 20 85 30Q73 43 53 38Q40 36 31 27Z' : 'M31 27 67 20 83 30 50 40Z'} fill="currentColor" fillOpacity="0.06" />
    <ellipse cx="56" cy="34" rx="3.5" ry="1.6" />
    <path d="M65 22v-7l-7-2v6" strokeOpacity="0.6" />
    {design === 'sculpted' ? <path d="M32 48 38 73Q54 84 70 73L77 48M38 73l20 3 12-3" fill="currentColor" fillOpacity="0.07" />
      : design === 'shallow' ? <path d="M56 52v19m-5-4v10h10V67m0 4 24-7m0-4v8" />
      : <><path d="M56 59v14q0 13 10 7l8-11 12-4" strokeWidth={design === 'box' ? 4 : 2.8} />
        {design === 'box' && <path d="m53 64 6 1m-6 3 6 1m-6 3 6 1m-4 3 6 1m-3 3 6-1m-1-3 6 2m-3-5 6 2" strokeWidth="1" />}
        <ellipse cx="86" cy="65" rx="2" ry="5" /></>}
  </svg>
}
