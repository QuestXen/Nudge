<script lang="ts">
  import { fly } from "svelte/transition";
  import { displayTime, displayDate, typeIcon } from "$lib/reminder-utils";
  import { t } from "$lib/i18n.svelte";
  import type { Reminder, Category } from "$lib/reminders.svelte";

  let {
    reminder,
    category,
    oncomplete,
    onsnooze,
    ondelete,
  }: {
    reminder:   Reminder;
    category?:  Category;
    oncomplete: (id: string) => void;
    onsnooze:   (id: string) => void;
    ondelete:   (id: string) => void;
  } = $props();

  // ── Derived ────────────────────────────────────────────────────────────────

  const isRecurring = $derived(
    reminder.type === "daily" || reminder.type === "weekly" || reminder.type === "interval"
  );

  const isDue = $derived(
    !reminder.nextTrigger || new Date(reminder.nextTrigger) <= new Date()
  );

  const priorityGlow: Record<string, string> = {
    high:   "bg-primary shadow-[0_0_4px_2px_rgba(122,73,228,0.4)]",
    medium: "bg-primary/60 shadow-[0_0_4px_2px_rgba(122,73,228,0.2)]",
    low:    "bg-outline-variant shadow-none",
  };

  /** Short description of when/how this reminder fires */
  const scheduleInfo = $derived((): string => {
    switch (reminder.type) {
      case "once-today":  return t().typeOnceToday;
      case "once-future": {
        if (!reminder.date) return "—";
        return new Date(reminder.date + "T00:00:00").toLocaleDateString("de-DE", {
          day: "numeric", month: "short",
        });
      }
      case "daily": return t().typeDaily;
      case "weekly": {
        const days = [
          t().weekMon, t().weekTue, t().weekWed, t().weekThu,
          t().weekFri, t().weekSat, t().weekSun,
        ];
        return reminder.weekdays?.map(d => days[d]).join(", ") ?? "—";
      }
      case "interval": {
        const v = reminder.intervalValue ?? reminder.intervalHours ?? 1;
        const unitMap: Record<string, string> = {
          hours:    t().iuHours,
          days:     t().iuDays,
          weeks:    t().iuWeeks,
          months:   t().iuMonths,
          quarters: t().iuQuarters,
          years:    t().iuYears,
        };
        return `${t().intervalLabel} ${v} ${unitMap[reminder.intervalUnit ?? "hours"] ?? ""}`;
      }
    }
  });

  /** Tooltip for the complete/advance button */
  const completeTitle = $derived((): string => {
    switch (reminder.type) {
      case "once-today":
      case "once-future": return t().complete;
      case "daily":       return "Für heute erledigt";
      case "weekly":      return "Für diese Woche erledigt";
      case "interval":    return "Erledigt · weiter planen";
    }
  });

  const timeStr = $derived(displayTime(reminder));
  const dateStr = $derived(displayDate(reminder));
  const icon    = $derived(typeIcon(reminder));

  let completing = $state(false);

  function handleComplete() {
    completing = true;
    setTimeout(() => oncomplete(reminder.id), 220);
  }
</script>

{#if !completing}
  <div
    class="group flex items-start gap-3 px-5 py-4 rounded-xl cursor-default
           bg-surface-container-low transition-colors duration-150
           hover:bg-surface-container
           {isDue
             ? 'border border-primary/25 shadow-[0_0_24px_rgba(122,73,228,0.07)]'
             : 'border border-outline-variant/10'}"
    in:fly={{ y: 6, duration: 200 }}
    out:fly={{ x: 40, duration: 200, opacity: 0 }}
    role="article"
    aria-label="{reminder.title}"
  >

    <!-- Priority glow dot (pulses on high+due) -->
    <div class="mt-[18px] shrink-0">
      <span
        class="block w-1.5 h-1.5 rounded-full
               {priorityGlow[reminder.priority] ?? priorityGlow.low}
               {isDue && reminder.priority === 'high' ? 'animate-pulse' : ''}"
      ></span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0 py-0.5">

      <!-- Row 1: title + time/due indicator -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1.5 min-w-0">
          {#if category}
            <span
              class="w-2 h-2 rounded-full shrink-0"
              style="background: {category.color}"
              title={category.name}
            ></span>
          {/if}
          <span class="text-sm font-medium text-on-surface truncate">{reminder.title}</span>
        </div>

        <!-- Time / due badge -->
        <div class="shrink-0 flex items-center gap-1 tabular-nums">
          {#if isDue}
            <span class="text-[0.625rem] font-bold uppercase tracking-widest text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
              Jetzt
            </span>
          {:else}
            {#if dateStr}
              <span class="text-xs text-on-surface-variant">{dateStr}</span>
            {/if}
            <span class="font-mono text-xs text-on-surface-variant">{timeStr}</span>
          {/if}
        </div>
      </div>

      <!-- Row 2: schedule info -->
      <div class="flex items-center gap-1 mt-1">
        <span
          class="material-symbols-outlined text-on-surface/25 leading-none"
          style="font-size:0.75rem"
        >{icon}</span>
        <span class="text-[0.6875rem] text-on-surface/35 truncate">{scheduleInfo()}</span>
        {#if isRecurring && !isDue}
          <span class="text-[0.6875rem] text-on-surface/25">· {timeStr}</span>
        {/if}
      </div>

      <!-- Row 3: description (optional) -->
      {#if reminder.description}
        <p class="text-xs text-on-surface/40 mt-1 truncate">{reminder.description}</p>
      {/if}

    </div>

    <!-- Actions (visible on card hover) -->
    <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100
                transition-opacity duration-150 pt-1">

      <!-- Snooze +15 min -->
      <button
        onclick={() => onsnooze(reminder.id)}
        class="flex items-center justify-center w-7 h-7 rounded-lg text-on-surface/30 cursor-pointer
               hover:text-primary hover:bg-surface-container-high transition-colors duration-150"
        title="+15 Min"
        aria-label="{reminder.title} um 15 Minuten verschieben"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3.25a.75.75 0 0 1 .75.75v2.69l1.28 1.28a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L7.47 9.03A.75.75 0 0 1 7.25 8.5v-3a.75.75 0 0 1 .75-.75Z"/>
        </svg>
      </button>

      <!-- Complete (one-time) or Advance (recurring) -->
      <button
        onclick={handleComplete}
        class="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer
               transition-colors duration-150
               {isDue
                 ? 'text-primary/80 hover:text-primary hover:bg-surface-container-high'
                 : 'text-on-surface/30 hover:text-primary hover:bg-surface-container-high'}"
        title={completeTitle()}
        aria-label="{completeTitle()} — {reminder.title}"
      >
        {#if isRecurring}
          <!-- Circle checkmark → "done for this occurrence" -->
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <circle cx="8" cy="8" r="5.75"/>
            <path d="M5.5 8.25l1.75 1.75 3.25-3.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {:else}
          <!-- Filled checkmark → permanently done -->
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
          </svg>
        {/if}
      </button>

      <!-- Delete -->
      <button
        onclick={() => ondelete(reminder.id)}
        class="flex items-center justify-center w-7 h-7 rounded-lg text-on-surface/30 cursor-pointer
               hover:text-error hover:bg-surface-container-high transition-colors duration-150"
        title={t().delete}
        aria-label="{reminder.title} {t().delete}"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
        </svg>
      </button>
    </div>

  </div>
{/if}
