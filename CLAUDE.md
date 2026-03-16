# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

**Nudge** ist eine Tauri v2 Desktop-App (Windows) mit einem SvelteKit-Frontend (SPA-Modus) und einem Rust-Backend.

- **Frontend**: SvelteKit v2 + Svelte v5 + TypeScript + Tailwind CSS v4
- **Backend**: Tauri v2 + Rust
- **Build Tool**: Vite v6
- **Package Manager**: pnpm

## Befehle

```bash
pnpm dev              # Frontend-Dev-Server auf localhost:1420
pnpm tauri dev        # Vollständige App im Dev-Modus (startet Frontend + Tauri)
pnpm build            # Frontend-Build (→ /build)
pnpm check            # TypeScript/Svelte Type-Check
pnpm check:watch      # Type-Check im Watch-Modus

# Release-Pipeline (erfordert .env)
pnpm run release 1.0.2 false   # Normales Update
pnpm run release 1.0.2 true    # Kritisches Update (erzwingt sofortige Installation)
```

## Architektur

Die App kommuniziert über Tauri IPC (invoke/listen) zwischen Frontend und Backend:

```
Frontend (SvelteKit SPA)
  +layout.svelte  ──invoke──►  Rust: check_for_updates()  ──►  GitHub Gist (latest.json)
                  ◄──event───  "update-progress" / "update-complete"
                  ──invoke──►  Rust: install_update()
```

**Update-Flow**:
1. `+layout.svelte` ruft beim Mount `check_for_updates()` auf
2. Rust parsed das Gist-Manifest und prüft Release Notes auf "CRITICAL UPDATE"
3. Frontend zeigt je nach Flag entweder `CriticalUpdateModal` (blocking) oder `UpdateBanner` (dismissbar)
4. Nach Installation: `app.restart()` automatisch

## Wichtige Dateien

| Datei | Zweck |
|---|---|
| `src/routes/+layout.svelte` | Haupt-Update-Controller, Event-Listener |
| `src/lib/components/UpdateBanner.svelte` | Non-critical Update Banner |
| `src/lib/components/CriticalUpdateModal.svelte` | Kritisches Update Modal mit Progress |
| `src-tauri/src/lib.rs` | Plugin-Initialisierung, Tauri Commands |
| `src-tauri/src/update.rs` | Update-Logik, Critical-Flag-Erkennung |
| `src-tauri/tauri.conf.json` | App-Konfiguration, Updater-Endpoint (Gist) |
| `scripts/release.js` | Automatisierte Release-Pipeline |

## Tauri Commands & Events

**Commands (Frontend → Rust)**:
- `check_for_updates()` → `UpdatePayload { update_available, version, notes, critical, date }`
- `install_update()` → `Result<(), String>`

**Events (Rust → Frontend)**:
- `"update-progress"` → `{ event: "downloading", chunk_length, content_length }`
- `"update-complete"` → `{}`

## Release-Pipeline

`scripts/release.js` führt folgendes aus:
1. Version-Bump in `package.json`, `tauri.conf.json`, `Cargo.toml`
2. `pnpm tauri build` → signierter NSIS-Installer (.exe) + `.sig`-Datei
3. GitHub Release mit Tag `v{VERSION}` erstellen und Artefakte hochladen
4. GitHub Gist (`latest.json`) mit neuer Version, Signatur und `critical`-Flag aktualisieren

**Benötigte `.env`-Variablen**:
```
GITHUB_TOKEN=         # Personal Access Token (repo + gist Scopes)
GIST_ID=              # ID des Gists mit latest.json
REPO_OWNER=           # GitHub-Benutzername
REPO_NAME=            # Repository-Name
TAURI_SIGNING_PRIVATE_KEY=   # Minisign-Key (einzeilig mit \n-Escaping!)
TAURI_SIGNING_KEY_PASSWORD=  # Optional
```

## Critical Update Erkennung

Der Critical-Flag wird durch das Vorhandensein von `"CRITICAL UPDATE"` in den Release Notes (Gist `latest.json`) erkannt – nicht über ein separates Feld im Manifest. Beim Release mit `pnpm run release [VERSION] true` setzt `scripts/release.js` diesen String automatisch.

## SPA-Konfiguration

Tauri benötigt den Static Adapter mit `fallback: "index.html"` in `svelte.config.js`. SSR ist in `src/routes/+layout.ts` deaktiviert (`export const ssr = false`).
