/**
 * appSettings.svelte.ts
 * Shared reactive state for app preferences stored in settings.json.
 * Imported by both settings page (to display/edit) and layout (to act on).
 */

import { getSettingsStore } from "./storage";

// ── Reactive state ─────────────────────────────────────────────────────────

export const appSettings = $state({
  notificationsEnabled: true,
  soundEnabled:         false,
});

// ── Persistence ────────────────────────────────────────────────────────────

export async function loadAppSettings(): Promise<void> {
  try {
    const store = getSettingsStore();
    const notif  = await store.get<boolean>("notificationsEnabled");
    const sound  = await store.get<boolean>("soundEnabled");
    if (notif != null) appSettings.notificationsEnabled = notif;
    if (sound != null) appSettings.soundEnabled = sound;
  } catch (e) {
    console.error("[Nudge] Load app settings failed:", e);
  }
}

export async function saveAppSettings(): Promise<void> {
  try {
    const store = getSettingsStore();
    await store.set("notificationsEnabled", appSettings.notificationsEnabled);
    await store.set("soundEnabled",         appSettings.soundEnabled);
    await store.save();
  } catch (e) {
    console.error("[Nudge] Save app settings failed:", e);
  }
}
