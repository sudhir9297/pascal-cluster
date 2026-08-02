import type { CatalogLampProjection } from './catalog-lamp-config'

const frame = (title: string, description: string, body: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${description}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#edf2f5"/>
      <stop offset="1" stop-color="#cbd5dc"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#151a1f"/>
      <stop offset=".5" stop-color="#606b74"/>
      <stop offset="1" stop-color="#252c32"/>
    </linearGradient>
    <linearGradient id="housing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#65727b"/>
      <stop offset="1" stop-color="#252c32"/>
    </linearGradient>
    <linearGradient id="lens" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff4c7"/>
      <stop offset="1" stop-color="#d69a43"/>
    </linearGradient>
    <radialGradient id="globe">
      <stop offset="0" stop-color="#fff8da"/>
      <stop offset=".72" stop-color="#d8dfe0"/>
      <stop offset="1" stop-color="#7c878b"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-50%" width="160%" height="210%">
      <feGaussianBlur stdDeviation="11"/>
    </filter>
  </defs>
  <rect width="640" height="640" rx="44" fill="url(#bg)"/>
  <ellipse cx="320" cy="558" rx="150" ry="28" fill="#4c5962" opacity=".22" filter="url(#shadow)"/>
  ${body}
</svg>`

const pole = (x = 320, top = 155, bottom = 535, width = 28) => `
  <path d="M${x - width / 2} ${bottom} ${x - width * 0.34} ${top}h${width * 0.68}L${x + width / 2} ${bottom}z" fill="url(#metal)"/>
  <path d="M${x - width * 1.8} ${bottom + 3}h${width * 3.6}l-${width * 0.48} -25h-${width * 2.64}z" fill="#232a30"/>
  <ellipse cx="${x}" cy="${bottom - 24}" rx="${width * 1.55}" ry="10" fill="#56616a"/>
  <circle cx="${x - width * 0.7}" cy="${bottom - 8}" r="7" fill="#11161b"/>
  <circle cx="${x + width * 0.7}" cy="${bottom - 8}" r="7" fill="#11161b"/>`

const boxHead = (x: number, y: number, width = 110, height = 44) => `
  <rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="8" fill="url(#housing)"/>
  <rect x="${x - width * 0.38}" y="${y + height * 0.26}" width="${width * 0.76}" height="10" rx="3" fill="url(#lens)"/>
  <path d="M${x - width * 0.43} ${y - height * 0.28}h${width * 0.86}" stroke="#87939b" stroke-width="6" opacity=".5"/>
  <path d="M${x - width * 0.5} ${y - height / 2}v${height}M${x + width * 0.5} ${y - height / 2}v${height}" stroke="#1b2126" stroke-width="7" opacity=".7"/>`

const areaHead = (x: number, y: number) => `
  <path d="M${x - 92} ${y - 10}  ${x - 66} ${y - 18}  ${x + 78} ${y - 14}  ${x + 94} ${y - 3}  ${x + 82} ${y + 15}  ${x - 74} ${y + 17}z" fill="url(#housing)" stroke="#20272d" stroke-width="5"/>
  <path d="M${x - 53} ${y + 12}h126l-11 17h-106z" fill="#cfd6d9" stroke="#394147" stroke-width="4"/>
  ${[x - 35, x - 4, x + 27, x + 58].flatMap((cellX) => [y + 17, y + 25].map((cellY) => `<circle cx="${cellX}" cy="${cellY}" r="7" fill="url(#lens)" stroke="#f8f2d4" stroke-width="2"/>`)).join('')}
  ${[x - 42, x - 20, x + 2, x + 24, x + 46].map((finX) => `<path d="M${finX} ${y - 15}v-12" stroke="#3e474e" stroke-width="7" stroke-linecap="round"/>`).join('')}
  <circle cx="${x - 66}" cy="${y - 20}" r="8" fill="#2a3136"/>`

const lantern = (x: number, y: number, scale = 1) => `
  <path d="M${x - 30 * scale} ${y - 8 * scale}h${60 * scale}l${-10 * scale} ${15 * scale}h${-40 * scale}z" fill="#20262b"/>
  <path d="M${x - 24 * scale} ${y + 8 * scale}q0 ${48 * scale} ${24 * scale} ${60 * scale}q${24 * scale} ${-12 * scale} ${24 * scale} ${-60 * scale}z" fill="url(#globe)" stroke="#252b30" stroke-width="6"/>
  <path d="M${x - 17 * scale} ${y + 16 * scale}h${34 * scale}M${x - 17 * scale} ${y + 48 * scale}h${34 * scale}M${x - 8 * scale} ${y + 10 * scale}v${54 * scale}M${x + 8 * scale} ${y + 10 * scale}v${54 * scale}" stroke="#31383d" stroke-width="5"/>
  <path d="M${x - 13 * scale} ${y + 69 * scale}h${26 * scale}l-${7 * scale} ${14 * scale}h-${12 * scale}z" fill="#20262b"/>`

const bodies: Record<CatalogLampProjection, string> = {
  'high-mast': `
    ${pole(320, 150, 535, 34)}
    <ellipse cx="320" cy="168" rx="104" ry="34" fill="none" stroke="#3c464d" stroke-width="13"/>
    <path d="M320 108v58M302 123l-70 43M338 123l70 43" fill="none" stroke="#252d33" stroke-width="6"/>
    <path d="M288 118h64l-10-17h-44z" fill="#5e6970" stroke="#242b30" stroke-width="5"/>
    <circle cx="320" cy="164" r="23" fill="#4b555c" stroke="#20272d" stroke-width="6"/>
    ${[0, 60, 120, 180, 240, 300].map((angle) => {
      const radians = (angle * Math.PI) / 180
      const armX = 320 + Math.cos(radians) * 102
      const armY = 168 + Math.sin(radians) * 34
      const x = 320 + Math.cos(radians) * 155
      const y = 168 + Math.sin(radians) * 45
      return `<path d="M${armX} ${armY} ${x} ${y}" stroke="#465159" stroke-width="10" stroke-linecap="round"/>
        <g transform="rotate(${angle} ${x} ${y})">
          <path d="M${x - 38} ${y - 12}h61l15 8-7 19h-65l-12-9z" fill="url(#housing)" stroke="#20272d" stroke-width="4"/>
          <path d="M${x - 18} ${y + 10}h45l-5 8h-37z" fill="url(#lens)" stroke="#e8dcc0" stroke-width="2"/>
          <path d="M${x - 17} ${y - 13}v-8M${x - 3} ${y - 13}v-8M${x + 11} ${y - 12}v-8" stroke="#414a50" stroke-width="5"/>
        </g>`
    }).join('')}`,
  shoebox: `
    ${pole(320, 153, 535, 30)}
    <path d="M320 160h58" stroke="#252c32" stroke-width="18" stroke-linecap="square"/>
    <path d="M320 160v44" stroke="#252c32" stroke-width="23"/>
    <path d="M350 152h28v31h-28z" fill="#252c32"/>
    ${areaHead(455, 166)}`,
  floodlight: `
    ${pole(250, 153, 535, 30)}
    <path d="M250 171h174" stroke="#252c32" stroke-width="18" stroke-linecap="round"/>
    <path d="M250 214 372 171" stroke="#414a51" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="421" cy="171" rx="17" ry="22" fill="#1b2126"/>
    <path d="M405 170 432 133 528 151 542 199 514 238 414 218z" fill="none" stroke="#1a2025" stroke-width="11" stroke-linejoin="round"/>
    <path d="M428 140 520 157 532 198 508 228 419 211z" fill="url(#housing)" stroke="#20272d" stroke-width="5"/>
    <path d="M443 158 505 169 513 196 497 214 436 202z" fill="#c7cfd2" stroke="#69747b" stroke-width="5"/>
    ${[0, 1, 2, 3].flatMap((column) => [0, 1, 2].map((row) => {
      const x = 451 + column * 15 + row * 1.4
      const y = 169 + row * 13 + column * 2.7
      return `<circle cx="${x}" cy="${y}" r="5" fill="url(#lens)" stroke="#fff6d2" stroke-width="1.5"/>`
    })).join('')}
    ${[449, 465, 481, 497, 513].map((x) => `<path d="M${x} 148l7 52" stroke="#1d2429" stroke-width="5" stroke-linecap="round" opacity=".72"/>`).join('')}
    <circle cx="423" cy="179" r="10" fill="#151a1e" stroke="#7c878e" stroke-width="4"/>
    <path d="M421 218h76" stroke="#171c21" stroke-width="8" stroke-linecap="round"/>`,
  solar: `
    ${pole(320, 165, 535, 30)}
    <g>
      <path d="M320 176Q365 111 410 145" fill="none" stroke="#252c32" stroke-width="18" stroke-linecap="round"/>
      <path d="M378 124 493 130 525 150 510 185 397 181 373 157z" fill="url(#housing)" stroke="#20272d" stroke-width="7" stroke-linejoin="round"/>
      <path d="M390 128 489 133 509 147 397 143z" fill="#101d38" stroke="#8b949d" stroke-width="5" stroke-linejoin="round"/>
      <path d="m410 129-1 15m20-14-1 15m20-14-1 15m20-14-1 15M394 135l108 6" stroke="#aeb9ca" stroke-width="2.5" opacity=".9"/>
      <path d="m445 158 57 3-7 19-54-2z" fill="#dce3e5" stroke="#7c878d" stroke-width="4"/>
      <circle cx="410" cy="166" r="7" fill="#20272b" stroke="#748087" stroke-width="3"/>
    </g>`,
  lantern: `
    ${pole(320, 164, 535, 30)}
    <path d="M320 170v35" stroke="#252c32" stroke-width="17" stroke-linecap="round"/>
    ${lantern(320, 199, 1.25)}`,
  globe: `
    ${pole(320, 164, 535, 30)}
    <path d="M320 173v24" stroke="#252c32" stroke-width="17" stroke-linecap="round"/>
    <ellipse cx="320" cy="205" rx="64" ry="18" fill="#1f252a"/>
    <circle cx="320" cy="187" r="52" fill="url(#globe)" stroke="#252b30" stroke-width="8"/>
    <path d="M276 187h88M320 136v102" stroke="#454e55" stroke-width="5" opacity=".75"/>
    <path d="M300 239h40l-7 17h-26z" fill="#22282d"/>`,
  candelabra: `
    ${pole(320, 166, 535, 30)}
    <circle cx="320" cy="183" r="17" fill="#252c32"/>
    ${[210, 330, 90].map((angle) => {
      const radians = (angle * Math.PI) / 180
      const x = 320 + Math.cos(radians) * 96
      const y = 183 + Math.sin(radians) * 48
      return `<path d="M320 183 ${x} ${y}" stroke="#252c32" stroke-width="14" stroke-linecap="round"/>${lantern(x, y - 8, .58)}`
    }).join('')}`,
  path: `
    ${pole(320, 342, 535, 22)}
    <path d="M320 345v30" stroke="#252c32" stroke-width="12"/>
    <path d="M284 376h72l-12 18h-48z" fill="#293138"/>
    <ellipse cx="320" cy="396" rx="34" ry="10" fill="url(#lens)" stroke="#30383e" stroke-width="6"/>`,
  bollard: `
    <path d="M272 535 286 360h68l14 175z" fill="url(#metal)"/>
    <path d="M260 538h120l-16-25h-88z" fill="#232a30"/>
    <ellipse cx="320" cy="360" rx="36" ry="11" fill="#293137"/>
    <rect x="286" y="346" width="68" height="28" rx="8" fill="url(#lens)"/>
    <path d="M294 354h52" stroke="#fff7d5" stroke-width="5" opacity=".8"/>`,
  catenary: `
    ${pole(150, 145, 535, 27)}
    ${pole(490, 145, 535, 27)}
    <path d="M150 145Q320 240 490 145" fill="none" stroke="#1b2126" stroke-width="15" stroke-linecap="round"/>
    <path d="M320 220v70" stroke="#252c32" stroke-width="12"/>
    <circle cx="320" cy="221" r="12" fill="#11161b"/>
    ${boxHead(320, 325, 180, 62)}`,
  'wall-arm': `
    <rect x="112" y="120" width="42" height="380" rx="10" fill="#252c32"/>
    <circle cx="132" cy="158" r="9" fill="#11161b"/><circle cx="132" cy="462" r="9" fill="#11161b"/>
    <path d="M152 230Q260 180 465 178" fill="none" stroke="#252c32" stroke-width="25" stroke-linecap="round"/>
    <path d="M157 398Q205 260 260 216" fill="none" stroke="#4f5b64" stroke-width="13" stroke-linecap="round"/>
    ${boxHead(495, 183, 120, 46)}`,
  'wall-pack': `
    <rect x="154" y="122" width="34" height="382" rx="8" fill="#252c32"/>
    <circle cx="171" cy="159" r="8" fill="#11161b"/><circle cx="171" cy="467" r="8" fill="#11161b"/>
    <rect x="175" y="214" width="290" height="126" rx="14" fill="url(#housing)"/>
    <rect x="201" y="302" width="238" height="22" rx="6" fill="url(#lens)"/>
    <path d="M195 231h250" stroke="#89959d" stroke-width="8" opacity=".5"/>
    <path d="M182 350h276" stroke="#171c21" stroke-width="13"/>`,
  tunnel: `
    <path d="M92 160h456v46H92z" fill="#8c979d"/>
    <rect x="105" y="205" width="430" height="90" rx="10" fill="url(#housing)"/>
    <path d="M132 285h376l-20 25H152z" fill="#171c21"/>
    <rect x="154" y="287" width="332" height="18" rx="5" fill="url(#lens)"/>
    <path d="M124 210v77M516 210v77" stroke="#1a2025" stroke-width="12"/>
    <path d="M265 157v48M375 157v48" stroke="#252c32" stroke-width="15"/>
    ${pole(320, 310, 535, 28)}`,
  canopy: `
    <path d="M82 165h476v110H82z" fill="#8b969c"/>
    <rect x="120" y="242" width="400" height="94" rx="10" fill="url(#housing)"/>
    <rect x="170" y="320" width="300" height="18" rx="5" fill="url(#lens)"/>
    <path d="M154 333h332" stroke="#171c21" stroke-width="13"/>
    <path d="M220 166v75M420 166v75" stroke="#252c32" stroke-width="15"/>
    ${pole(320, 338, 535, 28)}`,
}

const descriptions: Record<CatalogLampProjection, [string, string]> = {
  'high-mast': ['High-mast lowering crown', 'A tapered mast with a serviceable carrier ring and six LED luminaires.'],
  shoebox: ['LED area pole', 'A square parking-area pole with one low-profile multi-cell LED luminaire.'],
  floodlight: ['Floodlight pole', 'A braced pole with an adjustable yoke-mounted LED projector.'],
  solar: ['Solar street lamp', 'A single-sided roadway pole with one photovoltaic all-in-one luminaire.'],
  lantern: ['Traditional lantern', 'A pitched-roof post-top lantern.'],
  globe: ['Globe post-top lamp', 'A civic post with a spherical illuminated globe.'],
  candelabra: ['Decorative candelabra lamp', 'A three-arm ornamental lantern pole.'],
  path: ['Path and garden lamp', 'A compact hooded light for paths and planting beds.'],
  bollard: ['Bollard lamp', 'A low cylindrical marker light for paths and plazas.'],
  catenary: ['Catenary street lamp', 'A suspended linear lamp between two support poles.'],
  'wall-arm': ['Wall-arm lamp', 'A facade-mounted outreach arm with a roadway head.'],
  'wall-pack': ['Wall-pack lamp', 'A compact direct-mount exterior bulkhead.'],
  tunnel: ['Tunnel luminaire', 'A linear fixture mounted below an underpass soffit.'],
  canopy: ['Canopy soffit lamp', 'A recessed broad-beam fixture under a canopy.'],
}

export const CATALOG_LAMP_THUMBNAILS = Object.fromEntries(
  (Object.keys(bodies) as CatalogLampProjection[]).map((projection) => {
    const [title, description] = descriptions[projection]
    return [projection, frame(title, description, bodies[projection])]
  }),
) as Record<CatalogLampProjection, string>

export function getCatalogLampThumbnail(projection: CatalogLampProjection): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CATALOG_LAMP_THUMBNAILS[projection])}`
}
