# Libretto per Claude Code

[Italiano](#italiano) · [English](#english)

## Italiano

Questo plugin collega Claude Code a un sito Libretto. Claude lavora sul sito attraverso il server MCP di Libretto, con le stesse operazioni dell'admin: ogni modifica viene controllata, registrata e si può annullare. Le modifiche finiscono nella bozza; il sito pubblico cambia solo quando decidi di pubblicare.

Il plugin contiene:

- il server MCP `libretto`, che si collega a `https://librettocms.com/api/mcp` con il tuo token;
- il piccolo server locale `libretto-files`, che carica nella libreria Media le immagini che hai sul computer (serve Node 18 o successivo);
- sei skill che insegnano a Claude come lavorare su Libretto:
  - `libretto-editing`: testi, stili, sezioni da preset, varianti, immagini, header e footer, menu, collezioni, traduzioni, animazioni, sempre con un dry run prima di applicare;
  - `libretto-design-system`: token, varianti, mixin e temi, con il controllo del contrasto AA;
  - `libretto-visual-check`: guarda la pagina prima e dopo, in Chrome, su desktop e telefono;
  - `libretto-admin-browser`: fa nell'admin, con Chrome, le poche cose che il server MCP non sa fare (caricare file di font, pubblicare dall'admin quando lo chiedi) e controlla il sito pubblico;
  - `libretto-publish`: pubblicare o tornare a una versione precedente, solo quando lo dici tu;
  - `libretto-report-issue`: apre una segnalazione per il team di Libretto quando qualcosa manca o non funziona;
- le ricette passo passo (`plugins/libretto/reference/recipes/`) e il riferimento di tutte le operazioni (`plugins/libretto/reference/operations/`).

### Cosa serve

- [Claude Code](https://code.claude.com/docs) installato.
- Un account su Libretto con accesso al sito, come editor (anche proprietario dello spazio di lavoro) o amministratore.
- Un token. Nell'admin, nella barra laterale, apri **Persone e accessi** › **Agenti e accessi MCP**, dai un nome al token (per esempio `Claude Code, portatile`), scegli per cosa vale (un sito, i siti che scegli o tutti i siti del tuo spazio di lavoro, anche quelli creati dopo) e la durata (30 o 90 giorni), e copia il token: viene mostrato una volta sola.

Il token agisce per te, sui siti che raggiunge, con il tuo ruolo su ciascuno (mai più alto di quello che hai oggi). Con un token di più siti, Claude ti chiede su quale lavorare se non l'hai detto, indica il sito a ogni chiamata e ogni risposta lo ripete.

### Installazione

La guida passo passo, dall'invito al primo prompt, è [Connettere Claude a Libretto](https://docs.librettocms.com/it/start/connect-claude).

1. Apri Claude Code e aggiungi il marketplace:
   ```
   /plugin marketplace add InnestiDigital/libretto-plugins
   ```
2. Installa il plugin:
   ```
   /plugin install libretto@libretti
   ```
3. Claude Code chiede le due impostazioni del plugin. In **Token del sito Libretto** incolla il token: viene salvato nel portachiavi del sistema, mai in un file. Lascia **Indirizzo di Libretto** com'è (`https://librettocms.com`), a meno che tu non usi un'installazione di prova.
   Se non te le chiede, o per cambiarle dopo: `/plugin`, scegli Libretto, poi **Configure**.
4. Riavvia Claude Code e scrivi `/mcp`: `libretto` e `libretto-files` devono risultare connessi.

Da terminale gli stessi passi sono:

```bash
claude plugin marketplace add InnestiDigital/libretto-plugins
claude plugin install libretto@libretti
claude plugin configure libretto@libretti --values-stdin   # incolla {"libretto_token":"<token>"} e premi Ctrl-D
claude mcp list                                            # libretto: ✔ Connected
```

Con `--scope project` marketplace e plugin valgono solo per la cartella del progetto.

### In alternativa: variabili d'ambiente

`LIBRETTO_MCP_TOKEN` e `LIBRETTO_URL`, se impostate nel terminale da cui parte Claude Code, hanno la precedenza sulle impostazioni del plugin. Servono per un computer condiviso, uno script o per provare un'altra installazione senza toccare la configurazione.

**macOS (zsh).** Tieni il token nel Portachiavi:
```bash
security add-generic-password -a "$USER" -s libretto-mcp-token -w   # incolla il token quando lo chiede
echo 'export LIBRETTO_MCP_TOKEN="$(security find-generic-password -s libretto-mcp-token -w)"' >> ~/.zshrc
```

**Linux (bash).** `echo 'export LIBRETTO_MCP_TOKEN="<token>"' >> ~/.bashrc`

**Windows (PowerShell).** `[Environment]::SetEnvironmentVariable("LIBRETTO_MCP_TOKEN", "<token>", "User")`, poi riapri PowerShell.

Un'installazione di prova: `export LIBRETTO_URL="http://localhost:3000"`.

### Nell'app desktop di Claude

L'app desktop legge il token solo dalle impostazioni del plugin. Una variabile in `~/.zshrc` o `~/.bashrc` non arriva a un'app aperta dal Dock, dal Finder o dal menu Start: serve solo per Claude Code avviato da un terminale. Nell'app scrivi `/plugin`, scegli **libretto**, poi **Configure**, e incolla il token; oppure, in un terminale, `claude plugin configure libretto@libretti --values-stdin` con `{"libretto_token":"<token>"}`. Poi apri una nuova sessione.

### Se la connessione dà 401

Il token è sbagliato, scaduto, revocato o creato prima che il tuo Libretto venisse azzerato. Creane uno nuovo nella barra laterale dell'admin, **Persone e accessi** › **Agenti e accessi MCP**, sostituiscilo nelle impostazioni del plugin (`/plugin configure libretto@libretti`, o `/plugin` › **libretto** › **Configure** nell'app desktop) e apri una nuova sessione. Se usi `LIBRETTO_MCP_TOKEN` in un terminale, sostituiscilo lì: vale di più.

