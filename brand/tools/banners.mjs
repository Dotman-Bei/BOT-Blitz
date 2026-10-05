// In-feed post banners (1600x900, X's 16:9), one per mainnet launch post.
// Usage: node banners.mjs ..   (writes brand/social/posts/*.svg and *.png)
// Every figure here is a measured mainnet value from README "Deployment"; don't add unmeasured numbers.
import fs from 'node:fs'
import sharp from 'sharp'
import opentype from 'opentype.js'

const B = process.argv[2]
const OUT = `${B}/social/posts`
fs.mkdirSync(OUT, { recursive: true })

const INK = '#17213D', MUTED = '#4F5D7A', LIT = '#4262D4'
const HAZE = '#F5F9FC', LINE = '#E4EAFA', CELLTINT = '#E6EDF5'
const CELL = 12, GAP = 2.5, PITCH = CELL + GAP, R = 3, POP = 4
const W = 1600, H = 900, M = 96

const load = (f) => { const b = fs.readFileSync(new URL(f, import.meta.url)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) }
const BOLD = load('./PlusJakartaSans-Bold.ttf'), MED = load('./PlusJakartaSans-Medium.ttf')

const f2 = (n) => +n.toFixed(2)
const rect = (x, y, w, h, r, fill, stroke) =>
  `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" rx="${f2(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}/>`
const BOARD = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]
const mark = (x, y, k, ink = INK, lit = LIT) =>
  BOARD.map(([c, r]) => rect(x + c * PITCH * k, y + r * PITCH * k, CELL * k, CELL * k, R * k, ink)).join('') +
  rect(x + (2 * PITCH + POP) * k, y - POP * k, CELL * k, CELL * k, R * k, lit)

// Own serializer: opentype.js v2's toPathData emits NaN for some quadratic segments.
const n2 = (v) => +v.toFixed(2)
const pathData = (p) => p.commands.map((c) =>
  c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}`
    : c.type === 'C' ? `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}` : `${c.type}${n2(c.x)} ${n2(c.y)}`).join('')

// Manual layout (charToGlyph + pair kerning): this font's GSUB tables trip opentype.js shaping.
function layout(font, s, x, y, size, tracking, draw) {
  const glyphs = [...s].map((c) => font.charToGlyph(c)), scale = size / font.unitsPerEm
  glyphs.forEach((g, i) => {
    if (draw) draw(g.getPath(x, y, size))
    const next = glyphs[i + 1]
    x += (g.advanceWidth + ((next && font.getKerningValue(g, next)) || 0)) * scale + tracking * size
  })
  return x
}
const measure = (s, size, { font = BOLD, track = 0 } = {}) => layout(font, s, 0, 0, size, track) - track * size
function text(s, x, y, size, fill, { font = BOLD, track = 0, anchor = 'start' } = {}) {
  if (anchor === 'end') x -= measure(s, size, { font, track })
  if (anchor === 'middle') x -= measure(s, size, { font, track }) / 2
  let d = ''
  layout(font, s, x, y, size, track, (p) => (d += pathData(p)))
  return `<path d="${d}" fill="${fill}"/>`
}
const eyebrow = (s, x, y) => text(s.toUpperCase(), x, y, 18, MUTED, { track: 0.3 })
const HEAD = { track: -0.035 }

// Lockup from the brand file, placed by height.
const lockSrc = fs.readFileSync(`${B}/lockup-color.svg`, 'utf8').trim()
const lockVB = lockSrc.match(/viewBox="([^"]+)"/)[1], lockInner = lockSrc.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title>.*?<\/title>/, '')
const [, , lvw, lvh] = lockVB.split(' ').map(Number)
const lockup = (x, y, h) => `<svg x="${x}" y="${y}" width="${f2((h * lvw) / lvh)}" height="${h}" viewBox="${lockVB}">${lockInner}</svg>`

function pill(s, xRight, y) {
  const size = 18, w = measure(s, size, { track: 0.08 }) + 64, h = 44
  return rect(xRight - w, y, w, h, h / 2, HAZE, LINE) +
    rect(xRight - w + 22, y + h / 2 - 5, 10, 10, 3, LIT) +
    text(s, xRight - w + 44, y + h / 2 + 6.5, size, INK, { track: 0.08 })
}

// Frame shared by every banner: lockup, network pill, copy block, footer with the verified contract.
function frame({ kicker, l1, l2, body, visual }) {
  let o = rect(0, 0, W, H, 0, '#FFFFFF')
  o += lockup(M, 76, 46) + pill('BOT CHAIN MAINNET · 677', W - M, 77)
  o += eyebrow(kicker, M, 300)
  o += text(l1, M, 392, 76, INK, HEAD) + text(l2, M, 476, 76, LIT, HEAD)
  body.forEach((line, i) => (o += text(line, M, 556 + i * 40, 26, MUTED, { font: MED })))
  o += rect(M, 776, W - 2 * M, 2, 1, LINE)
  o += text('Contract 0x3d6F702BbF55dA10EAe0eC24ef4Cc262F3a71f3C', M, 832, 20, MUTED, { font: MED })
  o += text('Source verified on scan.botchain.ai', W - M, 832, 20, MUTED, { font: MED, anchor: 'end' })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${o}${visual}</svg>`
}

