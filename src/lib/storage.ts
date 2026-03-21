/**
 * storage.ts — Central storage manager for Nudge
 *
 * Saves data to %APPDATA%\Kavoma\Nudge\ (Windows Roaming AppData).
 * Uses Tauri v2 plugin-store with absolute paths so the store plugin
 * creates the Kavoma\Nudge\ directory tree automatically on first save.
 *
 * Directory layout:
 *   %APPDATA%\Kavoma\Nudge\
 *     ├── reminders.json   — reminders, categories, streak + sync metadata
 *     └── settings.json    — language, notifications, autostart, sound
 *
 * Sync-readiness:
 *   reminders.json carries _v (schema version), _deviceId, _updatedAt
 */

import { load, type Store } from "@tauri-apps/plugin-store";
import { dataDir, join } from "@tauri-apps/api/path";

const VENDOR         = "Kavoma";
const APP            = "Nudge";
export const SCHEMA_VERSION = 1;

// ── Singleton stores ──────────────────────────────────────────────────────

let _remindersStore: Store | null = null;
let _settingsStore:  Store | null = null;

/**
 * Must be called once (in +layout.svelte onMount) before any store access.
 * Builds %APPDATA%\Kavoma\Nudge\ as the storage root.
 * plugin-store creates missing parent directories automatically on first save.
 */
export async function initStorage(): Promise<void> {
  try {
    // dataDir() → C:\Users\{user}\AppData\Roaming\ on Windows
    const base = await dataDir();
    const dir  = await join(base, VENDOR, APP);

    // load() is the recommended Tauri v2 store API — creates/opens the store immediately.
    // Absolute paths are used so the store is placed at %APPDATA%\Kavoma\Nudge\
    // rather than the default %APPDATA%\{productName}\
    _remindersStore = await load(await join(dir, "reminders.json"), { defaults: {}, autoSave: false });
    _settingsStore  = await load(await join(dir, "settings.json"),  { defaults: {}, autoSave: false });

    console.log("[Nudge] Storage ready →", dir);
  } catch (e) {
    console.error("[Nudge] initStorage FAILED:", e);
    throw e; // re-throw so callers know init failed
  }
}

export function getRemindersStore(): Store {
  if (!_remindersStore) throw new Error("[Storage] initStorage() was not called or failed");
  return _remindersStore;
}

export function getSettingsStore(): Store {
  if (!_settingsStore) throw new Error("[Storage] initStorage() was not called or failed");
  return _settingsStore;
}

// ── Sync metadata ─────────────────────────────────────────────────────────

/**
 * Returns this device's persistent UUID, creating one on first call.
 * Used by the future sync system to identify the origin device of each change.
 */
export async function ensureDeviceId(): Promise<string> {
  const store = getRemindersStore();
  const existing = await store.get<string>("_deviceId");
  if (existing) return existing;

  const id = crypto.randomUUID();
  await store.set("_deviceId", id);
  await store.set("_v", SCHEMA_VERSION);
  await store.save();
  return id;
}

/**
 * Writes the current timestamp to _updatedAt.
 * Called on every saveReminders() so the sync system knows which
 * device wrote last — supports "last write wins" conflict resolution.
 */
export async function stampUpdatedAt(store: Store): Promise<void> {
  await store.set("_updatedAt", new Date().toISOString());
}
