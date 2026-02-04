# System Einrichtung & Auto-Update Guide

Das System wurde auf ein **Skript-basiertes Release-System** umgestellt.

## 1. Setup

### Abhängigkeiten installieren

```bash
pnpm install
# sicherstellen, dass dependencies installiert sind
```

### Environment Variablen (.env)

Erstelle eine `.env` Datei im Root-Verzeichnis basierend auf `.env.example`:

1.  **GITHUB_TOKEN**: Ein Personal Access Token (Classic) mit `repo` und `gist` Rechten.
2.  **GIST_ID**: Erstelle einen neuen öffentlichen Gist auf gist.github.com mit einer Datei `latest.json` (Inhalt `{}`). Kopiere die ID aus der URL.
3.  **REPO_OWNER**: Dein GitHub Nutzername.
4.  **REPO_NAME**: "nudge".
5.  **TAURI_SIGNING_PRIVATE_KEY**: Der private Key aus `src-tauri/key.md` (oder wo du ihn gespeichert hast).
6.  **TAURI_SIGNING_KEY_PASSWORD**: Falls gesetzt.

### Tauri Config anpassen

Öffne `src-tauri/tauri.conf.json`.
Setze den Updater Endpoint auf die **RAW** URL deines Gists.

```json
"endpoints": [
  "https://gist.githubusercontent.com/DEIN_USER/DEINE_GIST_ID/raw/latest.json"
]
```

_Tipp: Klicke beim Gist auf "Raw", um die URL zu bekommen. Entferne den Commit-Hash (die lange Nummer nach `/raw/`), damit es immer auf die neueste Version zeigt._

## 2. Release erstellen (Automatisch)

Führe einfach diesen Befehl aus, um die App zu bauen, signieren und zu releasen:

```bash
# Syntax: pnpm run release [VERSION] [CRITICAL: true/false]

# Normales Update
pnpm run release 1.0.1 false

# Kritisches Update (erzwingt Modal)
pnpm run release 1.0.2 true
```

Das Skript erledigt alles:

1.  Erhöht Version in `package.json`, `tauri.conf.json`, `Cargo.toml`.
2.  Baut die App (`tauri build`).
3.  Erstellt GitHub Release & lädt Assets hoch.
4.  Aktualisiert die `latest.json` im Gist (inkl. Signatur und Critical-Flag).

## 3. Update Logik

Die Rust-Datei `update.rs` prüft nun effizient auf das `CRITICAL UPDATE` Flag in den Release-Notes, die vom Skript automatisch gesetzt werden, falls `true` übergeben wurde. Das spart einen zusätzlichen Netzwerk-Request.

## 4. Testen

1.  Release `0.1.0` lokal installiert haben.
2.  `pnpm run release 0.1.1 true`.
3.  App starten -> Sollte Kritisches Update anzeigen.
