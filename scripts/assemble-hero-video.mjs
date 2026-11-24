// Reassemble the exact uploaded FFmpeg-compressed 4K/60fps MP4 from Git-sized chunks.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const dest = join(root, 'public', 'videos', 'nordix-hero-4k.mp4')
const expectedSize = 29276018
const expectedHash = '1370c94fe0d74ed428bfab4f288e66a9548bf1740b852388fa6ee8873627cae3'
const sha256 = data => createHash('sha256').update(data).digest('hex')
if (existsSync(dest)) {
 const current=readFileSync(dest)
 if (current.length===expectedSize && sha256(current)===expectedHash) {
   console.log('NORDIX 4K video already verified'); process.exit(0)
 }
}
const chunks=Array.from({length:10},(_,i)=>readFileSync(join(root,'media','hero4k',`part-${String(i).padStart(2,'0')}.bin`)))
const video=Buffer.concat(chunks)
if(video.length!==expectedSize || sha256(video)!==expectedHash) {
 throw new Error('NORDIX 4K video missing or damaged')
}
mkdirSync(join(root,'public','videos'),{recursive:true})
writeFileSync(dest,video)
console.log('NORDIX 3840x2160 / 60 fps restored:',video.length,'bytes')
