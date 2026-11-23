// Genera les icones PNG (manifest PWA i Apple) a partir de public/icons/logo.svg.
// Quan hi hagi la icona definitiva: substitueix el SVG i torna a córrer
// `npm run icons`.
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync(new URL('../public/icons/logo.svg', import.meta.url))
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

for (const size of [192, 512]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(`icon-${size}.png`))
}
// «maskable»: el sistema retalla en cercle; deixem marge (zona segura del 80%).
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#B23A2B' } })
  .composite([{ input: await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'))
await sharp(svg, { density: 384 }).resize(180, 180).flatten({ background: '#B23A2B' }).png().toFile(out('apple-touch-icon.png'))
console.log('Icones generades a public/icons/')
