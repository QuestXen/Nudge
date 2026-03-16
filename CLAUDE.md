# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

**Nudge** ist eine Tauri v2 Desktop-App (Windows) mit einem SvelteKit-Frontend (SPA-Modus) und einem Rust-Backend.

- **Frontend**: SvelteKit v2 + Svelte v5 + TypeScript + Tailwind CSS v4
- **Backend**: Tauri v2 + Rust
- **Build Tool**: Vite v8
- **Package Manager**: pnpm

## Befehle

```bash
pnpm dev              # Frontend-Dev-Server auf localhost:1420
pnpm tauri dev        # Vollständige App im Dev-Modus (startet Frontend + Tauri)
pnpm build            # Frontend-Build (→ /build)
pnpm check            # TypeScript/Svelte Type-Check
pnpm check:watch      # Type-Check im Watch-Modus

# Release (pusht Tag → GitHub Actions baut + released automatisch)
pnpm release 1.0.2             # Normales Update
pnpm release 1.0.2 true        # Kritisches Update (erzwingt sofortige Installation)
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
| `scripts/release.js` | Lokales Skript: Version-Bump + Git-Tag-Push |
| `scripts/update-gist.js` | CI-Skript: Gist-Update nach Build |
| `.github/workflows/release.yml` | GitHub Actions: Build + Sign + Release + Gist |

## Tauri Commands & Events

**Commands (Frontend → Rust)**:
- `check_for_updates()` → `UpdatePayload { update_available, version, notes, critical, date }`
- `install_update()` → `Result<(), String>`

**Events (Rust → Frontend)**:
- `"update-progress"` → `{ downloaded, total, percent }` (echter Prozentsatz)
- `"update-complete"` → `{}`

## Release-Pipeline

### Lokaler Aufruf
```bash
pnpm release 1.0.2          # → pusht Tag v1.0.2
pnpm release 1.0.2 true     # → pusht Tag v1.0.2-critical
```

`scripts/release.js` macht nur:
1. Version-Bump in `package.json`, `tauri.conf.json`, `Cargo.toml`
2. `git commit` + `git tag` + `git push`

### GitHub Actions (`.github/workflows/release.yml`)
Startet automatisch beim Tag-Push und führt aus:
1. Rust-Build + NSIS-Installer signieren (`TAURI_SIGNING_PRIVATE_KEY`)
2. GitHub Release erstellen + Assets hochladen
3. Gist (`latest.json`) aktualisieren via `scripts/update-gist.js`

**Benötigte GitHub Secrets**:
```
TAURI_SIGNING_PRIVATE_KEY   # Minisign-Key (mehrzeilig, direkt einfügen)
TAURI_SIGNING_KEY_PASSWORD  # Optional
GIST_TOKEN                  # PAT mit "gist" Scope
GIST_ID                     # ID des Gists mit latest.json
```

## Critical Update Erkennung

Der Critical-Flag wird durch das Vorhandensein von `"CRITICAL UPDATE"` in den Release Notes (Gist `latest.json`) erkannt – nicht über ein separates Feld im Manifest. Beim Release mit `pnpm run release [VERSION] true` setzt `scripts/release.js` diesen String automatisch.

## SPA-Konfiguration

Tauri benötigt den Static Adapter mit `fallback: "index.html"` in `svelte.config.js`. SSR ist in `src/routes/+layout.ts` deaktiviert (`export const ssr = false`).
