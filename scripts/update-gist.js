/**
 * Wird von GitHub Actions aufgerufen um latest.json im Gist zu aktualisieren.
 *
 * Tauri v2 NSIS Update-Mechanismus:
 *   - Der Updater lädt .nsis.zip herunter (NICHT die .exe)
 *   - Die Signatur ist der Inhalt von .nsis.zip.sig
 *   - Die URL in latest.json muss auf .nsis.zip zeigen
 *
 * Benötigte Env-Variablen:
 *   GIST_TOKEN, GIST_ID, REPO_OWNER, REPO_NAME,
 *   VERSION, TAG, ZIP_NAME, CRITICAL, SIG_PATH
 */
import { Octokit } from "@octokit/rest";
import fs from "fs-extra";

const {
  GIST_TOKEN,
  GIST_ID,
  REPO_OWNER,
  REPO_NAME,
  VERSION,
  TAG,
  ZIP_NAME,   // .nsis.zip filename — Tauri-Updater URL
  CRITICAL,
  SIG_PATH,   // Pfad zur .nsis.zip.sig Datei
} = process.env;

const missing = ["GIST_TOKEN", "GIST_ID", "REPO_OWNER", "REPO_NAME", "VERSION", "TAG", "ZIP_NAME", "SIG_PATH"]
  .filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
  process.exit(1);
}

const isCritical = CRITICAL === "true";

// Tauri-Updater erwartet die .nsis.zip URL (nicht die .exe!)
const updateUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG}/${ZIP_NAME}`;

// Signatur = Inhalt der .nsis.zip.sig Datei
const signature = await fs.readFile(SIG_PATH, "utf8");

const notes = isCritical
  ? `## Update v${VERSION}\n\n⚠️ CRITICAL UPDATE\n\nDieses Update enthält wichtige Korrekturen und wird automatisch installiert.`
  : `## Update v${VERSION}\n\nVerbesserungen und Fehlerbehebungen.`;

const latestJson = {
  version: VERSION,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: signature.trim(),
      url: updateUrl,         // .nsis.zip URL für den Updater
    },
  },
};

console.log(`📦 Version:    ${VERSION}`);
console.log(`🔗 URL:        ${updateUrl}`);
console.log(`⚠️  Critical:   ${isCritical}`);

const octokit = new Octokit({ auth: GIST_TOKEN });

await octokit.gists.update({
  gist_id: GIST_ID,
  files: {
    "latest.json": {
      content: JSON.stringify(latestJson, null, 2),
    },
  },
});

console.log(`✅ Gist aktualisiert: https://gist.github.com/${REPO_OWNER}/${GIST_ID}`);