### Se `libretto-files` non si collega

`libretto` funziona ma `libretto-files` risulta non collegato (nell'app desktop: "connessione fallita"), e Claude non riesce a caricare immagini o font: il plugin non trova Node.js. Un'app aperta dal Dock o dal Finder non vede il `PATH` del terminale. Il plugin cerca Node anche dove lo mettono di solito Homebrew, l'installer di nodejs.org, nvm, Volta, fnm, mise e asdf; se non lo trova:

- installa la versione **LTS** da [nodejs.org](https://nodejs.org) (va in `/usr/local/bin`, dove il plugin la trova sempre), poi riavvia l'app;
- oppure, se avvii Claude Code da un terminale, imposta `LIBRETTO_NODE` con il percorso di un Node 18 o successivo (`export LIBRETTO_NODE="$(command -v node)"`).

**Windows.** Il plugin avvia `libretto-files` con `sh`, che c'è se hai installato Git for Windows con i suoi strumenti Unix nel `PATH`. Altrimenti imposta una volta la variabile utente `LIBRETTO_NODE` a `node` (`[Environment]::SetEnvironmentVariable("LIBRETTO_NODE", "node", "User")`) e riapri l'app.

### Un primo prompt

```
Usa Libretto: nella pagina Servizi cambia il titolo della sezione "Restauro" in "Restauro conservativo".
Fai prima un dry run, mostrami cosa cambia e applica solo se è tutto a posto. Non pubblicare.
```

Claude legge la pagina, prepara la modifica, la prova, la applica, la guarda e ti dice il `requestId` con cui annullarla. Pubblica quando vuoi (anche chiedendolo a Claude: "pubblica").

### Vedere il risultato in Chrome

Con l'estensione Claude in Chrome collegata, Claude apre l'anteprima della bozza e l'editor dell'admin nel tuo Chrome, fa gli screenshot prima e dopo (desktop e telefono) e ti dice cosa non corrisponde. Prima entra nell'admin in quel Chrome: Claude non scrive mai password e non accetta finestre di conferma del browser. Per guardare non tocca niente; agisce nell'admin solo per quello che il server MCP non sa fare (per esempio caricare i file di un font), e pubblica o cancella solo quando glielo dici. Senza Chrome usa gli screenshot del server o rilegge la pagina.

### Immagini

Indica a Claude il file sul tuo computer ("metti la foto ~/Immagini/foto.jpg nella sezione Restauro"): il server `libretto-files` la carica nella libreria Media (fino a 5 MB), poi Claude la usa e scrive il testo alternativo. Anche una cartella intera ("carica le foto di ~/Immagini/cantiere"): Claude le carica a gruppi di 100, salta quelle già nella libreria e ti dice quali non sono passate. Puoi anche caricare le immagini nell'admin (Media) e dire a Claude il nome del file.

### Segnalazioni

Quando Libretto non sa fare qualcosa, rifiuta una modifica che sembra corretta o sbaglia, Claude apre una segnalazione per il team di Libretto (la vedono nell'admin, in Segnalazioni) e te ne dà il numero.

### Revocare il token

Nell'admin, **Agenti e accessi MCP**: accanto al token premi **Revoca**. Smette di funzionare subito. Poi disinstalla il plugin con `/plugin uninstall libretto@libretti` (toglie anche il token salvato) e, se l'avevi impostata, togli `LIBRETTO_MCP_TOKEN` dal profilo della shell. Il token smette di funzionare anche quando scade, quando perdi l'accesso al sito o quando il tuo ruolo cambia in uno senza accesso agli agenti.

### Limiti

- Funziona con Claude Code. Claude Desktop e claude.ai richiedono un connettore con login OAuth, che Libretto non offre ancora.
- Creare o eliminare pagine richiede il proprietario dello spazio di lavoro o un amministratore della piattaforma; cambiare le lingue del sito, un amministratore della piattaforma.
- I file dei font (WOFF2) Claude li carica con `libretto-files` quando il tuo Libretto ha l'operazione `font.upload`; altrimenti si caricano nell'admin (Font). I Google Fonts si importano sempre da Claude.

---

## English

This plugin connects Claude Code to a Libretto site. Claude works on the site through Libretto's MCP server, with the same operations as the admin: every change is validated, recorded and undoable. Changes land in the draft; the public site changes only when you decide to publish.

The plugin holds:

- the `libretto` MCP server, which connects to `https://librettocms.com/api/mcp` with your token;
- the small local `libretto-files` server, which uploads images from your computer into the Media library (needs Node 18 or later);
- six skills that teach Claude how to work on Libretto:
  - `libretto-editing`: texts, styles, sections from presets, variants, images, header and footer, menus, collections, translations, motion, always with a dry run before applying;
  - `libretto-design-system`: tokens, variants, mixins and themes, under the AA contrast gate;
  - `libretto-visual-check`: looks at the page before and after, in Chrome, at desktop and phone width;
  - `libretto-admin-browser`: does in the admin, with Chrome, the few things the MCP server cannot (uploading font files, publishing from the admin when you ask) and checks the public site;
  - `libretto-publish`: publishing or going back to an earlier version, only when you say so;
  - `libretto-report-issue`: opens a ticket for the Libretto team when something is missing or broken;
- step-by-step recipes (`plugins/libretto/reference/recipes/`) and a reference of every operation (`plugins/libretto/reference/operations/`).

### Prerequisites

- [Claude Code](https://code.claude.com/docs) installed.
- An account on Libretto with access to the site, as an editor (a workspace owner too) or an admin.
- A token. In the admin sidebar, open **Persone e accessi** (People & access) › **Agenti e accessi MCP**, name the token (for example `Claude Code, laptop`), choose what it reaches (one site, the sites you pick, or every site of your workspace, including ones made later) and how long it lasts (30 or 90 days), and copy the token: it is shown once.

The token acts for you, on the sites it reaches, with your role on each (never above the role you have now). With a token of several sites, Claude asks which site to work on unless you named it, names the site on every call, and every answer names it back.

### Install

The step-by-step guide, from the invite to the first prompt, is [Connect Claude to Libretto](https://docs.librettocms.com/start/connect-claude).

1. In Claude Code, add the marketplace:
   ```
   /plugin marketplace add InnestiDigital/libretto-plugins
   ```
2. Install the plugin:
   ```
   /plugin install libretto@libretti
   ```
3. Claude Code asks for the plugin's two settings. In **Token del sito Libretto / Libretto site token**, paste the token: it is stored in the system keychain, never in a file. Leave **Indirizzo di Libretto / Libretto address** as it is (`https://librettocms.com`) unless you use a test install.
   If it does not ask, or to change them later: `/plugin`, choose Libretto, then **Configure**.
4. Restart Claude Code and type `/mcp`: `libretto` and `libretto-files` show as connected.

From a terminal the same steps are:

```bash
claude plugin marketplace add InnestiDigital/libretto-plugins
claude plugin install libretto@libretti
claude plugin configure libretto@libretti --values-stdin   # paste {"libretto_token":"<token>"} and press Ctrl-D
claude mcp list                                            # libretto: ✔ Connected
```

With `--scope project` the marketplace and the plugin apply to the project folder only.

### Or: environment variables

`LIBRETTO_MCP_TOKEN` and `LIBRETTO_URL`, when set in the terminal Claude Code starts from, take precedence over the plugin settings. Use them on a shared computer, in a script, or to try another install without touching the configuration.

**macOS (zsh).** Keep the token in the Keychain:
```bash
security add-generic-password -a "$USER" -s libretto-mcp-token -w   # paste the token when asked
echo 'export LIBRETTO_MCP_TOKEN="$(security find-generic-password -s libretto-mcp-token -w)"' >> ~/.zshrc
```

**Linux (bash).** `echo 'export LIBRETTO_MCP_TOKEN="<token>"' >> ~/.bashrc`

**Windows (PowerShell).** `[Environment]::SetEnvironmentVariable("LIBRETTO_MCP_TOKEN", "<token>", "User")`, then reopen PowerShell.

A test install: `export LIBRETTO_URL="http://localhost:3000"`.

### In the Claude desktop app

The desktop app reads the token only from the plugin settings. A variable in `~/.zshrc` or `~/.bashrc` does not reach an app opened from the Dock, Finder or the Start menu: it is only for Claude Code started from a terminal. In the app, type `/plugin`, choose **libretto**, then **Configure**, and paste the token; or, in a terminal, `claude plugin configure libretto@libretti --values-stdin` with `{"libretto_token":"<token>"}`. Then start a new session.

### If the connection answers 401

The token is wrong, expired, revoked, or was made before your Libretto was reset. Make a new one in the admin sidebar, **Persone e accessi** (People & access) › **Agenti e accessi MCP**, replace it in the plugin settings (`/plugin configure libretto@libretti`, or `/plugin` › **libretto** › **Configure** in the desktop app) and start a new session. If you use `LIBRETTO_MCP_TOKEN` in a terminal, replace it there: it wins.

### If `libretto-files` does not connect

`libretto` works but `libretto-files` shows as not connected (in the desktop app: "connection failed"), and Claude cannot upload images or fonts: the plugin cannot find Node.js. An app opened from the Dock or Finder does not see your terminal's `PATH`. The plugin also looks where Homebrew, the nodejs.org installer, nvm, Volta, fnm, mise and asdf usually put Node; if it still finds none:

- install the **LTS** from [nodejs.org](https://nodejs.org) (it goes to `/usr/local/bin`, where the plugin always finds it), then restart the app;
- or, if you start Claude Code from a terminal, set `LIBRETTO_NODE` to the path of a Node 18 or later (`export LIBRETTO_NODE="$(command -v node)"`).

**Windows.** The plugin starts `libretto-files` with `sh`, which is there when Git for Windows is installed with its Unix tools on the `PATH`. Otherwise set the user variable `LIBRETTO_NODE` to `node` once (`[Environment]::SetEnvironmentVariable("LIBRETTO_NODE", "node", "User")`) and reopen the app.

### A first prompt

```
Use Libretto: on the Servizi page, change the heading of the "Restauro" section to "Restauro conservativo".
Dry run first, show me what changes, and apply only if it is clean. Do not publish.
```

Claude reads the page, builds the change, tries it, applies it, looks at it and gives you the `requestId` that undoes it. Publish when you are ready (you can ask Claude: "publish").

### Seeing the result in Chrome

With the Claude in Chrome extension connected, Claude opens the draft preview and the admin editor in your Chrome, takes screenshots before and after (desktop and phone) and tells you what does not match. Sign in to the admin in that Chrome first: Claude never types passwords and never accepts a browser confirmation dialog. To look it touches nothing; it acts in the admin only for what the MCP server cannot do (uploading a font's files, for example), and publishes or deletes only when you say so. Without Chrome it uses the server's screenshots or re-reads the page.

### Images

Point Claude at the file on your computer ("put ~/Pictures/photo.jpg in the Restauro section"): the `libretto-files` server uploads it into the Media library (up to 5 MB), then Claude places it and writes its alt text. A whole folder works too ("upload the photos in ~/Pictures/site"): Claude uploads them 100 at a time, skips the ones already in the library and tells you which did not go through. You can also upload images in the admin (Media) and give Claude the file name.

### Tickets

When Libretto cannot do something, refuses a change that looks right, or gets it wrong, Claude opens a ticket for the Libretto team (they read it in the admin, under Segnalazioni) and gives you its id.

### Revoke the token

In the admin, **Agenti e accessi MCP**: press **Revoca** (Revoke) next to the token. It stops working at once. Then uninstall the plugin with `/plugin uninstall libretto@libretti` (which also removes the stored token) and, if you set it, remove `LIBRETTO_MCP_TOKEN` from your shell profile. A token also stops working when it expires, when you lose access to the site, or when your role changes to one without agent access.

### Limits

- Works with Claude Code. Claude Desktop and claude.ai need a connector with OAuth sign-in, which Libretto does not offer yet.
- Creating or deleting pages needs the workspace owner or a platform admin; changing the site's languages, a platform admin.
- Claude uploads font files (WOFF2) through `libretto-files` when your Libretto has the `font.upload` operation; otherwise they are uploaded in the admin (Font). Google Fonts are always imported from Claude.

### How it is built

The layout follows the Claude Code documentation (checked 2026-10-25):

- Plugins reference (layout, `plugin.json`, `userConfig` with `sensitive`, `${user_config.KEY}` in MCP `url`, `headers` and `env`): https://code.claude.com/docs/en/plugins-reference
- Plugin marketplaces: https://code.claude.com/docs/en/plugin-marketplaces
- MCP, including plugin servers and `${VAR:-default}` expansion: https://code.claude.com/docs/en/mcp
- Skills: https://code.claude.com/docs/en/skills

```
.claude-plugin/marketplace.json            the "libretti" marketplace, one plugin
plugins/libretto/.claude-plugin/plugin.json  manifest and userConfig (libretto_token, sensitive; libretto_url)
plugins/libretto/.mcp.json                 libretto (HTTP) and libretto-files (stdio)
plugins/libretto/server/libretto-files.mjs the local upload server, no dependencies
plugins/libretto/server/run-node.sh        starts it with a Node 18+ wherever Node is installed (sh, or node on Windows)
plugins/libretto/skills/*/SKILL.md         the six skills
plugins/libretto/reference/recipes/        hand-written recipes, one per job
plugins/libretto/reference/operations/     GENERATED from data/ by scripts/build-reference.mjs
data/                                      Libretto's registry.json and mcp-tools.json, plus the notes the generator adds
```

The servers read `${LIBRETTO_MCP_TOKEN:-${user_config.libretto_token}}` and `${LIBRETTO_URL:-${user_config.libretto_url}}`: the environment wins, the plugin settings are the fallback. No secret is stored in this repository.

Maintenance:

```bash
node scripts/build-reference.mjs --sync ../splash-cms   # copy the registry and tool catalogue from a Libretto checkout, regenerate
node scripts/build-reference.mjs --check                # fails on a stale file, an uncovered operation, an unknown name or a broken link
node scripts/test-libretto-files.mjs                    # the launcher on an app's PATH, path resolution, bulk upload against a fake Libretto
LIBRETTO_URL=... LIBRETTO_MCP_TOKEN=... node scripts/build-reference.mjs --live   # compare with a running server
claude plugin validate .
```

## License

MIT, see [LICENSE](LICENSE).
