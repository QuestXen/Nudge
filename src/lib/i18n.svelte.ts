import { getSettingsStore } from "./storage";

export type Language = "de" | "en";

const translations = {
  de: {
    // Header / Nav
    appName: "nudge",
    settings: "Einstellungen",
    remindersTitle: "Erinnerungen",
    dashboard: "Dashboard",
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

    // Reminder types
    typeOnceToday:  "Heute",
    typeOnceFuture: "Datum",
    typeDaily:      "Täglich",
    typeWeekly:     "Wöchentlich",
    typeInterval:   "Intervall",

    // Weekdays
    weekMon: "Mo",
    weekTue: "Di",
    weekWed: "Mi",
    weekThu: "Do",
    weekFri: "Fr",
    weekSat: "Sa",
    weekSun: "So",

    // Modal fields
    dateLabel:          "Datum",
    timeLabel:          "Uhrzeit",
    weekdaysLabel:      "Wochentage",
    intervalLabel:      "Alle",
    intervalUnit:       "Stunden",
    categoryLabel:      "Kategorie (optional)",
    noCategoryLabel:    "Keine",

    // Interval units (short labels for chips)
    iuHours:    "Std.",
    iuDays:     "Tage",
    iuWeeks:    "Wochen",
    iuMonths:   "Monate",
    iuQuarters: "Quartal",
    iuYears:    "Jahre",

    // ReminderCard
    complete: "Erledigt",
    delete:   "Löschen",
    snooze:   "15 min",

    // Settings sections
    general:       "Allgemein",
    notifications: "Benachrichtigungen",
    updates:       "Updates",
    info:          "Info",
    categories:    "Kategorien",

    // Settings rows
    autostartLabel:     "Beim Systemstart öffnen",
    autostartDesc:      "Nudge startet automatisch mit Windows",
    languageLabel:      "Sprache",
    notificationsLabel: "System-Benachrichtigungen",
    notificationsDesc:  "Zeigt Desktop-Benachrichtigungen für Erinnerungen",
    soundLabel:         "Ton",
    soundDesc:          "Spielt einen Ton bei Erinnerungen ab",
    updateStatus:       "Update-Status",
    upToDate:           "App ist aktuell",
    updateAvailable:    "verfügbar",
    updateFailed:       "Prüfung fehlgeschlagen",
    checking:           "Wird geprüft…",
    checkBtn:           "Prüfen",
    checkingBtn:        "Prüfe…",
    installBtn:         "Installieren",
    version:            "Version",
    developer:          "Entwickler",
    platform:           "Plattform",

    // Categories
    newCategory:         "Neue Kategorie",
    categoryNameLabel:   "Name",
    categoryColorLabel:  "Farbe",
    addCategoryBtn:      "Erstellen",
    noCategoriesHint:    "Noch keine Kategorien erstellt",

    // Dashboard
    nextReminderLabel:  "Nächste Erinnerung",
    noNextReminder:     "Keine anstehenden Erinnerungen",
    todayProgressLabel: "Heute",
    weekPreviewLabel:   "Diese Woche",
    streakLabel:        "Streak",
    streakDays:         "Tage in Folge",
    completedLabel:     "erledigt",
  },
  en: {
    // Header / Nav
    appName: "nudge",
    settings: "Settings",
    remindersTitle: "Reminders",
    dashboard: "Dashboard",
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

    // Reminder types
    typeOnceToday:  "Today",
    typeOnceFuture: "Date",
    typeDaily:      "Daily",
    typeWeekly:     "Weekly",
    typeInterval:   "Interval",

    // Weekdays
    weekMon: "Mo",
    weekTue: "Tu",
    weekWed: "We",
    weekThu: "Th",
    weekFri: "Fr",
    weekSat: "Sa",
    weekSun: "Su",

    // Modal fields
    dateLabel:          "Date",
    timeLabel:          "Time",
    weekdaysLabel:      "Weekdays",
    intervalLabel:      "Every",
    intervalUnit:       "hours",
    categoryLabel:      "Category (optional)",
    noCategoryLabel:    "None",

    // Interval units (short labels for chips)
    iuHours:    "Hrs.",
    iuDays:     "Days",
    iuWeeks:    "Weeks",
    iuMonths:   "Months",
    iuQuarters: "Qtrs.",
    iuYears:    "Years",

    // ReminderCard
    complete: "Done",
    delete:   "Delete",
    snooze:   "15 min",

    // Settings sections
    general:       "General",
    notifications: "Notifications",
    updates:       "Updates",
    info:          "Info",
    categories:    "Categories",

    // Settings rows
    autostartLabel:     "Open at startup",
    autostartDesc:      "Nudge starts automatically with Windows",
    languageLabel:      "Language",
    notificationsLabel: "System notifications",
    notificationsDesc:  "Shows desktop notifications for reminders",
    soundLabel:         "Sound",
    soundDesc:          "Plays a sound for reminders",
    updateStatus:       "Update status",
    upToDate:           "App is up to date",
    updateAvailable:    "available",
    updateFailed:       "Check failed",
    checking:           "Checking…",
    checkBtn:           "Check",
    checkingBtn:        "Checking…",
    installBtn:         "Install",
    version:            "Version",
    developer:          "Developer",
    platform:           "Platform",

    // Categories
    newCategory:         "New Category",
    categoryNameLabel:   "Name",
    categoryColorLabel:  "Color",
    addCategoryBtn:      "Create",
    noCategoriesHint:    "No categories yet",

    // Dashboard
    nextReminderLabel:  "Next Reminder",
    noNextReminder:     "No upcoming reminders",
    todayProgressLabel: "Today",
    weekPreviewLabel:   "This Week",
    streakLabel:        "Streak",
    streakDays:         "days in a row",
    completedLabel:     "done",
  },
} as const;

// ── Reactive state ─────────────────────────────────────────────────────────

let lang = $state<Language>("de");

export function getLanguage(): Language {
  return lang;
}

export function t(): (typeof translations)[Language] {
  return translations[lang];
}

export async function initLanguage() {
  try {
    const store = getSettingsStore();
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
    const store = getSettingsStore();
    await store.set("language", l);
    await store.save();
  } catch {
    // ignore
  }
}
