// Build the optional, filtered Academy source archive without replacing the homepage.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const archive = join(root, 'academy-import.zip')
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
const hash = createHash('sha256').update(readFileSync(archive)).digest('hex')
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
run('npm', ['ci', '--no-audit', '--no-fund'], work)
run('npm', ['run', 'test'], work)
run('npm', ['run', 'build'], work)
rmSync(output, { recursive: true, force: true })
cpSync(join(work, 'dist'), output, { recursive: true })
writeFileSync(stamp, hash)
ready(true)
console.log('Academy and Lab built successfully.')
