import fs from 'node:fs'
import sharp from 'sharp'
const B = process.argv[2]
const jobs = [
  ['favicon-light.svg', 'favicon-16.png', 16], ['favicon-light.svg', 'favicon-32.png', 32],
  ['app-icon.svg', 'apple-touch-icon.png', 180], ['app-icon.svg', 'icon-192.png', 192], ['app-icon.svg', 'icon-512.png', 512],
  ['app-icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['lockup-color.svg', 'lockup-color@2x.png', null, 160], ['lockup-reversed.svg', 'lockup-reversed@2x.png', null, 160],
  ['mark-color.svg', 'mark-color-1024.png', 1024],
]
for (const [src, out, size, h] of jobs) {
  // Render at 2x the target from the SVG's own viewBox, then downsample (crisp, bounded memory).
  const vb = fs.readFileSync(`${B}/${src}`, 'utf8').match(/viewBox="([^"]+)"/)[1].split(' ').map(Number)
  const density = Math.min(2400, 72 * 2 * (size ? size / vb[3] : h / vb[3]))
  const img = sharp(`${B}/${src}`, { density })
  await (size ? img.resize(size, size) : img.resize({ height: h })).png({ compressionLevel: 9 }).toFile(`${B}/${out}`)
}
console.log('png done')
