// Preserve the approved 1920x1080 NORDIX art while moving its exact letters.
import { readFileSync, writeFileSync } from 'node:fs'
import pngjs from 'pngjs'
const { PNG } = pngjs
const original = PNG.sync.read(readFileSync('public/nordix-closing-art.png'))
const { width, height, data } = original
if (width !== 1920 || height !== 1080) throw new Error('Unexpected original artwork size')
 // Remove only the decorative drip beneath the D, keeping the original source PNG intact.
 // The D shares the flat baseline at y=746; x=950 is the clear gap between R and D.
 // Copy the gap's pixels row by row so the existing gray horizontal rule is restored.
for (let y = 746; y < 814; y++) {
  const sample = (y * width + 950) * 4
  for (let x = 962; x < 1222; x++) {
    const i = (y * width + x) * 4
    data[i] = data[sample]
    data[i+1] = data[sample+1]
    data[i+2] = data[sample+2]
    data[i+3] = data[sample+3]
  }
}
// Precise bounding rectangles around the six letters without the D drip.
// Decorations and the thin gray horizontal rule stay on the fixed background.
const boxes = [
  [108,518,374,747], [398,513,676,752], [699,518,943,747],
  [962,518,1222,746], [1246,518,1327,747], [1338,518,1626,747]
]
const background = new PNG({ width, height })
data.copy(background.data)
const word = new PNG({ width, height })
for (const [left,top,right,bottom] of boxes) {
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * width + x) * 4
      const shade = data[i]
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
writeFileSync('public/nordix-closing-bg.png', PNG.sync.write(background))
writeFileSync('public/nordix-closing-word.png', PNG.sync.write(word))
console.log('Prepared NORDIX parallax wordmark from original artwork')
