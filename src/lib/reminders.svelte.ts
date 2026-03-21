import { getRemindersStore, stampUpdatedAt, ensureDeviceId } from "./storage";

// ── Types ──────────────────────────────────────────────────────────────────

export type ReminderType   = "once-today" | "once-future" | "daily" | "weekly" | "interval";
export type IntervalUnit   = "hours" | "days" | "weeks" | "months" | "quarters" | "years";

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  categoryId?: string;
  done: boolean;
  createdAt: string;

  // Scheduling
  type: ReminderType;
  time: string;              // HH:MM
  date?: string;             // YYYY-MM-DD (once-future only)
  weekdays?: number[];       // 0=Mo..6=So (weekly only)
  intervalValue?: number;    // (interval only) — replaces legacy intervalHours
  intervalUnit?: IntervalUnit;
  intervalHours?: number;    // legacy field, kept for migration

  // Runtime state
  nextTrigger?: string;   // ISO DateTime
  lastTriggered?: string; // ISO DateTime
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex
}

// ── Store ──────────────────────────────────────────────────────────────────

export const reminderStore = $state({
  reminders:      [] as Reminder[],
  categories:     [] as Category[],
  streak:         0,
  lastStreakDate: "",
});

// ── Persistence ───────────────────────────────────────────────────────────

export async function loadReminders(computeNext: (r: Reminder) => string | undefined) {
  try {
    const store = getRemindersStore();

    // Ensure schema version + device ID exist (creates them on first run)
    const existingV = await store.get<number>("_v");
    if (!existingV) {
      await ensureDeviceId(); // also writes _v and saves
    }

    const savedReminders  = await store.get<Reminder[]>("reminders");
    const savedCategories = await store.get<Category[]>("categories");
    const savedStreak     = await store.get<number>("streak");
    const savedStreakDate  = await store.get<string>("lastStreakDate");

    if (savedReminders) {
      // Migrate: fill in fields added in later schema versions
      const migrated = savedReminders.map((r) => ({
        ...r,
        type:        r.type      ?? ("once-today" as ReminderType),
        createdAt:   r.createdAt ?? new Date().toISOString(),
        nextTrigger: r.nextTrigger ?? computeNext(r),
        // Migrate legacy intervalHours → intervalValue + intervalUnit
        intervalValue: r.intervalValue ?? r.intervalHours,
        intervalUnit:  r.intervalUnit  ?? (r.intervalHours ? "hours" as const : undefined),
      }));
      reminderStore.reminders.splice(0, reminderStore.reminders.length, ...migrated);
    }
    if (savedCategories) {
      reminderStore.categories.splice(0, reminderStore.categories.length, ...savedCategories);
    }
    if (savedStreak != null)    reminderStore.streak = savedStreak;
    if (savedStreakDate != null) reminderStore.lastStreakDate = savedStreakDate;
  } catch (e) {
    console.error("[Nudge] Load reminders failed:", e);
  }
}

export async function saveReminders() {
  try {
    const store = getRemindersStore();
    await store.set("reminders",      [...reminderStore.reminders]);
    await store.set("categories",     [...reminderStore.categories]);
    await store.set("streak",         reminderStore.streak);
    await store.set("lastStreakDate", reminderStore.lastStreakDate);
    await stampUpdatedAt(store);  // sync-ready: record last write time
    await store.save();
  } catch (e) {
    console.error("[Nudge] Save reminders failed:", e);
  }
}

// ── Streak helper ─────────────────────────────────────────────────────────

export function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (reminderStore.lastStreakDate === today) return;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (reminderStore.lastStreakDate === yesterday) {
    reminderStore.streak += 1;
  } else {
    reminderStore.streak = 1;
  }
  reminderStore.lastStreakDate = today;
}
