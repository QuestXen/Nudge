# Auto-Update System Setup Guide

## 1. Environment Setup

### Install Rust Dependencies

The `src-tauri/Cargo.toml` has been updated with `tauri-plugin-updater` and `reqwest`.
Ensure you run:

```bash
cd src-tauri
cargo build
```

### Install Svelte Dependencies

Already handled in `package.json`.

## 2. Signing Keys Generation (Critical)

Tauri updates must be signed.

1. **Generate Keys**:
   Run this in your terminal (Windows):

   ```powershell
   cd src-tauri
   pnpm tauri signer generate -w tauri.conf.json
   ```

   _If `pnpm tauri` doesn't work directly, use `pnpm exec tauri`._

   This will:
   - Create a private key (save this securely! e.g., in GitHub Secrets).
   - Add the public key to `tauri.conf.json` (replacing `YOUR_PUBLIC_KEY_HERE`).

2. **Environment Variables**:
   For local signing or CI/CD, set:
   - `TAURI_SIGNING_PRIVATE_KEY`: Content of the private key.
   - `TAURI_SIGNING_KEY_PASSWORD`: Password if you attempted one (optional).

## 3. Configuration

### tauri.conf.json

Update the `endpoints` URL in `src-tauri/tauri.conf.json`:

```json
"endpoints": [
  "https://github.com/USERNAME/REPO/releases/latest/download/latest.json"
]
```

Replace `USERNAME/REPO` with your GitHub details.

### Workflow Secrets

In your GitHub Repo -> Settings -> Secrets and variables -> Actions:

- `TAURI_SIGNING_PRIVATE_KEY`: Your generated private key.
- `TAURI_SIGNING_KEY_PASSWORD`: Your password (if set).
- `GITHUB_TOKEN`: (Automatically provided, but ensure permissions are set).

## 4. Updates Hosting (GitHub Releases)

The `release.yml` workflow is configured to:

1. Build the app on tag push (e.g. `v1.0.1`).
2. Sign the update bundles.
3. Create a GitHub Release.
4. Upload assets.

**Important**: You must generate and upload the `latest.json` to the release assets.
The provided workflow has a spot for this. You can manually upload the `latest.json` (example provided in root) or automate it.

## 5. Testing Updates Locally

1. Build a version `0.1.0` (current).
2. Change `package.json` and `tauri.conf.json` version to `0.1.1`.
3. Build the new version: `pnpm tauri build`.
4. Copy the resulting `.nsis.zip` (Windows) and `latest.json` to a local server or GitHub Gist.
5. Point your `tauri.conf.json` endpoint to that URL.
6. Run the **0.1.0** version of your app (dev or build).
7. It should detect the 0.1.1 update.

## 6. Critical Updates

To verify the "Critical" mode:

1. Edit `latest.json` on your server/release.
2. Set `"critical": true`.
3. Restart the App.
4. The Fullscreen Modal (CriticalUpdateModal) should appear immediately.
