import { Octokit } from "@octokit/rest";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GIST_ID;
const REPO_OWNER = process.env.REPO_OWNER; // e.g. "your-username"
const REPO_NAME = process.env.REPO_NAME;   // e.g. "nudge"

if (!GITHUB_TOKEN || !GIST_ID || !REPO_OWNER || !REPO_NAME) {
  console.error("❌ Missing required environment variables: GITHUB_TOKEN, GIST_ID, REPO_OWNER, REPO_NAME");
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Usage: pnpm run release [version] [critical=false]");
  console.log("Example: pnpm run release 1.0.1 true");
  process.exit(1);
}

const version = args[0];
const isCritical = args[1] === "true";

console.log(`🚀 Starting Release Process for v${version} (Critical: ${isCritical})`);

async function updateFile(filePath, regex, replacement) {
  const content = await fs.readFile(filePath, "utf8");
  const newContent = content.replace(regex, replacement);
  await fs.writeFile(filePath, newContent);
}

async function main() {
  try {
    // 1. Update Versions
    console.log("📝 Updating versions...");
    await updateFile(
      path.join(process.cwd(), "package.json"),
      /"version": ".*"/,
      `"version": "${version}"`
    );
    
    await updateFile(
      path.join(process.cwd(), "src-tauri", "tauri.conf.json"),
      /"version": ".*"/,
      `"version": "${version}"`
    );
    
    await updateFile(
      path.join(process.cwd(), "src-tauri", "Cargo.toml"),
      /^version = ".*"/m,
      `version = "${version}"`
    );

    // 2. Build App
    console.log("🔨 Building Tauri App...");
    // Note: Assuming env vars like TAURI_SIGNING_PRIVATE_KEY are set in the shell or .env
    // We pass stdio to inherit to see build progress
    await execAsync("pnpm tauri build", { maxBuffer: 1024 * 1024 * 50 }); 
    // If you need to see live output, spawn is better, but execAsync works for simple scripts if buffer is large enough.

    // 3. Find Assets
    console.log("📦 Locating assets...");
    // Target directory typically: src-tauri/target/release/bundle/nsis/ (for windows)
    // Adjust logic for your actual build target (msi vs nsis)
    const bundlePath = path.join(process.cwd(), "src-tauri/target/release/bundle/nsis"); // Default windows
    // Check if dir exists
    if (!fs.existsSync(bundlePath)) {
       throw new Error(`Bundle path not found: ${bundlePath}. Check your tauri.conf.json targets.`);
    }
    
    const files = await fs.readdir(bundlePath);
    const installer = files.find(f => f.endsWith(".exe") || f.endsWith(".msi")); // setup exe
    const sig = files.find(f => f.endsWith(".sig"));

    if (!installer || !sig) {
        throw new Error("Could not find installer or signature file.");
    }
    
    const installerPath = path.join(bundlePath, installer);
    const sigPath = path.join(bundlePath, sig);
    
    // 4. Create GitHub Release
    console.log("☁️ Creating GitHub Release...");
    const releaseData = await octokit.repos.createRelease({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tag_name: `v${version}`,
      name: `v${version}`,
      body: `Release v${version}\n\n${isCritical ? "**⚠️ CRITICAL UPDATE**" : "Routine update."}`,
      draft: false,
      prerelease: false,
    });
    
    const uploadUrl = releaseData.data.upload_url;

    // 5. Upload Assets
    console.log("⬆️ Uploading assets...");
    
    const installerContent = await fs.readFile(installerPath);
    const sigContent = await fs.readFile(sigPath);

    // Upload Installer
    const installerUpload = await octokit.repos.uploadReleaseAsset({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      release_id: releaseData.data.id,
      name: installer,
      data: installerContent
    });

    // Upload Signature? Not strictly necessary to assume strictly necessary for the update JSON, 
    // but good for archiving. The update JSON requires the *content* of the sig, not the file itself usually.
    // However, if we want to host it:
    // await octokit.repos.uploadReleaseAsset({ ... }); 
    
    // 6. Generate latest.json
    console.log("🔄 Updating Gist with latest.json...");
    
    const sigString = sigContent.toString("utf8"); // The sig file content IS the signature string usually
    
    // Construct the platform object. 
    // NOTE: This script assumes Windows x64 primarily. extend for others if needed.
    const platforms = {
      "windows-x86_64": {
        "signature": sigString,
        "url": installerUpload.data.browser_download_url
      }
    };
    
    const latestJson = {
      version: version,
      notes: `Update v${version} is available!`,
      pub_date: new Date().toISOString(),
      critical: isCritical, // Custom flag
      platforms: platforms
    };
    
    // 7. Update Gist
    await octokit.gists.update({
      gist_id: GIST_ID,
      files: {
        "latest.json": {
          content: JSON.stringify(latestJson, null, 2)
        }
      }
    });

    console.log("✅ Release completed successfully!");
    console.log(`🌍 Gist updated: https://gist.github.com/${REPO_OWNER}/${GIST_ID}`);

  } catch (error) {
    console.error("❌ Release failed:", error);
    process.exit(1);
  }
}

main();
