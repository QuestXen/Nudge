<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { t } from "$lib/i18n.svelte";
  import { reminderStore } from "$lib/reminders.svelte";
  import { countdown } from "$lib/reminder-utils";

  // ── Derived state ────────────────────────────────────────────────────────
  const now = new Date();

  // Next upcoming reminder (earliest nextTrigger among active reminders)
  const nextReminder = $derived(() => {
    const upcoming = reminderStore.reminders
      .filter(r => !r.done && r.nextTrigger && new Date(r.nextTrigger) > new Date())
      .sort((a, b) => a.nextTrigger!.localeCompare(b.nextTrigger!));
    return upcoming[0] ?? null;
  });

  // Today's progress
  const todayStr = now.toISOString().slice(0, 10);
  const todayTotal = $derived(
    reminderStore.reminders.filter(r => {
      if (r.type === "once-today") return true;
      if (r.type === "daily") return true;
      if (r.type === "weekly") {
        const jsDay = new Date().getDay();
        const ourDay = jsDay === 0 ? 6 : jsDay - 1;
        return r.weekdays?.includes(ourDay) ?? false;
      }
      if (r.type === "interval") return true;
      if (r.type === "once-future") return r.date === todayStr;
      return false;
    }).length
  );
  const todayDone = $derived(
    reminderStore.reminders.filter(r => r.done && r.lastTriggered?.startsWith(todayStr)).length
  );
  const todayPercent = $derived(todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0);

  // 7-day preview: for each of the next 7 days, how many reminders are active
  const weekDays = $derived(() => {
    const days: { label: string; count: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const jsDay = d.getDay();
      const ourDay = jsDay === 0 ? 6 : jsDay - 1;
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2).toUpperCase();

      const count = reminderStore.reminders.filter(r => {
        if (r.done && (r.type === "once-today" || r.type === "once-future")) return false;
        switch (r.type) {
          case "once-today":  return i === 0;
          case "once-future": return r.date === dateStr;
          case "daily":       return true;
          case "weekly":      return r.weekdays?.includes(ourDay) ?? false;
          case "interval":    return true;
          default:            return false;
        }
      }).length;

      days.push({ label, count, isToday: i === 0 });
    }
    return days;
  });

  // Streak
  const streak = $derived(reminderStore.streak);

  // Live countdown ticker
  let tick = $state(0);
  let timer: ReturnType<typeof setInterval>;
  onMount(() => { timer = setInterval(() => tick++, 1000); });
  onDestroy(() => clearInterval(timer));

  const countdownStr = $derived(() => {
    void tick; // reactive dependency
    const nr = nextReminder();
    if (!nr?.nextTrigger) return null;
    return countdown(nr.nextTrigger);
  });
</script>

<div class="flex flex-col h-full overflow-hidden">

  <!-- Top Bar -->
  <header class="flex items-center w-full px-8 py-5 bg-surface-container-low/60 shrink-0">
    <h2 class="text-lg font-bold tracking-tight text-on-surface">{t().dashboard}</h2>
  </header>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto px-8 py-6" in:fade={{ duration: 150 }}>
    <div class="max-w-2xl mx-auto space-y-5 pb-8">

      <!-- Next Reminder Widget -->
      <section class="relative overflow-hidden rounded-xl border border-primary/20 bg-surface-container-low p-6
                      shadow-[0_0_40px_rgba(122,73,228,0.08)]">
        <div class="absolute -top-8 -right-8 w-32 h-32 bg-primary-container/15 blur-[40px] rounded-full pointer-events-none"></div>
        <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
          {t().nextReminderLabel}
        </span>
        {#if nextReminder()}
          {@const nr = nextReminder()}
          <div class="mt-3 flex items-end justify-between gap-4">
            <div>
              <p class="text-xl font-semibold text-on-surface leading-tight">{nr!.title}</p>
              {#if nr!.description}
                <p class="text-xs text-on-surface-variant mt-1">{nr!.description}</p>
              {/if}
            </div>
            <div class="shrink-0 text-right">
              <p class="text-2xl font-bold text-primary tabular-nums leading-none">{countdownStr()}</p>
              <p class="text-xs text-on-surface/40 uppercase tracking-widest mt-1">
                {new Date(nr!.nextTrigger!).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        {:else}
          <p class="mt-3 text-sm text-on-surface/40">{t().noNextReminder}</p>
        {/if}
      </section>

      <!-- Today Progress + Streak (side by side) -->
      <div class="grid grid-cols-2 gap-5">

        <!-- Today Progress -->
        <section class="bg-surface-container-low rounded-xl border border-outline-variant/10 p-5">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            {t().todayProgressLabel}
          </span>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl font-bold text-on-surface">{todayDone}</span>
            <span class="text-sm text-on-surface/40">/ {todayTotal} {t().completedLabel}</span>
          </div>
          <!-- Progress bar -->
          <div class="mt-3 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500"
              style="width: {todayPercent}%"
            ></div>
          </div>
        </section>

        <!-- Streak -->
        <section class="bg-surface-container-low rounded-xl border border-outline-variant/10 p-5">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            {t().streakLabel}
          </span>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl font-bold text-on-surface">{streak}</span>
            <span class="text-sm text-on-surface/40">{t().streakDays}</span>
          </div>
          <div class="mt-3 flex gap-1">
            {#each Array(7) as _, i}
              <div
                class="flex-1 h-1.5 rounded-full {i < Math.min(streak, 7)
                  ? 'bg-gradient-to-r from-primary to-primary-container'
                  : 'bg-surface-container-highest'}"
              ></div>
            {/each}
          </div>
        </section>

      </div>

      <!-- 7-Day Week Preview -->
      <section class="bg-surface-container-low rounded-xl border border-outline-variant/10 p-5">
        <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
          {t().weekPreviewLabel}
        </span>
        <div class="mt-4 grid grid-cols-7 gap-2">
          {#each weekDays() as day}
            <div class="flex flex-col items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide
                           {day.isToday ? 'text-primary' : 'text-on-surface/40'}">
                {day.label}
              </span>
              <div class="relative w-8 h-8 rounded-full flex items-center justify-center
                          {day.isToday
                            ? 'bg-primary-container/30 border border-primary/30'
                            : 'bg-surface-container-highest'}">
                {#if day.count > 0}
                  <span class="text-xs font-semibold {day.isToday ? 'text-primary' : 'text-on-surface/60'}">
                    {day.count}
                  </span>
                {:else}
                  <span class="w-1 h-1 rounded-full bg-outline-variant/40"></span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>

      <!-- All reminders count -->
      {#if reminderStore.reminders.length > 0}
        <div class="flex items-center justify-center gap-6 py-2 text-on-surface/25">
          <span class="text-xs">{reminderStore.reminders.filter(r => !r.done).length} aktiv</span>
          <span class="w-px h-3 bg-outline-variant/20"></span>
          <span class="text-xs">{reminderStore.reminders.filter(r => r.done).length} erledigt</span>
          <span class="w-px h-3 bg-outline-variant/20"></span>
          <span class="text-xs">{reminderStore.reminders.length} gesamt</span>
        </div>
      {/if}

    </div>
  </div>

</div>
