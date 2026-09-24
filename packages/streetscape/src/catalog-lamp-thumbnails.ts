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
    <linearGradient id="acornGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffbed"/>
      <stop offset=".42" stop-color="#f2dfaf"/>
      <stop offset=".72" stop-color="#c3ccca"/>
      <stop offset="1" stop-color="#778287"/>
    </linearGradient>
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

const lantern = (x: number, baseY: number, scale = 1) => `
  <path d="M${x - 11 * scale} ${baseY - 158 * scale}h${22 * scale}l${-4 * scale} ${15 * scale}h${-14 * scale}z" fill="#171c20"/>
  <circle cx="${x}" cy="${baseY - 137 * scale}" r="${9 * scale}" fill="#30383e" stroke="#151a1e" stroke-width="${3 * scale}"/>
  <path d="M${x - 50 * scale} ${baseY - 106 * scale}  ${x} ${baseY - 132 * scale}  ${x + 50 * scale} ${baseY - 106 * scale}z" fill="url(#housing)" stroke="#171c20" stroke-width="${5 * scale}" stroke-linejoin="round"/>
  <path d="M${x - 57 * scale} ${baseY - 108 * scale}h${114 * scale}v${10 * scale}h${-114 * scale}z" fill="#20262b" stroke="#11161a" stroke-width="${3 * scale}"/>
  <path d="M${x - 40 * scale} ${baseY - 98 * scale}  ${x + 40 * scale} ${baseY - 98 * scale}  ${x + 48 * scale} ${baseY - 21 * scale}  ${x - 48 * scale} ${baseY - 21 * scale}z" fill="url(#lens)" opacity=".76" stroke="#242b30" stroke-width="${5 * scale}"/>
  <ellipse cx="${x}" cy="${baseY - 58 * scale}" rx="${16 * scale}" ry="${24 * scale}" fill="#fff8d8" opacity=".88"/>
  <path d="M${x - 40 * scale} ${baseY - 98 * scale}  ${x - 48 * scale} ${baseY - 21 * scale}M${x + 40 * scale} ${baseY - 98 * scale}  ${x + 48 * scale} ${baseY - 21 * scale}M${x} ${baseY - 98 * scale}v${77 * scale}" fill="none" stroke="#232a2f" stroke-width="${6 * scale}"/>
  <path d="M${x - 52 * scale} ${baseY - 21 * scale}h${104 * scale}l${-9 * scale} ${15 * scale}h${-86 * scale}z" fill="#20262b" stroke="#11161a" stroke-width="${3 * scale}"/>
  <path d="M${x - 20 * scale} ${baseY - 5 * scale}h${40 * scale}l${-6 * scale} ${14 * scale}h${-28 * scale}z" fill="#2f383e"/>`

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
    ${pole(320, 270, 535, 30)}
    <path d="M282 535h76l-8-32h-60z" fill="#20262b"/>
    <path d="M292 511h56l-9-26h-38z" fill="#3f4950" stroke="#20262b" stroke-width="5"/>
    <path d="M296 455h48M299 441h42M302 281h36" stroke="#1d2328" stroke-width="11" stroke-linecap="round"/>
    ${lantern(320, 281, 1.2)}`,
  globe: `
    <path d="M270 538h100l-10-28h-80z" fill="#20262b" stroke="#11161a" stroke-width="5"/>
    <path d="M280 510 290 430h60l10 80z" fill="url(#metal)" stroke="#20262b" stroke-width="6"/>
    ${[298, 309, 320, 331, 342].map((x) => `<path d="M${x} 438v62" stroke="#6a747b" stroke-width="5" stroke-linecap="round" opacity=".62"/>`).join('')}
    <ellipse cx="320" cy="431" rx="35" ry="12" fill="#20262b" stroke="#566069" stroke-width="5"/>
    <path d="M306 430 311 306h18l5 124z" fill="url(#metal)" stroke="#20262b" stroke-width="5"/>
    <path d="M290 318h60l-8 22h-44z" fill="#252c32" stroke="#151a1e" stroke-width="5"/>
    <ellipse cx="320" cy="314" rx="39" ry="13" fill="#58636b" stroke="#20262b" stroke-width="6"/>
    <path d="M286 308h68l-13-30h-42z" fill="url(#housing)" stroke="#1d2328" stroke-width="6"/>
    <ellipse cx="320" cy="278" rx="27" ry="10" fill="#22282d" stroke="#5d6870" stroke-width="5"/>
    <path d="M300 278 292 254h56l-8 24z" fill="#252c32" stroke="#171c20" stroke-width="5"/>
    <path d="M303 258
             C278 244 263 221 262 194
             C260 153 282 116 312 94
             Q320 86 328 94
             C358 116 380 153 378 194
             C377 221 362 244 337 258
             Z" fill="url(#acornGlass)" stroke="#30383d" stroke-width="7"/>
    <path d="M306 242h28v-78q0-18-14-18t-14 18z" fill="#fff0c2" opacity=".58" stroke="#7b817d" stroke-width="4"/>
    <path d="M320 96v160
             M298 112q-16 50-8 105q3 21 17 37
             M342 112q16 50 8 105q-3 21-17 37
             M280 143q-12 49 8 91
             M360 143q12 49-8 91" fill="none" stroke="#f4f0df" stroke-width="3.5" opacity=".72"/>
    <path d="M270 172q50 17 100 0M265 199q55 18 110 0M275 226q45 17 90 0" fill="none" stroke="#69747a" stroke-width="3" opacity=".58"/>
    <ellipse cx="320" cy="258" rx="19" ry="7" fill="#252c32"/>
    <circle cx="320" cy="86" r="8" fill="#252c32" stroke="#5c666d" stroke-width="4"/>
    <circle cx="296" cy="488" r="4" fill="#151a1e"/>
    <circle cx="344" cy="488" r="4" fill="#151a1e"/>`,
  candelabra: `
    ${pole(320, 292, 535, 30)}
    <path d="M276 535h88l-10-37h-68z" fill="#20262b" stroke="#11161a" stroke-width="5"/>
    <path d="M286 500 295 430h50l9 70z" fill="url(#metal)" stroke="#20262b" stroke-width="5"/>
    ${[300, 310, 320, 330, 340].map((x) => `<path d="M${x} 442v47" stroke="#69747b" stroke-width="4" stroke-linecap="round" opacity=".7"/>`).join('')}
    <path d="M292 430h56M300 414h40M303 366h34" stroke="#20262b" stroke-width="11" stroke-linecap="round"/>
    <circle cx="320" cy="306" r="18" fill="#293138" stroke="#171c20" stroke-width="5"/>
    <path d="M319 306C270 281 233 280 190 312" fill="none" stroke="#252c32" stroke-width="15" stroke-linecap="round"/>
    <path d="M321 306C370 281 407 280 450 312" fill="none" stroke="#252c32" stroke-width="15" stroke-linecap="round"/>
    <path d="M310 331C274 358 239 350 222 318" fill="none" stroke="#30383e" stroke-width="8" stroke-linecap="round"/>
    <path d="M330 331C366 358 401 350 418 318" fill="none" stroke="#30383e" stroke-width="8" stroke-linecap="round"/>
    <circle cx="222" cy="318" r="12" fill="none" stroke="#30383e" stroke-width="7"/>
    <circle cx="418" cy="318" r="12" fill="none" stroke="#30383e" stroke-width="7"/>
    <path d="M320 306V252" stroke="#252c32" stroke-width="16" stroke-linecap="round"/>
    ${lantern(190, 307, .68)}
    ${lantern(450, 307, .68)}
    ${lantern(320, 252, .78)}`,
  path: `
    <path d="M271 536h98l-10-27h-78z" fill="#202723" stroke="#111714" stroke-width="5"/>
    <ellipse cx="320" cy="509" rx="42" ry="11" fill="#4b554f" stroke="#222925" stroke-width="5"/>
    <path d="M296 509 304 239h32l8 270z" fill="url(#metal)" stroke="#202723" stroke-width="6"/>
    <rect x="326" y="361" width="20" height="70" rx="5" fill="#414a44" stroke="#202723" stroke-width="4"/>
    <path d="M300 260h40l13-42h-66z" fill="#303833" stroke="#202723" stroke-width="6"/>
    <path d="M305 238 238 197M335 238l67-41" fill="none" stroke="#3a433d" stroke-width="11" stroke-linecap="round"/>
    <rect x="118" y="163" width="190" height="70" rx="10" fill="url(#housing)" stroke="#1c2320" stroke-width="7"/>
    <rect x="332" y="163" width="190" height="70" rx="10" fill="url(#housing)" stroke="#1c2320" stroke-width="7"/>
    <rect x="137" y="214" width="153" height="15" rx="4" fill="url(#lens)" stroke="#b9aa89" stroke-width="4"/>
    <rect x="350" y="214" width="153" height="15" rx="4" fill="url(#lens)" stroke="#b9aa89" stroke-width="4"/>
    <path d="M120 176h-13v45h13M520 176h13v45h-13" fill="none" stroke="#161c19" stroke-width="9"/>
    <circle cx="320" cy="221" r="24" fill="#303833" stroke="#171d1a" stroke-width="6"/>
    <path d="M155 240 92 354M485 240l63 114" stroke="#ffd88d" stroke-width="32" opacity=".2" stroke-linecap="round"/>`,
  bollard: `
    <ellipse cx="320" cy="536" rx="79" ry="18" fill="#171c20" opacity=".35"/>
    <path d="M264 535h112l-8-25h-96z" fill="#20262a" stroke="#11161a" stroke-width="5"/>
    <ellipse cx="320" cy="510" rx="48" ry="12" fill="#6d777d" stroke="#20262b" stroke-width="5"/>
    <path d="M278 510 289 247h62l11 263z" fill="url(#metal)" stroke="#20272b" stroke-width="6"/>
    <path d="M348 412h-20v-92h23" fill="#252c30" stroke="#171c20" stroke-width="5"/>
    <circle cx="344" cy="340" r="4" fill="#aeb6ba"/><circle cx="344" cy="395" r="4" fill="#aeb6ba"/>
    <rect x="286" y="166" width="68" height="90" rx="8" fill="url(#lens)" stroke="#30383d" stroke-width="5"/>
    <rect x="312" y="177" width="16" height="69" rx="7" fill="#fff4d2" opacity=".86"/>
    ${[184, 207, 230].map((y) => `<ellipse cx="320" cy="${y}" rx="46" ry="10" fill="#31393e" stroke="#1a2024" stroke-width="5"/>`).join('')}
    <path d="M272 162h96l-7 27h-82z" fill="url(#housing)" stroke="#1b2125" stroke-width="6"/>
    <ellipse cx="320" cy="162" rx="43" ry="11" fill="#59636a" stroke="#20272b" stroke-width="5"/>
    <path d="M283 256h74" stroke="#171c20" stroke-width="8"/>
    <circle cx="289" cy="519" r="5" fill="#11161a"/><circle cx="351" cy="519" r="5" fill="#11161a"/>`,
  catenary: `
    <path d="M91 535h88l-8-26h-72zM461 535h88l-8-26h-72z" fill="#20272c" stroke="#11161a" stroke-width="5"/>
    <path d="M107 509 119 147h32l12 362zM477 509l12-362h32l12 362z" fill="url(#metal)" stroke="#20272b" stroke-width="6"/>
    <circle cx="112" cy="519" r="5" fill="#90999e"/><circle cx="158" cy="519" r="5" fill="#90999e"/>
    <circle cx="482" cy="519" r="5" fill="#90999e"/><circle cx="528" cy="519" r="5" fill="#90999e"/>
    <path d="M104 164h60v-45h-60zM476 164h60v-45h-60z" fill="#3c464c" stroke="#1b2125" stroke-width="5"/>
    <circle cx="134" cy="141" r="9" fill="#90999e" stroke="#20272b" stroke-width="4"/>
    <circle cx="506" cy="141" r="9" fill="#90999e" stroke="#20272b" stroke-width="4"/>
    <path d="M134 141Q320 244 506 141" fill="none" stroke="#1b2126" stroke-width="9" stroke-linecap="round"/>
    <circle cx="274" cy="211" r="12" fill="none" stroke="#8d969b" stroke-width="7"/>
    <circle cx="366" cy="211" r="12" fill="none" stroke="#8d969b" stroke-width="7"/>
    <path d="M274 220 296 267M366 220l-22 47M296 267h48" fill="none" stroke="#5d6870" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M291 267h58l-9 22h-40z" fill="#606b72" stroke="#242b30" stroke-width="5"/>
    <path d="M217 315Q222 291 253 278h134q31 13 36 37l-12 47H229z" fill="url(#housing)" stroke="#20272b" stroke-width="7" stroke-linejoin="round"/>
    <path d="M239 348h162l-8 21H247z" fill="#c3cacc" stroke="#4c565d" stroke-width="5"/>
    <rect x="258" y="349" width="52" height="20" rx="8" fill="url(#lens)" stroke="#6c767b" stroke-width="4"/>
    <rect x="330" y="349" width="52" height="20" rx="8" fill="url(#lens)" stroke="#6c767b" stroke-width="4"/>
    ${[268, 280, 292, 340, 352, 364].map((cx) => `<circle cx="${cx}" cy="359" r="3.5" fill="#fff5d6"/>`).join('')}
    <path d="M273 296h94" stroke="#7c878e" stroke-width="5" stroke-linecap="round"/>
    <circle cx="247" cy="321" r="5" fill="#a2aaae"/><circle cx="393" cy="321" r="5" fill="#a2aaae"/>`,
  'wall-arm': `
    <path d="M72 108h54v423H72z" fill="#7d898f" opacity=".55"/>
    <path d="M91 108h35v423H91z" fill="#aab3b7" opacity=".35"/>
    <rect x="120" y="209" width="38" height="205" rx="9" fill="url(#housing)" stroke="#161c20" stroke-width="6"/>
    <rect x="154" y="241" width="21" height="142" rx="5" fill="#4a555c" stroke="#20272c" stroke-width="4"/>
    ${[258, 364].flatMap((y) => [132, 148].map((x) => `<circle cx="${x}" cy="${y}" r="6" fill="#151a1e" stroke="#738087" stroke-width="2"/>`)).join('')}
    <path d="M170 255L419 222 428 252 170 288Z" fill="url(#metal)" stroke="#20272c" stroke-width="6" stroke-linejoin="round"/>
    <path d="M170 358Q286 361 420 246" fill="none" stroke="#3f4a51" stroke-width="15" stroke-linecap="round"/>
    <circle cx="419" cy="244" r="18" fill="#252d32" stroke="#11161a" stroke-width="6"/>
    <path d="M394 217Q436 194 524 201L572 222 554 258Q472 274 398 255Z" fill="url(#housing)" stroke="#171d21" stroke-width="6" stroke-linejoin="round"/>
    <path d="M425 251Q482 264 546 247L532 270Q479 283 430 270Z" fill="url(#lens)" stroke="#343d42" stroke-width="4"/>
    ${[445, 479, 513].map((x) => `<rect x="${x}" y="255" width="23" height="10" rx="4" fill="#fff2c8" opacity=".92"/>`).join('')}
    ${[420, 444, 468, 492, 516].map((x) => `<path d="M${x} 211l6 39" stroke="#252d32" stroke-width="5" stroke-linecap="round"/>`).join('')}
    <circle cx="415" cy="216" r="7" fill="#162127"/>
    <path d="M403 284Q484 309 554 274" fill="none" stroke="#ffd88d" stroke-width="14" opacity=".24"/>`,
  'wall-pack': `
    <path d="M92 96h116v448H92z" fill="#7e8a90" opacity=".64"/>
    <path d="M121 96h87v448h-87z" fill="#aab4b8" opacity=".34"/>
    <rect x="192" y="207" width="46" height="211" rx="8" fill="#252b2f" stroke="#14191c" stroke-width="6"/>
    ${[227, 399].flatMap((y) => [207, 224].map((x) => `<circle cx="${x}" cy="${y}" r="5" fill="#111518" stroke="#69747a" stroke-width="2"/>`)).join('')}
    <path d="M219 216H441L526 276 486 381H219Z" fill="url(#housing)" stroke="#171d21" stroke-width="7" stroke-linejoin="round"/>
    <path d="M236 231H435L491 273" fill="none" stroke="#7b878d" stroke-width="7" opacity=".55"/>
    ${[268, 309, 350, 391, 432].map((x) => `<path d="M${x} 225l58 50" stroke="#2a3135" stroke-width="7" stroke-linecap="round"/>`).join('')}
    <circle cx="420" cy="223" r="12" fill="#182329" stroke="#758087" stroke-width="4"/>
    <path d="M245 358 478 353 459 394 262 396Z" fill="#141a1d" stroke="#2d3539" stroke-width="5"/>
    <path d="M268 365 455 362 445 385 277 387Z" fill="url(#lens)" stroke="#c7b98f" stroke-width="4"/>
    ${[298, 335, 372, 409, 440].flatMap((x) => [371, 382].map((y) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff7d8" opacity=".94"/>`)).join('')}
    <circle cx="494" cy="318" r="8" fill="#121719" stroke="#7b878d" stroke-width="3"/>
    <path d="M275 406Q373 440 466 401" fill="none" stroke="#ffd88d" stroke-width="22" opacity=".22"/>`,
  tunnel: `
    <path d="M86 178h468v44H86z" fill="#7c878d"/>
    <path d="M112 215h416" stroke="#363e43" stroke-width="9" opacity=".55"/>
    <path d="M191 216v56M449 216v56" stroke="#3b4449" stroke-width="13"/>
    <path d="M169 270h302l21 25-22 88H170l-22-88z" fill="url(#housing)" stroke="#22292e" stroke-width="7"/>
    <path d="M176 282h288M171 298h298M169 315h302" stroke="#8d989e" stroke-width="7" stroke-linecap="round" opacity=".72"/>
    <rect x="176" y="322" width="288" height="22" rx="5" fill="url(#lens)" stroke="#343d42" stroke-width="5"/>
    <rect x="176" y="353" width="288" height="22" rx="5" fill="url(#lens)" stroke="#343d42" stroke-width="5"/>
    <path d="M174 348h292" stroke="#333b40" stroke-width="9"/>
    ${[200, 248, 296, 344, 392, 440].flatMap((x) => [333, 364].map((y) => `<circle cx="${x}" cy="${y}" r="6" fill="#f7fbff" stroke="#7d8b93" stroke-width="3"/>`)).join('')}
    <path d="M148 316h-34" stroke="#11171b" stroke-width="17" stroke-linecap="round"/>
    <circle cx="109" cy="316" r="13" fill="#257ca3" stroke="#172026" stroke-width="6"/>
    <path d="M163 374h314" stroke="#20272b" stroke-width="9"/>
    <ellipse cx="320" cy="444" rx="177" ry="20" fill="#252c31" opacity=".16"/>`,
  canopy: `
    <path d="M80 130h480v78H80z" fill="#b2b9bb" stroke="#69747a" stroke-width="7"/>
    <path d="M96 202h448" stroke="#747f84" stroke-width="13"/>
    <path d="M205 193h230l22 19-19 150H202l-19-19z" fill="#d9dcdb" stroke="#4d585e" stroke-width="8" stroke-linejoin="round"/>
    <path d="M227 226h186l14 12-12 112H225l-12-12z" fill="#171c1f" stroke="#6e797f" stroke-width="5"/>
    <path d="M242 244h70v88h-70zM328 244h70v88h-70z" fill="url(#lens)" stroke="#acb6b9" stroke-width="5"/>
    <path d="M320 241v94" stroke="#283035" stroke-width="10"/>
    ${[258, 277, 296, 344, 363, 382].flatMap((x) => [261, 286, 313].map((y) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff9e4" opacity=".97"/>`)).join('')}
    <circle cx="320" cy="329" r="10" fill="#17303b" stroke="#5d8998" stroke-width="4"/>
    <path d="M224 386Q320 434 416 386" fill="none" stroke="#ffd88d" stroke-width="38" opacity=".2"/>
    <ellipse cx="320" cy="457" rx="174" ry="22" fill="#252c31" opacity=".13"/>`,
}

const descriptions: Record<CatalogLampProjection, [string, string]> = {
  'high-mast': ['High-mast lowering crown', 'A tapered mast with a serviceable carrier ring and six LED luminaires.'],
  shoebox: ['LED area pole', 'A square parking-area pole with one low-profile multi-cell LED luminaire.'],
  floodlight: ['Floodlight pole', 'A braced pole with an adjustable yoke-mounted LED projector.'],
  solar: ['Solar street lamp', 'A single-sided roadway pole with one photovoltaic all-in-one luminaire.'],
  lantern: ['Traditional lantern', 'A pitched-roof post-top lantern.'],
  globe: ['Globe / acorn post-top lamp', 'A fluted civic post with a prismatic acorn refractor and cast fitter.'],
  candelabra: ['Decorative candelabra lamp', 'A raised centre lantern with twin cast scroll arms.'],
  path: ['Twin-head path and garden lamp', 'A substantial architectural path light with two opposed warm pools.'],
  bollard: ['Shielded bollard lamp', 'A louvered architectural marker light with glare-controlled 360° illumination.'],
  catenary: ['Catenary street lamp', 'A twin-optic roadway luminaire on an adjustable wire suspension.'],
  'wall-arm': ['Architectural wall-arm', 'A tapered lateral bracket with a low-profile LED roadway head.'],
  'wall-pack': ['Full-cutoff wall pack', 'A slim, facade-mounted LED bulkhead with a shielded downward optic.'],
  tunnel: ['Tunnel / underpass LED', 'A sealed dual-optic line with quick-fit ceiling clips.'],
  canopy: ['Recessed canopy light', 'A compact sealed twin-module fixture mounted directly under a ceiling.'],
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
