/**
 * Wird von GitHub Actions aufgerufen um latest.json im Gist zu aktualisieren.
 *
 * Tauri v2 NSIS Update-Mechanismus (createUpdaterArtifacts: true):
 *   - Der Updater lädt die .exe herunter
 *   - Die Signatur ist der Inhalt von .exe.sig
 *   - Die URL in latest.json muss auf die .exe zeigen
 *
 * Benötigte Env-Variablen:
 *   GIST_TOKEN, GIST_ID, REPO_OWNER, REPO_NAME,
 *   VERSION, TAG, INSTALLER_NAME, CRITICAL, SIG_PATH
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
  INSTALLER_NAME, // .exe filename — Tauri-Updater URL
  CRITICAL,
  SIG_PATH,       // Pfad zur .exe.sig Datei
} = process.env;

const missing = ["GIST_TOKEN", "GIST_ID", "REPO_OWNER", "REPO_NAME", "VERSION", "TAG", "INSTALLER_NAME", "SIG_PATH"]
  .filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
  process.exit(1);
}

const isCritical = CRITICAL === "true";

// Tauri-Updater lädt die .exe herunter und prüft mit .exe.sig
const updateUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG}/${INSTALLER_NAME}`;

// Signatur = Inhalt der .exe.sig Datei
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
      url: updateUrl,         // .exe URL für den Updater
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
