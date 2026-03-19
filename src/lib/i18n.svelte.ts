import { LazyStore } from "@tauri-apps/plugin-store";

const store = new LazyStore("settings.json");

export type Language = "de" | "en";

const translations = {
  de: {
    // Header / Nav
    appName: "nudge",
    settings: "Einstellungen",
    back: "Zurück",

    // Main page
    today: "Heute",
    open: "offen",
    done: "erledigt",
    add: "Hinzufügen",
    noReminders: "Noch keine Erinnerungen",
    noRemindersHint: "Füge deine erste Erinnerung hinzu",

    // Modal
    newReminder: "Neue Erinnerung",
    titlePlaceholder: "Was möchtest du nicht vergessen?",
    descPlaceholder: "Beschreibung (optional)",
    cancel: "Abbrechen",
    save: "Hinzufügen",
    priorityLow: "Niedrig",
    priorityMedium: "Mittel",
    priorityHigh: "Hoch",

    // ReminderCard
    complete: "Erledigt",
    snooze: "15 min",

    // Settings sections
    general: "Allgemein",
    notifications: "Benachrichtigungen",
    updates: "Updates",
    info: "Info",

    // Settings rows
    autostartLabel: "Beim Systemstart öffnen",
    autostartDesc: "Nudge startet automatisch mit Windows",
    languageLabel: "Sprache",
    notificationsLabel: "System-Benachrichtigungen",
    notificationsDesc: "Zeigt Desktop-Benachrichtigungen für Erinnerungen",
    soundLabel: "Ton",
    soundDesc: "Spielt einen Ton bei Erinnerungen ab",
    updateStatus: "Update-Status",
    upToDate: "App ist aktuell",
    updateAvailable: "verfügbar",
    updateFailed: "Prüfung fehlgeschlagen",
    checking: "Wird geprüft…",
    checkBtn: "Prüfen",
    checkingBtn: "Prüfe…",
    installBtn: "Installieren",
    version: "Version",
    developer: "Entwickler",
    platform: "Plattform",
  },
  en: {
    // Header / Nav
    appName: "nudge",
    settings: "Settings",
    back: "Back",

    // Main page
    today: "Today",
    open: "open",
    done: "done",
    add: "Add",
    noReminders: "No reminders yet",
    noRemindersHint: "Add your first reminder",

    // Modal
    newReminder: "New Reminder",
    titlePlaceholder: "What do you want to remember?",
    descPlaceholder: "Description (optional)",
    cancel: "Cancel",
    save: "Add",
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",

    // ReminderCard
    complete: "Done",
    snooze: "15 min",

    // Settings sections
    general: "General",
    notifications: "Notifications",
    updates: "Updates",
    info: "Info",

    // Settings rows
    autostartLabel: "Open at startup",
    autostartDesc: "Nudge starts automatically with Windows",
    languageLabel: "Language",
    notificationsLabel: "System notifications",
    notificationsDesc: "Shows desktop notifications for reminders",
    soundLabel: "Sound",
    soundDesc: "Plays a sound for reminders",
    updateStatus: "Update status",
    upToDate: "App is up to date",
    updateAvailable: "available",
    updateFailed: "Check failed",
    checking: "Checking…",
    checkBtn: "Check",
    checkingBtn: "Checking…",
    installBtn: "Install",
    version: "Version",
    developer: "Developer",
    platform: "Platform",
  },
} as const;

// ── Reactive state ────────────────────────────────────────────────────────────

let lang = $state<Language>("de");

export function getLanguage(): Language {
  return lang;
}

export function t(): (typeof translations)[Language] {
  return translations[lang];
}

export async function initLanguage() {
  try {
    const saved = await store.get<Language>("language");
    if (saved === "de" || saved === "en") {
      lang = saved;
    }
  } catch {
    // Default: de
  }
}

export async function setLanguage(l: Language) {
  lang = l;
  try {
    await store.set("language", l);
    await store.save();
  } catch {
    // ignore
  }
}
