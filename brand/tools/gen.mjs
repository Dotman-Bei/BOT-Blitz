// BOT Blitz logo generator. One geometry spec -> every asset. Flat colour only, no gradients.
import fs from 'node:fs'
import opentype from 'opentype.js'
const OUT = process.argv[2]
const INK = '#17213D', LIT = '#4262D4', WHITE = '#FFFFFF'
const f2 = (n) => +n.toFixed(2)

// ---------------------------------------------------------------- mark geometry (48-unit grid)
// 3x3 board, 12u cells, 2.5u gaps. The lit cell has "jumped" +4,-4 out of its slot: a tap, confirmed.
const S = 12, G = 2.5, R = 3, POP = 4
const X = [2, 2 + S + G, 2 + 2 * (S + G)], Y = [6, 6 + S + G, 6 + 2 * (S + G)]
const cell = (x, y, s, r, fill) => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(s)}" height="${f2(s)}" rx="${r}" fill="${fill}"/>`
function markBody(ink, lit) {
  let o = ''
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (!(i === 2 && j === 0)) o += cell(X[i], Y[j], S, R, ink)
  return o + cell(X[2] + POP, Y[0] - POP, S, R, lit)
}
// Compact mark: the same silhouette with the gaps closed - for 16-24px, where gaps turn to mush.
function compactBody(ink, lit) {
  const L = 2, T = 6, Rt = 43, B = 47, nx = X[2] - G, ny = Y[0] + S + G, r = 3.2, ri = 2
  const d = `M${L + r} ${T} H${nx - r} Q${nx} ${T} ${nx} ${T + r} V${ny - ri} Q${nx} ${ny} ${nx + ri} ${ny} H${Rt - r} Q${Rt} ${ny} ${Rt} ${ny + r} V${B - r} Q${Rt} ${B} ${Rt - r} ${B} H${L + r} Q${L} ${B} ${L} ${B - r} V${T + r} Q${L} ${T} ${L + r} ${T} Z`
  const ps = Rt - nx // piece = notch size, moved by the same pop offset
  return `<path d="${d}" fill="${ink}"/>` + cell(nx + POP, T - POP, ps, 3.2, lit)
}
// Favicon: the compact mark redrawn on a 16px grid so every edge lands on a whole pixel (crisp at 16 and 32).
// Board 12x12 at (1,4); notch 5x5 in its top-right; the lit piece is the notch moved +2,-2.
function pixelBody(inkAttr, litAttr) {
  const d = 'M2 4 H8 V9 H13 V15 Q13 16 12 16 H2 Q1 16 1 15 V5 Q1 4 2 4 Z'
  return `<path d="${d}" ${inkAttr}/><rect x="10" y="2" width="5" height="5" rx="1" ${litAttr}/>`
}
const svg = (vb, body, title, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}"${extra}><title>${title}</title>${body}</svg>\n`

// ---------------------------------------------------------------- wordmark (outlined Plus Jakarta Sans Bold)
// Plus Jakarta Sans Bold (SIL OFL 1.1) - fetched by `npm run fetch-font`, not committed.
const buf = fs.readFileSync(new URL('./PlusJakartaSans-Bold.ttf', import.meta.url))
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
const UPM = 1000, TRACK = -20 // -0.02em
function glyphPath(g, x) {
  // font units, y-up -> svg y-down with baseline at 0
  return g.getPath(x, 0, UPM).toPathData(1)
}
function wordmark(ink, lit) {
  const text = 'BOT Blitz'
  let x = 0, d = '', dotCell = ''
  const glyphs = [...text].map((c) => font.charToGlyph(c))
  glyphs.forEach((g, k) => {
    if (text[k] === 'i') {
      // Keep the stem, replace the round tittle with a square "lit cell" that has popped up and right.
      const p = g.getPath(x, 0, UPM)
      const contours = []; let cur = []
      for (const c of p.commands) { if (c.type === 'M' && cur.length) { contours.push(cur); cur = [] } cur.push(c) }
      if (cur.length) contours.push(cur)
      const minY = (cs) => Math.min(...cs.filter((c) => 'y' in c).map((c) => c.y))
      contours.sort((a, b) => minY(b) - minY(a)) // svg y-down: the dot has the smallest y -> last
      const stem = contours[0]
      const sp = new opentype.Path(); sp.commands = stem.flat(); d += sp.toPathData(1)
      const bb = g.getBoundingBox(), cx = x + (bb.x1 + bb.x2) / 2, side = 168
      const popX = 30, popY = 30 // echo the mark's +4,-4 pop, scaled
      dotCell = `<rect x="${f2(cx - side / 2 + popX)}" y="${f2(-590 - side - popY + 20)}" width="${side}" height="${side}" rx="34" fill="${lit}"/>`
    } else if (text[k] !== ' ') {
      d += glyphPath(g, x)
    }
    const next = glyphs[k + 1]
    x += g.advanceWidth + TRACK + (next ? font.getKerningValue(g, next) : 0)
    if (text[k] === ' ') x += 30 // open the word space so BOT and Blitz never fuse at small sizes
  })
  return { body: `<path d="${d}" fill="${ink}"/>${dotCell}`, width: x - TRACK }
}
// Measure wordmark bbox for the viewBox.
function bboxOfBody(body) { return body }
const wm = wordmark(INK, LIT)
const CAP = 745, TOP = -(590 + 168 + 30 - 20) - 10, BOTTOM = 20, WL = 0
const wmVB = `${WL - 10} ${TOP} ${f2(wm.width + 20)} ${f2(BOTTOM - TOP)}`