// Right-hand visual column.
const VX = 940, VW = W - M - VX, VY = 170

function card(x, y, w, h) { return rect(x, y, w, h, 32, HAZE, LINE) }
function rows(items, x, y, w, { gap = 72, labelSize = 24, valueSize = 24 } = {}) {
  return items.map(([label, value, hot], i) => {
    const yy = y + i * gap
    return (i ? rect(x, yy - gap / 2 - 1, w, 2, 1, LINE) : '') +
      text(label, x, yy + 8, labelSize, MUTED, { font: MED }) +
      text(value, x + w, yy + 8, valueSize, hot ? LIT : INK, { anchor: 'end' })
  }).join('')
}

// 1. Launch (thread opener): the mark large, in a faint field of board cells.
function vLaunch() {
  const k = 9, P = PITCH * k, ox = 1094, oy = 300
  const taken = new Set([...BOARD.map(([c, r]) => `${c},${r}`), '2,0', '3,0', '2,-1', '3,-1'])
  let o = ''
  for (let r = -1; r <= 3; r++) for (let c = -2; c <= 3; c++) {
    if (taken.has(`${c},${r}`)) continue
    const x = ox + c * P, y = oy + r * P
    if (x < VX - 10 || x + CELL * k > W - 40 || y < 150 || y + CELL * k > 750) continue
    o += rect(x, y, CELL * k, CELL * k, R * k, CELLTINT)
  }
  return o + mark(ox, oy, k)
}

// 2. Latency: one big measured number.
function vLatency() {
  const x = VX, y = VY + 30, w = VW, h = 540
  return card(x, y, w, h) +
    eyebrow('Median tap-to-receipt', x + 48, y + 74) +
    text('814', x + 48, y + 250, 168, INK, HEAD) +
    text('ms', x + 48 + measure('814', 168, HEAD) + 16, y + 250, 64, LIT, HEAD) +
    rows([['Fastest tap', '789 ms'], ['Slowest tap', '843 ms'], ['Gas price', '20 gwei']], x + 48, y + 352, w - 96)
}

// 3. Cost per tap.
function vCost() {
  const x = VX, y = VY + 30, w = VW, h = 540
  return card(x, y, w, h) +
    eyebrow('Cost of one scoring tap', x + 48, y + 74) +
    text('0.00085', x + 48, y + 206, 92, INK, HEAD) +
    text('BOT', x + 48 + measure('0.00085', 92, HEAD) + 12, y + 206, 38, LIT, HEAD) +
    rows([['Scoring tap', '42,395 gas'], ['Miss', '38,609 gas'], ['Full round, settled', '0.0112 BOT', true]], x + 48, y + 318, w - 96, { gap: 76 })
}

// 4. Rules the contract enforces, as their revert names.
function vRules() {
  const items = [
    ['StaleStep', 'A step can only score once'],
    ['RoundExpired', 'Nothing counts after 60 s'],
    ['OneActionPerBlock', 'Max one tap per block'],
    ['NotRoundOwner', 'Player or its session key only'],
  ]
  const x = VX, y = VY + 30, w = VW, rh = 118, g = 16
  return items.map(([err, desc], i) => {
    const yy = y + i * (rh + g)
    return card(x, yy, w, rh) + rect(x + 32, yy + 37, 44, 44, 11, i === 0 ? LIT : INK) +
      text(err, x + 100, yy + 54, 28, INK) + text(desc, x + 100, yy + 90, 21, MUTED, { font: MED })
  }).join('')
}

