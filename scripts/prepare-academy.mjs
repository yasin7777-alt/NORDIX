// Build the optional, filtered Academy source archive without replacing the homepage.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { reviseAcademy } from './academy-editorial.mjs'
import { reviseLessonNavigation } from './academy/lesson-navigation.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const archive = join(root, 'academy-import.zip')
const fridgeModel = join(root, 'scripts', 'academy', 'FridgeModel.tsx')
const work = join(root, '.academy-build')
const output = join(root, 'public', 'academy')
const generated = join(root, 'src', 'generated')
mkdirSync(generated, { recursive: true })
// Enable the intro only when the actual user-supplied MP4 is present.
writeFileSync(join(generated, 'intro-ready.ts'), 'export const introReady = ' + existsSync(join(root, 'public', 'videos', 'nordix-intro.mp4')) + '\n')
const ready = value => writeFileSync(join(generated, 'academy-ready.ts'), 'export const academyReady = ' + value + '\n')
ready(false)
if (!existsSync(archive)) {
  rmSync(output, { recursive: true, force: true })
  console.log('Academy archive not installed; existing NORDIX remains unchanged.')
  process.exit(0)
}
const hash = createHash('sha256').update(readFileSync(archive)).update(readFileSync(fileURLToPath(import.meta.url))).update(readFileSync(join(root,'scripts','academy-editorial.mjs'))).update(readFileSync(fridgeModel)).update(readFileSync(join(root,'scripts','academy','LessonPartModel.tsx'))).update(readFileSync(join(root,'scripts','academy','lesson-navigation.mjs'))).update(readFileSync(join(root,'scripts','academy','Header.tsx'))).update(readFileSync(join(root,'scripts','academy','academy-navigation.css'))).update(readFileSync(join(root,'scripts','academy','academy-wordmark.png'))).update(readFileSync(join(root,'scripts','academy','lab-wordmark.png'))).digest('hex')
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
// Use the dedicated white-glass navigation for the imported Academy.
for (const asset of ['academy-wordmark.png','lab-wordmark.png']) {
  mkdirSync(join(work,'src','assets'), {recursive:true})
  cpSync(join(root,'scripts','academy',asset),join(work,'src','assets',asset))
}
for (const file of ['Header.tsx','academy-navigation.css']) {
  cpSync(join(root,'scripts','academy',file),join(work,'src','components',file))
}
// Match the copyright typography and left alignment of the NORDIX closing screen.
const appPath = join(work, 'src', 'App.tsx')
const app = readFileSync(appPath, 'utf8')
const oldFooter = '<footer className="border-t border-line px-6 py-8 text-center text-sm text-fog">© 2026 NORDIX · Учебные симуляции не заменяют профессиональный допуск.</footer>'
const newFooter = '<footer className="border-t border-line" style={{padding:"24px 2% 16px",textAlign:"left"}}><small data-testid="academy-copyright" style={{fontFamily:"Unbounded, Arial, sans-serif",fontSize:"clamp(9px, .64vw, 12px)",fontWeight:800,lineHeight:1.4,letterSpacing:"-.035em",color:"#050505",whiteSpace:"nowrap"}}>© 2026 NORDIX</small></footer>'
if (!app.includes(oldFooter)) throw new Error('Unexpected Academy footer layout')
writeFileSync(appPath, app.replace(oldFooter, newFooter))
reviseAcademy(work)
// Insert independent, interactive component models in the theory of lessons 4, 5, 6 and 8.
const theoryPath = join(work,'src','components','lesson','TheoryStage.tsx')
const theory = readFileSync(theoryPath,'utf8')
const figurePattern = /<figure\b[\s\S]*?<\/figure>/
if (!figurePattern.test(theory)) throw new Error('Theory illustration anchor missing')
writeFileSync(theoryPath, "import { LessonPartModel } from './LessonPartModel';\n" + theory.replace(figurePattern, figure => '<>'+figure+'\n      <LessonPartModel lessonId={lesson.id} /></>'))
cpSync(join(root,'scripts','academy','LessonPartModel.tsx'),join(work,'src','components','lesson','LessonPartModel.tsx'))
reviseLessonNavigation(work)
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