// ---------------------------------------------------------------- lockup: mark height tied to cap height
function lockup(bodyMark, bodyWord, vbExtra = 0) {
  const markH = CAP * 1.36 // mark (48u) scaled so its board spans ~cap height + the pop above
  const k = markH / 48
  const gap = markH * 0.3
  const my = -CAP - (markH - CAP) * 0.62 // align board bottom to baseline-ish, pop rises above cap
  const wx = markH + gap
  const w = wx + wm.width
  const top = Math.min(my, TOP), bottom = Math.max(my + markH, BOTTOM)
  return svg(`-10 ${f2(top - 10)} ${f2(w + 20)} ${f2(bottom - top + 20)}`,
    `<g transform="translate(0 ${f2(my)}) scale(${f2(k)})">${bodyMark}</g><g transform="translate(${f2(wx)} 0)">${bodyWord}</g>`,
    'BOT Blitz')
}

// ---------------------------------------------------------------- write
const W = (name, s) => fs.writeFileSync(`${OUT}/${name}`, s)
const variants = { color: [INK, LIT], ink: [INK, INK], white: [WHITE, WHITE] }
for (const [v, [ink, lit]] of Object.entries(variants)) {
  W(`mark-${v}.svg`, svg('0 0 48 48', markBody(ink, lit), 'BOT Blitz'))
  W(`mark-compact-${v}.svg`, svg('0 0 48 48', compactBody(ink, lit), 'BOT Blitz'))
  const w = wordmark(ink, lit)
  W(`wordmark-${v}.svg`, svg(wmVB, w.body, 'BOT Blitz'))
  W(`lockup-${v}.svg`, lockup(markBody(ink, lit), w.body))
}
// Colour on dark: white board, lit cell keeps its indigo? Indigo on navy is 2.9:1 - use a lighter lit tint.
const LIT_ON_DARK = '#8FA6F0'
W('mark-reversed.svg', svg('0 0 48 48', markBody(WHITE, LIT_ON_DARK), 'BOT Blitz'))
W('lockup-reversed.svg', lockup(markBody(WHITE, LIT_ON_DARK), wordmark(WHITE, LIT_ON_DARK).body))
// Favicon: compact mark, adapts to dark browser chrome.
W('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><style>.i{fill:${INK}}.l{fill:${LIT}}@media (prefers-color-scheme:dark){.i{fill:${WHITE}}.l{fill:${LIT_ON_DARK}}}</style>${pixelBody('class="i"', 'class="l"')}</svg>
`)
W('favicon-light.svg', svg('0 0 16 16', pixelBody(`fill="${INK}"`, `fill="${LIT}"`), 'BOT Blitz'))
// App icon: primary mark centred on the haze tile (no gradient; the OS rounds the corners).
W('app-icon.svg', svg('0 0 512 512', `<rect width="512" height="512" fill="#EDF2F7"/><g transform="translate(96 96) scale(${f2(320 / 48)})">${markBody(INK, LIT)}</g>`, 'BOT Blitz'))
W('app-icon-maskable.svg', svg('0 0 512 512', `<rect width="512" height="512" fill="#EDF2F7"/><g transform="translate(136 136) scale(${f2(240 / 48)})">${markBody(INK, LIT)}</g>`, 'BOT Blitz'))
console.log('wordmark width', f2(wm.width))

// ---------------------------------------------------------------- data module for the web app
if (process.argv[3]) {
  const w = wordmark('INK', 'LIT')
  const pathD = w.body.match(/<path d="([^"]+)"/)[1]
  const dot = w.body.match(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" rx="([^"]+)"/)
  const lock = lockup('MARK', 'WORD')
  const vb = lock.match(/viewBox="([^"]+)"/)[1]
  const markT = lock.match(/<g transform="([^"]+)">MARK/)[1]
  const wordT = lock.match(/<g transform="([^"]+)">WORD/)[1]
  const cells = []
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (!(i === 2 && j === 0)) cells.push([X[i], Y[j]])
  fs.writeFileSync(process.argv[3], `// Generated by the brand generator (see brand/README.md). Do not edit by hand.
export const CELL = { size: ${S}, radius: ${R} } as const
export const BOARD_CELLS: readonly (readonly [number, number])[] = ${JSON.stringify(cells)}
/** The lit cell, popped +${POP},-${POP} out of its slot at (${X[2]}, ${Y[0]}). */
export const LIT_CELL = { x: ${X[2] + POP}, y: ${Y[0] - POP}, slotX: ${X[2]}, slotY: ${Y[0]} } as const
export const WORDMARK = {
  viewBox: '${wmVB}',
  path: '${pathD}',
  dot: { x: ${dot[1]}, y: ${dot[2]}, size: ${dot[3]}, rx: ${dot[5]} },
} as const
export const LOCKUP = { viewBox: '${vb}', markTransform: '${markT}', wordTransform: '${wordT}' } as const
`)
}
