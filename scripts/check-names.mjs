#!/usr/bin/env node
// Fails when the plugin teaches a name a core Libretto does not offer: an op, a door, a resource, a tool or a place
// absent from the registry dump (data/agent-registry.json), in any skill, recipe, generated reference, the README or
// the local file server. Also fails on a relative link to a file that does not exist and on a skill whose folder and
// name differ.
//
//   node scripts/check-names.mjs
//
// What counts as a name:
// - an op or door: a backticked `prefix.name` (one dot) or a JSON `"name": "prefix.name"` whose prefix is the prefix
//   of some op, door or person-only act of the dump. It must be an op, a door or a person-only act, or a code the
//   dump's own texts name in backticks (`page.slug`, `contrast.uncorrectable`: refusals and finding ids).
// - a resource: a `libretto://site/<siteId>/<path>` URI; a backticked path with a key or a query (`page/<pageId>`,
//   `reports?status=open`); a backticked word right after "read", "reads" or "resource", or right before "resource"
//   or "read". Its first segment must be the `read` of a resource of the dump. Leaf paths of a batch's base
//   revisions (`content/<pageId>`) are not resources: their roots are taken from the dump's apply_ops schema.
// - a tool or a code: a backticked snake_case name (`site_context`, `stale_revision`). It must be a tool of the dump,
//   of the plugin's file server (`name: '<tool>'` in server/libretto-files.mjs) or of the browser the browser skills
//   drive (BROWSER_TOOLS), or a code: a snake_case word of the dump's own texts, or one of SERVER_CODES.
// - a place: `urls.places["<key>"]`. It must be a key of the dump's `places` (site_context.urls.places).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pluginDir = join(root, 'plugins', 'libretto')
const registry = JSON.parse(readFileSync(join(root, 'data', 'agent-registry.json'), 'utf8'))

const offered = new Set([
  ...registry.ops.map(op => op.name),
  ...registry.doors.map(door => door.name),
  ...registry.personOnly.flatMap(act => [act.name, ...(act.also ?? [])]),
])
const prefixes = new Set([...offered].map(name => name.split('.')[0]))
for (const act of registry.personOnly) for (const prefix of act.prefixes ?? []) prefixes.add(prefix.replace(/\.$/, ''))
const personPrefixes = registry.personOnly.flatMap(act => act.prefixes ?? [])

const registryTexts = [
  registry.instructions, registry.guide,
  ...registry.tools.map(tool => tool.description),
  ...registry.ops.map(op => op.description), ...registry.doors.map(door => door.description),
  ...registry.personOnly.map(act => act.description),
]
const DOTTED = /`([a-z][a-zA-Z]*\.[a-z][a-zA-Z_]*)`/g
const codes = new Set(registryTexts.flatMap(text => [...text.matchAll(DOTTED)].map(match => match[1])))
// The admin places a refusal names (`settings.email`): keys of site_context.urls.places, not ops.
const places = new Set(registry.places ?? [])
for (const act of registry.personOnly) codes.add(act.place)
for (const place of places) codes.add(place)

// Tools: the core token's (the dump), the plugin's file server's, and the browser tools the browser skills use (Claude
// in Chrome's, by their short names).
const fileServer = readFileSync(join(pluginDir, 'server', 'libretto-files.mjs'), 'utf8')
const BROWSER_TOOLS = ['tabs_context_mcp', 'tabs_create_mcp', 'tabs_close_mcp', 'read_page', 'get_page_text', 'resize_window', 'javascript_tool', 'form_input', 'file_upload', 'upload_image', 'read_console_messages', 'read_network_requests', 'gif_creator']
const tools = new Set([...registry.tools.map(tool => tool.name), ...[...fileServer.matchAll(/\bname: '([a-z]+(?:_[a-z]+)+)'/g)].map(match => match[1]), ...BROWSER_TOOLS])
// Codes Libretto answers that the dump's texts do not name: the token's (401), the site's choice on a token of several
// sites, the mail check's, the live preview's, and the upload doors' and limits' refusals.
const SERVER_CODES = [
  'mcp_token_revoked', 'mcp_token_expired', 'mcp_token_unknown', 'mcp_token_missing', 'mcp_token_wrong_kind', 'mcp_token_access_lost',
  'site_required', 'site_unknown', 'missing_base_revision', 'rate_limited', 'upload_too_large', 'upload_archive',
  'render_not_offered', 'screenshot_unavailable', 'site_not_live', 'page_not_live',
  'mail_not_configured', 'mail_auth_failed', 'mail_connection_failed', 'mail_host_refused', 'mail_platform_not_allowed', 'mail_refused', 'mail_secrets_unavailable', 'mail_tls_failed',
]
const SNAKE = /\b[a-z]+(?:_[a-z]+)+\b/g
const snakeWords = new Set([
  ...registryTexts.flatMap(text => text.match(SNAKE) ?? []),
  ...JSON.stringify(registry.ops.map(op => op.inputSchema)).match(SNAKE) ?? [],
  ...SERVER_CODES,
])

