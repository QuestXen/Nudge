import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import type { Reminder, IntervalUnit } from "./reminders.svelte";

// ── nextTrigger computation ────────────────────────────────────────────────

export function computeNextTrigger(r: Reminder): string | undefined {
  const now  = new Date();
  const [h, m] = r.time.split(":").map(Number);

  switch (r.type) {
    case "once-today": {
      const t = new Date();
      t.setHours(h, m, 0, 0);
      return t > now ? t.toISOString() : undefined;
    }

    case "once-future": {
      if (!r.date) return undefined;
      const t = new Date(`${r.date}T${r.time}:00`);
      return t > now ? t.toISOString() : undefined;
    }

    case "daily": {
      const t = new Date();
      t.setHours(h, m, 0, 0);
      if (t <= now) t.setDate(t.getDate() + 1);
      return t.toISOString();
    }

    case "weekly": {
      if (!r.weekdays?.length) return undefined;
      const base = new Date();
      base.setHours(h, m, 0, 0);
      // Search next 8 days to find a matching weekday
      for (let i = 0; i <= 7; i++) {
        const candidate = new Date(base);
        candidate.setDate(base.getDate() + i);
        // JS: 0=Sun..6=Sat → our system: 0=Mon..6=Sun
        const jsDay  = candidate.getDay();
        const ourDay = jsDay === 0 ? 6 : jsDay - 1;
        if (r.weekdays.includes(ourDay) && candidate > now) {
          return candidate.toISOString();
        }
      }
      return undefined;
    }

    case "interval": {
      const value = r.intervalValue ?? r.intervalHours ?? 1;
      const unit: IntervalUnit = r.intervalUnit ?? "hours";

      function addInterval(from: Date): Date {
        const d = new Date(from);
        switch (unit) {
          case "hours":    d.setHours(d.getHours() + value);          break;
          case "days":     d.setDate(d.getDate() + value);             break;
          case "weeks":    d.setDate(d.getDate() + value * 7);         break;
          case "months":   d.setMonth(d.getMonth() + value);           break;
          case "quarters": d.setMonth(d.getMonth() + value * 3);       break;
          case "years":    d.setFullYear(d.getFullYear() + value);     break;
        }
        return d;
      }

      if (r.lastTriggered) {
        const next = addInterval(new Date(r.lastTriggered));
        return (next > now ? next : addInterval(now)).toISOString();
      }
      // First time: start from configured time or now + interval
      const start = new Date();
      start.setHours(h, m, 0, 0);
      return (start > now ? start : addInterval(now)).toISOString();
    }
  }
}

// ── Notification check loop ────────────────────────────────────────────────

let permissionGranted = false;

export async function initNotificationPermission() {
  try {
    permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const perm = await requestPermission();
      permissionGranted = perm === "granted";
    }
  } catch {
    permissionGranted = false;
  }
}

export async function checkAndFireNotifications(
  reminders: Reminder[],
  onFired: (updatedReminder: Reminder) => void
) {
  if (!permissionGranted) return;
  const now = new Date();

  for (const r of reminders) {
    if (r.done) continue;
    if (!r.nextTrigger) continue;

    const trigger = new Date(r.nextTrigger);
    if (trigger > now) continue;

    // Fire notification
    try {
      sendNotification({ title: "Nudge", body: r.title });
    } catch (e) {
      console.error("Notification error:", e);
    }

    // Update state
    r.lastTriggered = now.toISOString();

    if (r.type === "once-today" || r.type === "once-future") {
      r.done = true;
      r.nextTrigger = undefined;
    } else {
      // Recurring: compute next trigger
      r.nextTrigger = computeNextTrigger(r);
    }

    onFired(r);
  }
}

// ── Display helpers ────────────────────────────────────────────────────────

/** Returns the time string to display on a ReminderCard (HH:MM from nextTrigger or time) */
export function displayTime(r: Reminder): string {
  if (r.nextTrigger) {
    const d = new Date(r.nextTrigger);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  return r.time;
}

/** Returns the date label for once-future reminders */
export function displayDate(r: Reminder): string | undefined {
  if (r.type !== "once-future" || !r.date) return undefined;
  return new Date(r.date + "T00:00:00").toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
}

/** Label for the reminder type icon (Material Symbol name) */
export function typeIcon(r: Reminder): string {
  switch (r.type) {
    case "once-today":   return "today";
    case "once-future":  return "event";
    case "daily":        return "repeat";
    case "weekly":       return "event_repeat";
    case "interval":     return "timer";
  }
}

/** Countdown string from now to nextTrigger */
export function countdown(nextTrigger: string): string {
  const diff = new Date(nextTrigger).getTime() - Date.now();
  if (diff <= 0) return "Jetzt";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
