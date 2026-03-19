/**
 * Lokales Release-Skript: bumpt die Version in allen Dateien,
 * committed und pusht einen Git-Tag. Der Build läuft danach in GitHub Actions.
 *
 * Usage:
 *   pnpm release 1.0.2          # Normales Update
 *   pnpm release 1.0.2 true     # Kritisches Update
 */
import fs from "fs-extra";
import path from "path";
import semver from "semver";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const [version, criticalArg] = process.argv.slice(2);

if (!version || !semver.valid(version)) {
  console.error("❌ Ungültige oder fehlende Version. Beispiel: pnpm release 1.0.2");
  process.exit(1);
}

const isCritical = criticalArg === "true";
const tag = isCritical ? `v${version}-critical` : `v${version}`;

// Prüfen ob Tag schon existiert
const existingTags = execSync("git tag", { cwd: root }).toString().split("\n");
if (existingTags.includes(tag)) {
  console.error(`❌ Tag '${tag}' existiert bereits lokal. Lösche ihn zuerst mit:\n   git tag -d ${tag}`);
  process.exit(1);
}

console.log(`🚀 Release v${version}${isCritical ? " (KRITISCH)" : ""}`);
console.log(`🏷️  Tag: ${tag}`);

// --- Version-Bump ---

async function replaceInFile(filePath, pattern, replacement) {
  const content = await fs.readFile(filePath, "utf8");
  const updated = content.replace(pattern, replacement);
  if (content === updated) {
    console.warn(`⚠️  Kein Match in ${path.relative(root, filePath)}`);
  }
  await fs.writeFile(filePath, updated);
}

console.log("\n📝 Versionen werden aktualisiert...");

await replaceInFile(
  path.join(root, "package.json"),
  /"version": "[\d.]+"/,
  `"version": "${version}"`
);

await replaceInFile(
  path.join(root, "src-tauri/tauri.conf.json"),
  /"version": "[\d.]+"/,
  `"version": "${version}"`
);

await replaceInFile(
  path.join(root, "src-tauri/Cargo.toml"),
  /^version = "[\d.]+"/m,
  `version = "${version}"`
);

console.log("✅ Versionen aktualisiert");

// --- Git ---

function run(cmd) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

console.log("\n📦 Git-Commit und Tag werden erstellt...");
run("git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml");

const staged = execSync("git diff --cached --name-only", { cwd: root }).toString().trim();
if (staged.length > 0) {
  run(`git commit -m "chore: release v${version}"`);
} else {
  console.log("  ℹ️  Keine Versionsänderung – überspringe Commit");
}

run(`git tag ${tag}`);

console.log("\n⬆️  Push zu GitHub...");
run("git push");
run(`git push origin ${tag}`);

console.log(`\n✅ Fertig! GitHub Actions baut jetzt v${version} automatisch.`);
console.log(`   https://github.com/actions`);