const reads = new Set(registry.resources.map(resource => resource.read))
const baseRevisions = registry.tools.find(tool => tool.name === 'apply_ops')?.inputSchema?.properties?.baseRevisions?.description ?? ''
const leafRoots = new Set([...baseRevisions.matchAll(/`([a-zA-Z]+)\//g)].map(match => match[1]))

/** Whether an op-shaped name is one the plugin may teach. */
function knownName(name) {
  if (offered.has(name) || codes.has(name)) return true
  return personPrefixes.some(prefix => name.startsWith(prefix))
}

function opProblems(text) {
  const problems = []
  for (const match of text.matchAll(/`([a-z][a-zA-Z]*)\.([a-z][a-zA-Z_]*)`|"name":\s*"([a-z][a-zA-Z]*)\.([a-z][a-zA-Z_]*)"/g)) {
    const name = match[1] ? `${match[1]}.${match[2]}` : `${match[3]}.${match[4]}`
    if (prefixes.has(name.split('.')[0]) && !knownName(name)) problems.push(`names op or door ${name}, which the registry does not have`)
  }
  return problems
}

function resourceProblems(text) {
  const found = []
  for (const match of text.matchAll(/libretto:\/\/site\/[^/\s`]+\/([a-z][a-z-]*)/g)) found.push(match[1])
  for (const match of text.matchAll(/`([a-z][a-z-]*)(?:\/<[A-Za-z]+>|\?)[^`\s]*`/g)) if (!leafRoots.has(match[1])) found.push(match[1])
  for (const match of text.matchAll(/\b(?:reads?|resource)\s+`([a-z][a-z-]*)`/gi)) found.push(match[1])
  for (const match of text.matchAll(/`([a-z][a-z-]*)`\s+(?:resource|read)\b/gi)) found.push(match[1])
  return [...new Set(found)].filter(name => !reads.has(name)).map(name => `names resource ${name}, which the registry does not have`)
}

function toolProblems(text) {
  const found = [...text.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map(match => match[1])
  return [...new Set(found)].filter(name => !tools.has(name) && !snakeWords.has(name)).map(name => `names tool or code ${name}, which neither the registry, the plugin's servers nor SERVER_CODES has`)
}

function placeProblems(text) {
  const found = [...text.matchAll(/\bplaces\["([^"<>]+)"\]/g)].map(match => match[1])
  return [...new Set(found)].filter(place => !places.has(place)).map(place => `names place ${place}, which site_context.urls.places does not have`)
}

function linkProblems(file, text) {
  const problems = []
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split('#')[0]
    if (!target || /^[a-z]+:/.test(target)) continue
    if (!existsSync(join(dirname(file), target))) problems.push(`links ${match[1]}, which does not exist`)
  }
  return problems
}

function filesUnder(dir, keep) {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? filesUnder(path, keep) : keep(path) ? [path] : []
  })
}

const files = [
  ...filesUnder(pluginDir, path => path.endsWith('.md') || path.endsWith('.mjs')),
  join(root, 'README.md'),
]
const problems = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const found = [...opProblems(text), ...resourceProblems(text), ...toolProblems(text), ...placeProblems(text), ...(file.endsWith('.md') ? linkProblems(file, text) : [])]
  for (const problem of found) problems.push(`${relative(root, file)}: ${problem}`)
}
for (const dir of readdirSync(join(pluginDir, 'skills'))) {
  const skill = join(pluginDir, 'skills', dir, 'SKILL.md')
  const name = existsSync(skill) ? /^name: (.+)$/m.exec(readFileSync(skill, 'utf8'))?.[1] : null
  if (name !== dir) problems.push(`plugins/libretto/skills/${dir}/SKILL.md must exist and say name: ${dir}`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'} in ${files.length} files`)
  process.exit(1)
}
console.log(`names clean: ${files.length} files against ${offered.size} ops, doors and person-only acts, ${registry.resources.length} resources (${reads.size} reads), ${tools.size} tools and ${places.size} places`)
