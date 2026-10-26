#!/bin/sh
true /*
# Starts a Node.js script with a Node 18 or later, wherever Node is installed.
#
#   sh run-node.sh <script.mjs> [args...]
#   node run-node.sh <script.mjs> [args...]
#
# An app opened from the Dock, Finder or Start menu (the Claude desktop app) gets a
# minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin on macOS) that rarely holds node, so a
# plain "command": "node" fails to start there. Run by sh, this tries, in order:
#   1. $LIBRETTO_NODE, the path of a node the person chose;
#   2. node on PATH;
#   3. the usual install places: Homebrew, the nodejs.org installer (/usr/local/bin),
#      Volta, mise and asdf shims, fnm's default, and the newest nvm version.
# The first one that runs and is at least version 18 starts the script.
#
# The file is also JavaScript: Node skips this shell part as a comment, and sh reads
# the JavaScript at the end as a here-document it never runs. So the plugin's command can be
# "${LIBRETTO_NODE:-sh}": sh where there is one, or a node the person names (Windows,
# where an app sees the user's PATH but usually has no sh).

MIN_MAJOR=18

# Whether $1 runs and is Node $MIN_MAJOR or later.
usable() {
  [ -n "$1" ] && [ -x "$1" ] && "$1" -e "process.exit(Number(process.versions.node.split('.')[0]) >= $MIN_MAJOR ? 0 : 1)" >/dev/null 2>&1
}

# The nvm versions, newest first (v24.21.0 before v24.7.0, v9.0.0 last).
nvm_nodes() {
  dir="${NVM_DIR:-$HOME/.nvm}/versions/node"
  [ -d "$dir" ] || return 0
  ls "$dir" 2>/dev/null | sort -t . -k 1.2,1nr -k 2,2nr -k 3,3nr | while IFS= read -r version; do
    echo "$dir/$version/bin/node"
  done
}

# Every candidate, one per line, in the order above.
candidates() {
  [ -n "$LIBRETTO_NODE" ] && echo "$LIBRETTO_NODE"
  command -v node 2>/dev/null
  echo /opt/homebrew/bin/node
  echo /usr/local/bin/node
  echo "$HOME/.volta/bin/node"
  echo "$HOME/.local/share/mise/shims/node"
  echo "$HOME/.asdf/shims/node"
  echo "${FNM_DIR:-$HOME/.local/share/fnm}/aliases/default/bin/node"
  echo "$HOME/Library/Application Support/fnm/aliases/default/bin/node"
  nvm_nodes
}

# The loop reads a here-document, so the exec below keeps this script's own stdin (the MCP stream).
found=""
list=$(candidates)
while IFS= read -r candidate; do
  if usable "$candidate"; then
    found="$candidate"
    break
  fi
done <<CANDIDATES
$list
CANDIDATES

if [ -z "$found" ]; then
  echo "libretto-files: serve Node.js $MIN_MAJOR o successivo: installa la versione LTS da https://nodejs.org (va in /usr/local/bin) oppure imposta LIBRETTO_NODE con il percorso di node. / needs Node.js $MIN_MAJOR or later: install the LTS from https://nodejs.org (it goes to /usr/local/bin) or set LIBRETTO_NODE to the path of node." >&2
  exit 127
fi

exec "$found" "$@"
: <<'//'
*/

// Run by node: start the script named after this file, with the same arguments.
const { pathToFileURL } = require('node:url')
const { resolve } = require('node:path')
process.argv.splice(1, 1)
import(pathToFileURL(resolve(process.argv[1])).href)
//