// 5. Leaderboard in contract storage: a schematic of the board, no player data.
function vBoard() {
  const x = VX, y = VY + 30, w = VW, h = 540
  let o = card(x, y, w, h) + eyebrow('On-chain leaderboard', x + 48, y + 74)
  const widths = [0.92, 0.8, 0.7, 0.58, 0.46]
  widths.forEach((f, i) => {
    const yy = y + 116 + i * 70
    o += text(`#${i + 1}`, x + 48, yy + 38, 26, i === 0 ? LIT : INK) +
      rect(x + 120, yy + 14, (w - 168) * f, 32, 10, i === 0 ? LIT : CELLTINT)
  })
  return o + text('Top 20, sorted on settle · no indexer', x + 48, y + h - 44, 22, MUTED, { font: MED })
}

// 6. Tests and verification.
function vTests() {
  const x = VX, y = VY + 30, w = VW, h = 540
  return card(x, y, w, h) +
    eyebrow('Foundry test suite', x + 48, y + 74) +
    text('27/27', x + 48, y + 224, 128, INK, HEAD) +
    text('passing', x + 48 + measure('27/27', 128, HEAD) + 18, y + 224, 36, LIT, HEAD) +
    rows([['Fuzz', 'score = correct taps'], ['Expiry edge', 'end − 1 scores, end reverts'], ['Deployed at block', '25,181,514']], x + 48, y + 330, w - 96, { gap: 76, valueSize: 22 })
}

const posts = [
  ['01-thread-launch', { kicker: 'Now live on mainnet', l1: 'BOT Blitz is live', l2: 'on BOT Chain.', body: ['A 60-second game where every tap is a', 'transaction and the contract keeps score.'], visual: vLaunch() }],
  ['02-latency', { kicker: 'Measured on mainnet', l1: 'The chain is', l2: 'the game loop.', body: ['The next cell lights only after the', 'previous tap is confirmed on-chain.'], visual: vLatency() }],
  ['03-cost', { kicker: 'Gas, measured at 20 gwei', l1: 'A transaction', l2: 'per tap. Cheap.', body: ['Session keys mean one wallet approval', 'per round, not one popup per tap.'], visual: vCost() }],
  ['04-rules', { kicker: 'Enforced by the contract', l1: 'Scores you', l2: 'can’t fake.', body: ['The player never sends a score. The', 'contract checks every tap and awards it.'], visual: vRules() }],
  ['05-leaderboard', { kicker: 'Architecture', l1: 'No backend.', l2: 'No indexer.', body: ['Bests, stats and the top-20 board live', 'in contract storage. Read them on BOTScan.'], visual: vBoard() }],
  ['06-tests', { kicker: 'Verification', l1: 'Tested, verified,', l2: 'deployed.', body: ['27 Foundry tests including fuzz. Same', 'source verified on testnet and mainnet.'], visual: vTests() }],
]

for (const [name, spec] of posts) {
  const svg = frame(spec)
  fs.writeFileSync(`${OUT}/${name}.svg`, svg)
  await sharp(Buffer.from(svg), { density: 144 }).resize({ width: 3200 }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`)
}
// Article cover (1500x600, X's 5:2 article header). Carries the required launch line verbatim.
function articleCover() {
  const CW = 1500, CH = 600, k = 7.2, P = PITCH * k, ox = 1080, oy = 210
  const taken = new Set([...BOARD.map(([c, r]) => `${c},${r}`), '2,0', '3,0', '2,-1', '3,-1'])
  let field = ''
  for (let r = -2; r <= 4; r++) for (let c = -2; c <= 4; c++) {
    if (taken.has(`${c},${r}`)) continue
    const x = ox + c * P, y = oy + r * P
    if (x < 900 || x + CELL * k > CW || y + CELL * k < 0 || y > CH) continue
    field += rect(x, y, CELL * k, CELL * k, R * k, CELLTINT)
  }
  let o = rect(0, 0, CW, CH, 0, '#FFFFFF') + field + mark(ox, oy, k)
  o += lockup(M, 72, 42)
  o += eyebrow('Announcement · Chain ID 677', M, 238)
  o += text('Officially launched', M, 322, 72, INK, HEAD) + text('on BOT Chain Mainnet.', M, 402, 72, LIT, HEAD)
  o += text('A 60-second game where every tap is a transaction', M, 470, 24, MUTED, { font: MED })
  o += text('and the contract keeps score.', M, 506, 24, MUTED, { font: MED })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">${o}</svg>`
}
{
  const svg = articleCover()
  fs.writeFileSync(`${OUT}/00-article-cover.svg`, svg)
  await sharp(Buffer.from(svg), { density: 144 }).resize({ width: 3000 }).png({ compressionLevel: 9 }).toFile(`${OUT}/00-article-cover.png`)
}
console.log('banners done')
