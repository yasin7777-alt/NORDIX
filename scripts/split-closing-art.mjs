// Preserve the approved 1920x1080 NORDIX art while moving its exact letters.
import { readFileSync, writeFileSync } from 'node:fs'
import pngjs from 'pngjs'
const { PNG } = pngjs
const original = PNG.sync.read(readFileSync('public/nordix-closing-art.png'))
const { width, height, data } = original
if (width !== 1920 || height !== 1080) throw new Error('Unexpected original artwork size')
// Precise bounding rectangles around the six letters, including the original D drip.
// Decorations and the thin gray horizontal rule stay on the fixed background.
const boxes = [
  [108,518,374,747], [398,513,676,752], [699,518,943,747],
  [962,518,1222,825], [1246,518,1327,747], [1338,518,1626,747]
]
const background = new PNG({ width, height })
data.copy(background.data)
const word = new PNG({ width, height })
for (const [left,top,right,bottom] of boxes) {
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * width + x) * 4
      const shade = data[i]
      // Keep the full D and its drip on the moving layer, including antialiased edges.
      // Reconstruct the stationary background from the clean gap between R and D.
      // Sampling the same row preserves the horizontal rule without a duplicate drip.
      if (left === 962) {
        const sample = (y * width + 950) * 4
        const base = data[sample]
        const alpha = base > 0 ? Math.max(0, Math.min(255, Math.round(255 * (1 - shade / base)))) : 0
        word.data[i] = 0
        word.data[i+1] = 0
        word.data[i+2] = 0
        word.data[i+3] = alpha
        for (let c = 0; c < 4; c++) background.data[i+c] = data[sample+c]
        continue
      }
      if (shade >= 250 || (y > 760 && shade > 115)) continue
      word.data[i] = 0
      word.data[i+1] = 0
      word.data[i+2] = 0
      word.data[i+3] = 255 - shade
      background.data[i] = 255
      background.data[i+1] = 255
      background.data[i+2] = 255
      background.data[i+3] = 255
    }
  }
}
// Verify that the lower tip of the original drip is actually present on the moving
// layer, and no dark duplicate survives on the fixed layer.
let dripPixels = 0
for (let y = 770; y < 814; y++) {
  const sample = (y * width + 950) * 4
  for (let x = 985; x < 1070; x++) {
    const i = (y * width + x) * 4
    if (word.data[i+3] > 128) dripPixels++
    if (background.data[i] !== data[sample]) throw new Error('Residual drip on fixed background')
  }
}
if (dripPixels < 20) throw new Error('Original D drip missing from moving artwork')
console.log('Verified original drip:', dripPixels, 'opaque pixels in lower tip')
writeFileSync('public/nordix-closing-bg-drip-restored.png', PNG.sync.write(background))
writeFileSync('public/nordix-closing-word-drip-restored.png', PNG.sync.write(word))
console.log('Prepared NORDIX parallax wordmark from original artwork')
