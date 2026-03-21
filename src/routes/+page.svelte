<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import ReminderCard from "$lib/components/ReminderCard.svelte";
  import { t } from "$lib/i18n.svelte";
  import { ui } from "$lib/ui.svelte";
  import { reminderStore, saveReminders, updateStreak } from "$lib/reminders.svelte";
  import { computeNextTrigger } from "$lib/reminder-utils";
  import type { ReminderType, IntervalUnit } from "$lib/reminders.svelte";

  // ── Derived from shared store ──────────────────────────────────────────────
  const active = $derived(
    reminderStore.reminders
      .filter((r) => !r.done)
      .sort((a, b) => {
        const ta = a.nextTrigger ?? `${a.date ?? "9999-99-99"}T${a.time}`;
        const tb = b.nextTrigger ?? `${b.date ?? "9999-99-99"}T${b.time}`;
        return ta.localeCompare(tb);
      })
  );
  const doneCount = $derived(reminderStore.reminders.filter((r) => r.done).length);
  const openCount = $derived(active.length);

  // ── Modal form state ───────────────────────────────────────────────────────
  let newType      = $state<ReminderType>("once-today");
  let newTitle     = $state("");
  let newTime      = $state("");
  let newDate      = $state("");
  let newWeekdays      = $state<number[]>([]);
  let newIntervalValue = $state(1);
  let newIntervalUnit  = $state<IntervalUnit>("hours");
  let newDesc      = $state("");
  let newPriority  = $state<"low" | "medium" | "high">("medium");
  let newCategoryId = $state<string | undefined>(undefined);
  let titleInput   = $state<HTMLInputElement | null>(null);

  const canSave = $derived(
    newTitle.trim().length > 0 &&
    (newType === "interval" || newTime.length > 0) &&
    (newType !== "once-future" || newDate.length > 0) &&
    (newType !== "weekly" || newWeekdays.length > 0)
  );

  // ── Modal sync ────────────────────────────────────────────────────────────
  $effect(() => {
    if (ui.showAddModal) setTimeout(() => titleInput?.focus(), 60);
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  function completeReminder(id: string) {
    const r = reminderStore.reminders.find((r) => r.id === id);
    if (!r) return;

    if (r.type === "once-today" || r.type === "once-future") {
      // One-time: permanently done
      r.done = true;
    } else {
      // Recurring (daily/weekly/interval): advance to next occurrence — never permanently done
      r.lastTriggered = new Date().toISOString();
      r.nextTrigger   = computeNextTrigger(r);
    }
    updateStreak();
    saveReminders();
  }

  function deleteReminder(id: string) {
    const idx = reminderStore.reminders.findIndex((r) => r.id === id);
    if (idx !== -1) reminderStore.reminders.splice(idx, 1);
    saveReminders();
  }

  function snoozeReminder(id: string) {
    const r = reminderStore.reminders.find((r) => r.id === id);
    if (!r) return;
    // Push nextTrigger directly — never earlier than now
    const base = r.nextTrigger ? new Date(r.nextTrigger) : new Date();
    const now  = new Date();
    r.nextTrigger = new Date(Math.max(base.getTime(), now.getTime()) + 15 * 60_000).toISOString();
    saveReminders();
  }

  function addReminder() {
    if (!canSave) return;
    const now = new Date();
    const base = {
      id:          crypto.randomUUID(),
      title:       newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority:    newPriority,
      categoryId:  newCategoryId,
      done:        false,
      createdAt:   now.toISOString(),
      type:        newType,
      time:        newTime || "09:00",
      date:        newType === "once-future" ? newDate : undefined,
      weekdays:      newType === "weekly"   ? [...newWeekdays]   : undefined,
      intervalValue: newType === "interval" ? newIntervalValue  : undefined,
      intervalUnit:  newType === "interval" ? newIntervalUnit   : undefined,
    };
    const nextTrigger = computeNextTrigger(base as Parameters<typeof computeNextTrigger>[0]);
    reminderStore.reminders.push({ ...base, nextTrigger });
    saveReminders();
    closeModal();
  }

  function closeModal() {
    ui.showAddModal = false;
    newType = "once-today"; newTitle = ""; newTime = ""; newDate = "";
    newWeekdays = []; newIntervalValue = 1; newIntervalUnit = "hours"; newDesc = ""; newPriority = "medium";
    newCategoryId = undefined;
  }

  function toggleWeekday(d: number) {
    const idx = newWeekdays.indexOf(d);
    if (idx === -1) newWeekdays.push(d);
    else            newWeekdays.splice(idx, 1);
  }

  const priorities = $derived<{ value: "low" | "medium" | "high"; label: string }[]>([
    { value: "low",    label: t().priorityLow    },
    { value: "medium", label: t().priorityMedium },
    { value: "high",   label: t().priorityHigh   },
  ]);

  const types: { value: ReminderType; label: () => string }[] = [
    { value: "once-today",  label: () => t().typeOnceToday  },
    { value: "once-future", label: () => t().typeOnceFuture },
    { value: "daily",       label: () => t().typeDaily      },
    { value: "weekly",      label: () => t().typeWeekly     },
    { value: "interval",    label: () => t().typeInterval   },
  ];

  const weekdays = $derived([
    { value: 0, label: t().weekMon },
    { value: 1, label: t().weekTue },
    { value: 2, label: t().weekWed },
    { value: 3, label: t().weekThu },
    { value: 4, label: t().weekFri },
    { value: 5, label: t().weekSat },
    { value: 6, label: t().weekSun },
  ]);

  const intervalUnits: { value: IntervalUnit; label: () => string }[] = [
    { value: "hours",    label: () => t().iuHours    },
    { value: "days",     label: () => t().iuDays     },
    { value: "weeks",    label: () => t().iuWeeks    },
    { value: "months",   label: () => t().iuMonths   },
    { value: "quarters", label: () => t().iuQuarters },
    { value: "years",    label: () => t().iuYears    },
  ];

  const typeIcons: Record<ReminderType, string> = {
    "once-today":  "today",
    "once-future": "event",
    "daily":       "autorenew",
    "weekly":      "date_range",
    "interval":    "timer",
  };

  const currentTypeLabel = $derived(types.find(tp => tp.value === newType)?.label() ?? "");
</script>

<!-- ── Main Content ──────────────────────────────────────────────────────── -->
<div class="flex flex-col h-full overflow-hidden">

  <!-- Top Bar -->
  <header class="flex justify-between items-center w-full px-8 py-5 bg-surface-container-low/60 shrink-0">
    <h2 class="text-lg font-bold tracking-tight text-on-surface">{t().remindersTitle}</h2>
    {#if reminderStore.reminders.length > 0}
      <div class="flex items-center gap-2" in:fade={{ duration: 150 }}>
        <span class="text-xs text-on-surface-variant">{openCount} {t().open}</span>
        {#if doneCount > 0}
          <span class="w-px h-3 bg-outline-variant/40"></span>
          <span class="text-xs text-on-surface/30">{doneCount} {t().done}</span>
        {/if}
      </div>
    {/if}
  </header>

  <!-- Reminder List -->
  <main class="flex-1 overflow-y-auto px-8 py-6" aria-label="Erinnerungen">

    {#if active.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center gap-4 pb-8"
           in:fade={{ duration: 200 }}>
        <div class="relative flex items-center justify-center">
          <div class="absolute w-16 h-16 rounded-full border border-primary/20 animate-ping opacity-30"></div>
          <div class="w-12 h-12 rounded-full border border-outline-variant/20 bg-surface-container-low flex items-center justify-center">
            <span class="material-symbols-outlined text-on-surface/30">notifications</span>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-on-surface/70">{t().noReminders}</p>
          <p class="text-xs text-on-surface/30 mt-1">{t().noRemindersHint}</p>
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each active as reminder (reminder.id)}
          <ReminderCard
            {reminder}
            category={reminderStore.categories.find(c => c.id === reminder.categoryId)}
            oncomplete={completeReminder}
            onsnooze={snoozeReminder}
            ondelete={deleteReminder}
          />
        {/each}
      </div>
    {/if}

  </main>
</div>

<!-- ── Add Reminder Modal ─────────────────────────────────────────────────── -->
{#if ui.showAddModal}
  <!-- Backdrop -->
  <button
    class="fixed inset-0 z-40 w-full bg-black/60 cursor-default"
    onclick={closeModal}
    tabindex="-1"
    aria-label="Schließen"
    transition:fade={{ duration: 150 }}
  ></button>

  <!-- Centered dialog -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
    role="dialog"
    aria-modal="true"
    aria-label="Erinnerung hinzufügen"
  >
    <div
      class="pointer-events-auto w-full max-w-[580px] flex rounded-2xl overflow-hidden
             border border-outline-variant/15
             shadow-[0_8px_60px_rgba(122,73,228,0.18),0_2px_24px_rgba(0,0,0,0.45)]"
      in:scale={{ start: 0.97, duration: 220, easing: cubicOut }}
      out:scale={{ start: 0.97, duration: 160 }}
      role="document"
    >

      <!-- ── Left Pane: Type + Scheduling ──────────────────────────────── -->
      <div class="w-48 shrink-0 flex flex-col bg-surface-container-lowest/90 border-r border-outline-variant/10 p-4">

        <!-- Type label -->
        <span class="text-[0.6875rem] font-bold text-primary/60 uppercase tracking-widest mb-2.5">Typ</span>

        <!-- Type radio list -->
        <div class="flex flex-col gap-0.5">
          {#each types as type}
            <button
              onclick={() => { newType = type.value; }}
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium w-full text-left
                     transition-colors duration-150 cursor-pointer
                     {newType === type.value
                       ? 'bg-primary/10 text-primary'
                       : 'text-on-surface/50 hover:text-on-surface/80 hover:bg-surface-container-low/50'}"
            >
              <span
                class="material-symbols-outlined shrink-0"
                style="font-size:0.9375rem; font-variation-settings: 'FILL' {newType === type.value ? 1 : 0}, 'wght' 400"
              >{typeIcons[type.value]}</span>
              {type.label()}
            </button>
          {/each}
        </div>

        <!-- Scheduling area — fixed height prevents layout shift -->
        <div class="mt-3 pt-3 border-t border-outline-variant/10 h-[152px] flex flex-col">
          {#if newType === "once-future"}
            <span class="text-[0.6875rem] font-bold text-on-surface/40 uppercase tracking-widest mb-2">
              {t().dateLabel}
            </span>
            <input
              bind:value={newDate}
              type="date"
              class="w-full px-2.5 py-1.5 rounded-lg text-xs bg-surface-container-low
                     border border-outline-variant/15 text-on-surface outline-none
                     focus:border-primary/40 transition-colors [color-scheme:dark] cursor-pointer"
              aria-label={t().dateLabel}
            />

          {:else if newType === "weekly"}
            <span class="text-[0.6875rem] font-bold text-on-surface/40 uppercase tracking-widest mb-2">
              {t().weekdaysLabel}
            </span>
            <div class="grid grid-cols-4 gap-1">
              {#each weekdays as wd}
                <button
                  onclick={() => toggleWeekday(wd.value)}
                  class="py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer
                         {newWeekdays.includes(wd.value)
                           ? 'bg-primary-container text-on-primary-fixed'
                           : 'bg-surface-container-low text-on-surface/40 hover:text-on-surface/70'}"
                >{wd.label}</button>
              {/each}
            </div>

          {:else if newType === "interval"}
            <!-- Number input row -->
            <div class="flex items-center gap-1.5 mb-2.5">
              <span class="text-[0.6875rem] text-on-surface/40 whitespace-nowrap">{t().intervalLabel}</span>
              <input
                type="number"
                min="1"
                max="999"
                bind:value={newIntervalValue}
                class="w-14 px-2 py-1 rounded-md text-xs text-center font-mono bg-surface-container-low
                       border border-outline-variant/15 text-on-surface outline-none
                       focus:border-primary/40 transition-colors [appearance:textfield]
                       [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <!-- Unit chips in 2×3 grid -->
            <div class="grid grid-cols-3 gap-1">
              {#each intervalUnits as u}
                <button
                  onclick={() => (newIntervalUnit = u.value)}
                  class="py-1.5 text-[0.625rem] font-semibold rounded-md transition-colors duration-150 cursor-pointer leading-none
                         {newIntervalUnit === u.value
                           ? 'bg-primary-container text-on-primary-fixed'
                           : 'bg-surface-container-low text-on-surface/40 hover:text-on-surface/70'}"
                >{u.label()}</button>
              {/each}
            </div>

          {:else}
            <!-- once-today / daily — ambient placeholder -->
            <div class="flex flex-col items-center justify-center flex-1 gap-2 opacity-20 pointer-events-none select-none">
              <span class="material-symbols-outlined text-on-surface" style="font-size:2.25rem; font-variation-settings: 'FILL' 0">
                {typeIcons[newType]}
              </span>
            </div>
          {/if}
        </div>
      </div>

      <!-- ── Right Pane: Stable form fields ────────────────────────────── -->
      <div class="flex-1 flex flex-col bg-surface-container-low/80 backdrop-blur-xl p-5 min-w-0">

        <!-- Header -->
        <div class="flex items-start justify-between mb-4 shrink-0">
          <div>
            <h2 class="text-sm font-semibold text-on-surface">{t().newReminder}</h2>
            <p class="text-[0.6875rem] font-bold text-primary/60 uppercase tracking-widest mt-0.5">
              {currentTypeLabel}
            </p>
          </div>
          <button
            onclick={closeModal}
            class="flex items-center justify-center w-7 h-7 rounded-lg text-on-surface/30 cursor-pointer
                   hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150 shrink-0 ml-2"
            aria-label="Abbrechen"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
            </svg>
          </button>
        </div>

        <!-- Title -->
        <input
          bind:this={titleInput}
          bind:value={newTitle}
          type="text"
          placeholder={t().titlePlaceholder}
          maxlength="80"
          class="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest border border-outline-variant/15
                 text-on-surface placeholder:text-on-surface/30 outline-none
                 focus:border-primary/40 transition-colors duration-150 shrink-0"
          onkeydown={(e) => e.key === "Enter" && canSave && addReminder()}
          aria-label="Titel"
        />

        <!-- Description -->
        <input
          bind:value={newDesc}
          type="text"
          placeholder={t().descPlaceholder}
          maxlength="120"
          class="mt-2 w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest border border-outline-variant/15
                 text-on-surface placeholder:text-on-surface/30 outline-none
                 focus:border-primary/40 transition-colors duration-150 shrink-0"
          onkeydown={(e) => e.key === "Enter" && canSave && addReminder()}
          aria-label="Beschreibung"
        />

        <!-- Time + Priority -->
        <div class="mt-2 flex gap-2 shrink-0">
          <input
            bind:value={newTime}
            type="time"
            class="flex-1 px-3 py-2 rounded-lg text-sm font-mono bg-surface-container-highest border border-outline-variant/15
                   text-on-surface outline-none focus:border-primary/40 transition-all duration-150
                   [color-scheme:dark] cursor-pointer
                   {newType === 'interval' ? 'opacity-30 pointer-events-none' : ''}"
            aria-label={t().timeLabel}
          />
          <div class="flex rounded-lg border border-outline-variant/15 overflow-hidden shrink-0" role="group" aria-label="Priorität">
            {#each priorities as p}
              <button
                onclick={() => (newPriority = p.value)}
                class="px-3 py-2 text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap
                       {newPriority === p.value
                         ? 'bg-primary-container text-on-primary-fixed'
                         : 'bg-surface-container-highest text-on-surface/40 hover:text-on-surface/70'}"
                aria-pressed={newPriority === p.value}
              >
                {p.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Category selector -->
        {#if reminderStore.categories.length > 0}
          <div class="mt-2 flex gap-1.5 flex-wrap shrink-0">
            <button
              onclick={() => (newCategoryId = undefined)}
              class="px-2.5 py-1 text-xs rounded-full border transition-colors duration-150 cursor-pointer
                     {!newCategoryId
                       ? 'border-primary/50 text-primary bg-primary/10'
                       : 'border-outline-variant/20 text-on-surface/40 hover:text-on-surface/70'}"
            >{t().noCategoryLabel}</button>
            {#each reminderStore.categories as cat}
              <button
                onclick={() => (newCategoryId = cat.id)}
                class="px-2.5 py-1 text-xs rounded-full border transition-colors duration-150 cursor-pointer flex items-center gap-1.5
                       {newCategoryId === cat.id
                         ? 'border-transparent text-on-surface'
                         : 'border-outline-variant/20 text-on-surface/50 hover:text-on-surface/80'}"
                style={newCategoryId === cat.id ? `background: ${cat.color}30; border-color: ${cat.color}80;` : ""}
              >
                <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: {cat.color}"></span>
                {cat.name}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Spacer -->
        <div class="flex-1 min-h-[12px]"></div>

        <!-- Actions -->
        <div class="flex gap-2 pt-3 border-t border-outline-variant/10 shrink-0">
          <button
            onclick={closeModal}
            class="flex-1 py-2 rounded-lg text-sm text-on-surface/50 cursor-pointer
                   bg-surface-container-highest border border-outline-variant/10
                   hover:text-on-surface transition-colors duration-150"
          >
            {t().cancel}
          </button>
          <button
            onclick={addReminder}
            disabled={!canSave}
            class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150
                   {canSave
                     ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed hover:opacity-90 cursor-pointer shadow-[0_2px_16px_rgba(122,73,228,0.3)]'
                     : 'bg-surface-container-highest text-on-surface/20 cursor-not-allowed'}"
            aria-disabled={!canSave}
          >
            {t().save}
          </button>
        </div>
      </div>

    </div>
  </div>
{/if}
