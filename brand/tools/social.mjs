// Twitter/X profile picture + header, built from the same geometry as the mark.
// Usage: node social.mjs ..   (writes brand/social/*.svg and *.png)
import fs from 'node:fs'
import sharp from 'sharp'
import opentype from 'opentype.js'

const B = process.argv[2]
const OUT = `${B}/social`
fs.mkdirSync(OUT, { recursive: true })

const INK = '#17213D', INK_MUTED = '#4F5D7A', LIT = '#4262D4', LIT_ON_INK = '#8FA6F0'
const CELL = 12, GAP = 2.5, PITCH = CELL + GAP, R = 3, POP = 4

// Board cells (col,row); (2,0) is the slot the lit cell popped out of.
const BOARD = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]
const mark = (x, y, k, ink, lit) =>
  BOARD.map(([c, r]) => rect(x + c * PITCH * k, y + r * PITCH * k, CELL * k, R * k, ink)).join('') +
  rect(x + (2 * PITCH + POP) * k, y - POP * k, CELL * k, R * k, lit)
const rect = (x, y, s, r, fill) =>
  `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+s.toFixed(2)}" height="${+s.toFixed(2)}" rx="${+r.toFixed(2)}" fill="${fill}"/>`

const buf = fs.readFileSync(new URL('./PlusJakartaSans-Bold.ttf', import.meta.url))
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
// Manual layout (charToGlyph + pair kerning): this font's GSUB tables trip opentype.js shaping.
function layout(s, x, y, size, tracking, draw) {
  const glyphs = [...s].map((c) => font.charToGlyph(c)), scale = size / font.unitsPerEm
  glyphs.forEach((g, i) => {
    if (draw) draw(g.getPath(x, y, size))
    const next = glyphs[i + 1]
    x += (g.advanceWidth + (next ? font.getKerningValue(g, next) : 0)) * scale + tracking * size
  })
  return x
}
const text = (s, x, y, size, fill, tracking = 0) => {
  let d = ''
  layout(s, x, y, size, tracking, (p) => (d += p.toPathData(2)))
  return `<path d="${d}" fill="${fill}"/>`
}
const width = (s, size, tracking = 0) => layout(s, 0, 0, size, tracking) - tracking * size

// ---------- Profile picture (square, X crops it to a circle) ----------
function pfp(bg, ink, lit) {
  const S = 400, k = 5 // mark spans 45 units -> 225px, ~56% of the circle
  const span = (2 * PITCH + CELL + POP) * k // board width plus pop
  const x = (S - span) / 2
  const y = (S - span) / 2 + POP * k
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    `<rect width="${S}" height="${S}" fill="${bg}"/>${mark(x, y, k, ink, lit)}</svg>`
}

// ---------- Header (1500x500) ----------
function header() {
  const W = 1500, H = 500, k = 6, P = PITCH * k
  // Board top-left; the mark (pop included) is centred vertically on the canvas.
  const ox = 1062, oy = H / 2 - ((3 * PITCH - GAP) * k - POP * k) / 2
  // Also keep clear space around the popped lit cell.
  const taken = new Set([...BOARD.map(([c, r]) => `${c},${r}`), '2,0', '3,0', '2,-1', '3,-1'])
  // Faint field of empty cells around the board, stepping lighter with distance (flat tints, no gradients).
  const tints = [[1.5, '#DDE6F0'], [2.5, '#E6EDF5'], [3.5, '#EEF2F8'], [4.6, '#F4F7FB']]
  let field = ''
  for (let r = -3; r <= 6; r++) for (let c = -2; c <= 6; c++) {
    if (taken.has(`${c},${r}`)) continue
    const dc = c < 0 ? -c : c > 2 ? c - 2 : 0, dr = r < 0 ? -r : r > 2 ? r - 2 : 0
    const d = Math.hypot(dc, dr), t = tints.find(([m]) => d <= m)
    if (t) field += rect(ox + c * P, oy + r * P, CELL * k, R * k, t[1])
  }

  // Copy block, left side, kept above the avatar overlap (bottom-left ~380x170).
  const tx = 112
  const eyebrow = text('BLITZ ROUND · ON BOT CHAIN', tx, 150, 17, INK_MUTED, 0.3)
  const l1 = text('Sixty seconds.', tx, 238, 72, INK, -0.035)
  const l2 = text('Every tap on-chain.', tx, 316, 72, LIT, -0.035)
  // No wordmark here: the display name already says BOT Blitz and the avatar carries the mark.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>${field}${mark(ox, oy, k, INK, LIT)}${eyebrow}${l1}${l2}</svg>`
}

const jobs = [
  ['twitter-pfp', pfp('#FFFFFF', INK, LIT), 1000],
  ['twitter-pfp-dark', pfp(INK, '#FFFFFF', LIT_ON_INK), 1000],
  ['twitter-header', header(), 3000],
]
for (const [name, svg, px] of jobs) {
  fs.writeFileSync(`${OUT}/${name}.svg`, svg)
  const vbW = +svg.match(/viewBox="0 0 (\d+)/)[1]
  await sharp(Buffer.from(svg), { density: 72 * (px / vbW) }).resize({ width: px }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`)
}
console.log('social done', width('Every tap on-chain.', 72, -0.035).toFixed(0))
