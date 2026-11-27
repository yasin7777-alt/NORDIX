// Build the optional, filtered Academy source archive without replacing the homepage.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { reviseAcademy } from './academy-editorial.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const archive = join(root, 'academy-import.zip')
const fridgeModel = join(root, 'scripts', 'academy', 'FridgeModel.tsx')
const work = join(root, '.academy-build')
const output = join(root, 'public', 'academy')
const generated = join(root, 'src', 'generated')
mkdirSync(generated, { recursive: true })
const ready = value => writeFileSync(join(generated, 'academy-ready.ts'), 'export const academyReady = ' + value + '\n')
ready(false)
if (!existsSync(archive)) {
  rmSync(output, { recursive: true, force: true })
  console.log('Academy archive not installed; existing NORDIX remains unchanged.')
  process.exit(0)
}
const hash = createHash('sha256').update(readFileSync(archive)).update(readFileSync(fileURLToPath(import.meta.url))).update(readFileSync(join(root,'scripts','academy-editorial.mjs'))).update(readFileSync(fridgeModel)).update(readFileSync(join(root,'scripts','academy','academy-wordmark.png'))).update(readFileSync(join(root,'scripts','academy','lab-wordmark.png'))).digest('hex')
const stamp = join(work, 'archive.sha256')
if (existsSync(stamp) && readFileSync(stamp, 'utf8') === hash && existsSync(join(output, 'index.html'))) {
  ready(true)
  console.log('Academy build is current.')
  process.exit(0)
}
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npm' })
  if (r.error || r.status !== 0) throw new Error('Academy command failed: ' + cmd + ' ' + args.join(' '))
}
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
if (process.platform === 'win32') run('tar', ['-xf', archive, '-C', work], root)
else run('unzip', ['-q', archive, '-d', work], root)
// Keep the imported Academy header in the approved order, on desktop and mobile.
const headerPath = join(work, 'src', 'components', 'Header.tsx')
const header = readFileSync(headerPath, 'utf8')
const oldOrder = "{to:'/progress',label:'Мой прогресс'}, {to:'/lab',label:'Лаборатория'}"
const newOrder = "{to:'/lab',label:'Лаборатория'}, {to:'/progress',label:'Мой прогресс'}"
if (!header.includes(oldOrder) && !header.includes(newOrder)) throw new Error('Unexpected Academy navigation layout')
// User-supplied wordmarks cropped from the black transparent references.
const wordmarks = ['academy-wordmark.png', 'lab-wordmark.png']
mkdirSync(join(work, 'src', 'assets'), { recursive: true })
for (const asset of wordmarks) cpSync(join(root, 'scripts', 'academy', asset), join(work, 'src', 'assets', asset))
const previousBrand = '<Logo/><span className="ml-2 hidden font-display text-xs font-bold text-accent sm:inline">{pathname===\'/lab\'?\'LAB\':\'ACADEMY\'}</span>'
const newBrand = '<span className="inline-flex items-center gap-2.5 select-none"><span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-black"><img src={base+\'favicon.svg\'} className="h-8 w-10 object-contain" alt=""/></span><img data-testid="section-wordmark" src={pathname===\'/lab\'?labWordmark:academyWordmark} alt={pathname===\'/lab\'?\'LAB\':\'Academy\'} style={{height:28,width:\'auto\',maxWidth:\'min(150px,45vw)\',objectFit:\'contain\'}} /></span>'
if (!header.includes(previousBrand)) throw new Error('Unexpected Academy brand layout')
writeFileSync(headerPath, header.replace(oldOrder, newOrder).replace("import { Logo } from './Logo';", "import academyWordmark from '../assets/academy-wordmark.png';\nimport labWordmark from '../assets/lab-wordmark.png';").replace(previousBrand,newBrand))
reviseAcademy(work)
cpSync(fridgeModel, join(work, 'src', 'components', 'lab', 'FridgeModel.tsx'))
run('npm', ['ci', '--no-audit', '--no-fund'], work)
run('npm', ['install', '--no-save', '--package-lock=false', '--no-audit', '--no-fund', 'three@0.180.0', '@types/three@0.180.0'], work)
run('npm', ['run', 'test'], work)
run('npm', ['run', 'build'], work)
rmSync(output, { recursive: true, force: true })
cpSync(join(work, 'dist'), output, { recursive: true })
writeFileSync(stamp, hash)
ready(true)
console.log('Academy and Lab built successfully.')
