/**
 * Wird von GitHub Actions aufgerufen um latest.json im Gist zu aktualisieren.
 * Benötigte Env-Variablen: GIST_TOKEN, GIST_ID, REPO_OWNER, REPO_NAME,
 *                           VERSION, TAG, INSTALLER_NAME, CRITICAL, SIG_PATH
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
  INSTALLER_NAME,
  CRITICAL,
  SIG_PATH,
} = process.env;

const missing = ["GIST_TOKEN", "GIST_ID", "REPO_OWNER", "REPO_NAME", "VERSION", "TAG", "INSTALLER_NAME", "SIG_PATH"]
  .filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
  process.exit(1);
}

const isCritical = CRITICAL === "true";
const installerUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG}/${INSTALLER_NAME}`;
const signature = await fs.readFile(SIG_PATH, "utf8");

const notes = isCritical
  ? `## Update v${VERSION}\n\n⚠️ CRITICAL UPDATE\n\nDieses Update enthält wichtige Sicherheitskorrekturen und wird automatisch installiert.`
  : `## Update v${VERSION}\n\nVerbesserungen und Fehlerbehebungen.`;

const latestJson = {
  version: VERSION,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: signature.trim(),
      url: installerUrl,
    },
  },
};

console.log(`📦 Version:    ${VERSION}`);
console.log(`🔗 URL:        ${installerUrl}`);
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
