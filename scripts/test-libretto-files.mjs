#!/usr/bin/env node
// Checks how libretto-files resolves the paths it is given, without a Libretto server:
// every case fails or passes in the local file checks, before anything is sent.
//
//   node scripts/test-libretto-files.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const server = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins', 'libretto', 'server', 'libretto-files.mjs')
const home = realpathSync(mkdtempSync(join(tmpdir(), 'libretto-files-home-')))
const work = realpathSync(mkdtempSync(join(tmpdir(), 'libretto-files-work-')))
mkdirSync(join(home, 'Immagini'))
writeFileSync(join(home, 'Immagini', 'foto.txt'), 'not a font')
writeFileSync(join(work, 'foto.txt'), 'not a font')

// The child's home directory is `home` (os.homedir() reads HOME, USERPROFILE on Windows); its working directory is `work`.
const child = spawn(process.execPath, [server], {
  cwd: work,
  env: { ...process.env, HOME: home, USERPROFILE: home, LIBRETTO_URL: 'http://127.0.0.1:9', LIBRETTO_MCP_TOKEN: 'unused' },
  stdio: ['pipe', 'pipe', 'inherit'],
})
const pending = new Map()
createInterface({ input: child.stdout }).on('line', (line) => {
  const message = JSON.parse(line)
  pending.get(message.id)?.(message)
  pending.delete(message.id)
})
let nextId = 1
function call(name, args) {
  const id = nextId++
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } })}\n`)
  return new Promise(resolve => pending.set(id, resolve)).then(message => JSON.parse(message.result.content[0].text).error)
}

const cases = [
  ['~/ is the home directory', 'upload_font_file', '~/Immagini/foto.txt', 'foto.txt is not a .woff2 file'],
  ['~/ is the home directory (media)', 'upload_media_file', '~/Immagini/foto.txt', 'Unknown file type .txt'],
  ['~ alone is the home directory', 'upload_media_file', '~', `No file at ${home}`],
  ['a missing file under ~ names the expanded path', 'upload_media_file', '~/Immagini/manca.jpg', `No file at ${join(home, 'Immagini', 'manca.jpg')}`],
  ['a relative path is under the working directory', 'upload_font_file', 'foto.txt', 'foto.txt is not a .woff2 file'],
  ['~name is not expanded', 'upload_media_file', '~altro/foto.jpg', `No file at ${join(work, '~altro', 'foto.jpg')}`],
  ['an absolute path stays as it is', 'upload_font_file', join(work, 'foto.txt'), 'foto.txt is not a .woff2 file'],
]
try {
  for (const [what, tool, path, expected] of cases) {
    const error = await call(tool, { path, name: 'Test', weight: 400, style: 'normal', dryRun: true })
    assert.ok(error?.startsWith(expected), `${what}: ${path} answered ${JSON.stringify(error)}, expected it to start with ${JSON.stringify(expected)}`)
    console.log(`ok  ${what}`)
  }
} finally {
  child.kill()
  for (const dir of [home, work]) rmSync(dir, { recursive: true, force: true })
}
