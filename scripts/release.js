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
    // 0. Checks
    if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
        console.warn("⚠️ TAURI_SIGNING_PRIVATE_KEY not found in environment. Build will probably not be signed!");
    } else {
        console.log("🔑 TAURI_SIGNING_PRIVATE_KEY found.");
    }

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
    
    // Clean old bundles
    const bundlePath = path.join(process.cwd(), "src-tauri/target/release/bundle/nsis");
    if (fs.existsSync(bundlePath)) {
        await fs.emptyDir(bundlePath);
    }

    // Validation: Check Key Format
    const key = process.env.TAURI_SIGNING_PRIVATE_KEY;
    if (!key) {
        throw new Error("TAURI_SIGNING_PRIVATE_KEY is missing!");
    }
    console.log(`🔑 Key check: Length ${key.length}, Multiline: ${key.includes('\n')}`);
    // Trim whitespace just in case
    process.env.TAURI_SIGNING_PRIVATE_KEY = key.trim();

    // Use spawn to stream output directly to the console
    const { spawn } = await import("child_process");
    
    await new Promise((resolve, reject) => {
        // Use shell: true to support pnpm command on Windows
        const child = spawn("pnpm", ["tauri", "build"], { 
            stdio: "inherit",
            shell: true,
            env: { ...process.env }
        });
        
        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Build process exited with code ${code}`));
        });
        
        child.on("error", (err) => {
            reject(err);
        });
    });

    // 3. Find Assets (Strict Version Check)
    console.log("📦 Locating assets...");
    
    if (!fs.existsSync(bundlePath)) {
       throw new Error(`Bundle path not found: ${bundlePath}. Check your tauri.conf.json targets.`);
    }
    
    const files = await fs.readdir(bundlePath);
    console.log("Files found:", files);

    // Filter by version to be safe
    // Note: Tauri names files like "nudge_1.0.2_x64-setup.exe"
    const installer = files.find(f => (f.endsWith(".exe") || f.endsWith(".msi")) && f.includes(version));
    const sig = files.find(f => f.endsWith(".sig") && f.includes(version));

    if (!installer) {
        throw new Error(`Could not find installer for version ${version} in ${bundlePath}`);
    }
    if (!sig) {
         throw new Error(`Could not find signature (.sig) for version ${version}. \nCheck if TAURI_SIGNING_PRIVATE_KEY is set correctly in .env.`);
    }
    
    const installerPath = path.join(bundlePath, installer);
    const sigPath = path.join(bundlePath, sig);
    
    console.log(`✅ Found: ${installer}`);
    console.log(`✅ Found: ${sig}`);

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
    // ... rest of upload logic
    const installerUpload = await octokit.repos.uploadReleaseAsset({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      release_id: releaseData.data.id,
      name: installer,
      data: installerContent
    });
    
    // Also upload the signature, it's good practice
    const sigContent = await fs.readFile(sigPath);
    await octokit.repos.uploadReleaseAsset({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      release_id: releaseData.data.id,
      name: sig,
      data: sigContent
    });

    // 6. Generate latest.json
    console.log("🔄 Updating Gist with latest.json...");
    
    const sigString = sigContent.toString("utf8"); 
    
    const platforms = {
      "windows-x86_64": {
        "signature": sigString,
        "url": installerUpload.data.browser_download_url
      }
    };
    
    const latestJson = {
      version: version,
      notes: `## Update v${version}\n\n${isCritical ? "**⚠️ CRITICAL UPDATE**" : "Improvements and fixes."}`,
      pub_date: new Date().toISOString(),
      critical: isCritical, 
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
