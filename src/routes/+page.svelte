<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { goto } from "$app/navigation";
  import ReminderCard from "$lib/components/ReminderCard.svelte";
  import { t, getLanguage } from "$lib/i18n.svelte";

  interface Reminder {
    id: string;
    title: string;
    time: string;
    description?: string;
    priority: "low" | "medium" | "high";
    done: boolean;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let reminders = $state<Reminder[]>([]);

  let showModal   = $state(false);
  let newTitle    = $state("");
  let newTime     = $state("");
  let newDesc     = $state("");
  let newPriority = $state<"low" | "medium" | "high">("medium");
  let titleInput  = $state<HTMLInputElement | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const active = $derived(
    reminders.filter((r) => !r.done).sort((a, b) => a.time.localeCompare(b.time))
  );
  const doneCount  = $derived(reminders.filter((r) => r.done).length);
  const canSave    = $derived(newTitle.trim().length > 0 && newTime.length > 0);

  const today = new Date();
  const locale = $derived(getLanguage() === "en" ? "en-GB" : "de-DE");
  const dateWeekday = $derived(today.toLocaleDateString(locale, { weekday: "long" }));
  const dateDay     = $derived(today.toLocaleDateString(locale, { day: "numeric", month: "long" }));

  // ── Actions ────────────────────────────────────────────────────────────────
  function completeReminder(id: string) {
    const r = reminders.find((r) => r.id === id);
    if (r) r.done = true;
  }

  function snoozeReminder(id: string) {
    const r = reminders.find((r) => r.id === id);
    if (!r) return;
    const [h, m] = r.time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m + 15, 0, 0);
    r.time = d.toTimeString().slice(0, 5);
  }

  function addReminder() {
    if (!canSave) return;
    reminders.push({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      time: newTime,
      description: newDesc.trim() || undefined,
      priority: newPriority,
      done: false,
    });
    closeModal();
  }

  function openModal() {
    showModal = true;
    setTimeout(() => titleInput?.focus(), 60);
  }

  function closeModal() {
    showModal = false;
    newTitle = ""; newTime = ""; newDesc = ""; newPriority = "medium";
  }

  const priorities = $derived<{ value: "low" | "medium" | "high"; label: string }[]>([
    { value: "low",    label: t().priorityLow    },
    { value: "medium", label: t().priorityMedium },
    { value: "high",   label: t().priorityHigh   },
  ]);
</script>

<div class="flex flex-col h-screen">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="grid grid-cols-[1fr_auto_1fr] items-center px-4 h-14 border-b border-zinc-800/60 shrink-0">

    <!-- Left: app name -->
    <span class="text-xs font-semibold tracking-[0.15em] uppercase text-zinc-500">nudge</span>

    <!-- Center: date -->
    <div class="flex flex-col items-center leading-none gap-0.5">
      <span class="text-[10px] font-medium tracking-widest uppercase text-zinc-600">{dateWeekday}</span>
      <span class="text-sm font-semibold text-zinc-200 tracking-tight">{dateDay}</span>
    </div>

    <!-- Right: settings -->
    <div class="flex justify-end">
      <button
        onclick={() => goto("/settings")}
        class="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-600 cursor-pointer
               hover:text-zinc-200 hover:bg-zinc-800/60 transition-all duration-150"
        aria-label={t().settings}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </header>

  <!-- ── Stats bar ────────────────────────────────────────────────────────── -->
  {#if reminders.length > 0}
    <div class="flex items-center justify-center gap-3 px-4 py-2 shrink-0"
         in:fade={{ duration: 150 }}>
      <span class="text-xs text-zinc-600">{active.length} {t().open}</span>
      {#if doneCount > 0}
        <span class="w-px h-3 bg-zinc-800"></span>
        <span class="text-xs text-zinc-700">{doneCount} {t().done}</span>
      {/if}
    </div>
  {/if}

  <!-- ── List ────────────────────────────────────────────────────────────── -->
  <main class="flex-1 overflow-y-auto px-4 pb-20" aria-label="Erinnerungen">

    {#if active.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center gap-4 pb-8"
           in:fade={{ duration: 200 }}>
        <!-- Pulsing ring hint -->
        <div class="relative flex items-center justify-center">
          <div class="absolute w-16 h-16 rounded-full border border-zinc-800 animate-ping opacity-20"></div>
          <div class="w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-600">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
        </div>
        <div>
          <p class="text-sm font-medium text-zinc-300">{t().noReminders}</p>
          <p class="text-xs text-zinc-600 mt-1">{t().noRemindersHint}</p>
        </div>
      </div>
    {:else}
      <div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800 mt-1">
        {#each active as reminder (reminder.id)}
          <ReminderCard
            {reminder}
            oncomplete={completeReminder}
            onsnooze={snoozeReminder}
          />
        {/each}
      </div>
    {/if}

  </main>

  <!-- ── Sticky bottom bar ─────────────────────────────────────────────────── -->
  <div class="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pointer-events-none">
    <button
      onclick={openModal}
      class="pointer-events-auto w-full flex items-center justify-center gap-2 py-3 rounded-xl
             bg-white text-zinc-900 font-medium text-sm cursor-pointer
             hover:bg-zinc-100 active:scale-[0.98]
             transition-all duration-150 shadow-lg shadow-black/30"
      aria-label={t().add}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      {t().add}
    </button>
  </div>

</div>

<!-- ── Add Reminder Modal ──────────────────────────────────────────────────── -->
{#if showModal}
  <!-- Backdrop -->
  <button
    class="fixed inset-0 z-40 w-full bg-black/60 cursor-default"
    onclick={closeModal}
    tabindex="-1"
    aria-label="Schließen"
    transition:fade={{ duration: 150 }}
  ></button>

  <!-- Sheet from bottom -->
  <div
    class="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
    role="dialog"
    aria-modal="true"
    aria-label="Erinnerung hinzufügen"
    transition:fade={{ duration: 100 }}
  >
    <div
      class="pointer-events-auto mx-4 mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5"
      in:fly={{ y: 32, duration: 250, easing: cubicOut }}
      out:fly={{ y: 32, duration: 180 }}
      role="document"
    >
      <!-- Handle + title -->
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm font-medium text-zinc-100">{t().newReminder}</span>
        <button
          onclick={closeModal}
          class="flex items-center justify-center w-6 h-6 rounded-md text-zinc-600 cursor-pointer
                 hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
          aria-label="Abbrechen"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
          </svg>
        </button>
      </div>

      <!-- Fields -->
      <div class="space-y-2.5">
        <!-- Title -->
        <input
          bind:this={titleInput}
          bind:value={newTitle}
          type="text"
          placeholder={t().titlePlaceholder}
          maxlength="80"
          class="w-full px-3 py-2 rounded-md text-sm bg-zinc-900 border border-zinc-800 text-zinc-100
                 placeholder:text-zinc-600 outline-none
                 focus:border-zinc-600 focus:bg-zinc-900 transition-colors duration-150"
          onkeydown={(e) => e.key === "Enter" && canSave && addReminder()}
          aria-label="Titel"
        />

        <!-- Time + Priority -->
        <div class="flex gap-2">
          <input
            bind:value={newTime}
            type="time"
            class="flex-1 px-3 py-2 rounded-md text-sm font-mono bg-zinc-900 border border-zinc-800
                   text-zinc-100 outline-none focus:border-zinc-600 transition-colors duration-150
                   [color-scheme:dark] cursor-pointer"
            aria-label="Uhrzeit"
          />
          <!-- Priority selector -->
          <div class="flex rounded-md border border-zinc-800 overflow-hidden" role="group" aria-label="Priorität">
            {#each priorities as p}
              <button
                onclick={() => (newPriority = p.value)}
                class="flex-1 px-3 py-2 text-xs transition-colors duration-150 cursor-pointer
                       {newPriority === p.value
                         ? 'bg-zinc-100 text-zinc-900 font-medium'
                         : 'bg-zinc-900 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400'}"
                aria-pressed={newPriority === p.value}
              >
                {p.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Description -->
        <input
          bind:value={newDesc}
          type="text"
          placeholder={t().descPlaceholder}
          maxlength="120"
          class="w-full px-3 py-2 rounded-md text-sm bg-zinc-900 border border-zinc-800 text-zinc-100
                 placeholder:text-zinc-600 outline-none
                 focus:border-zinc-600 transition-colors duration-150"
          onkeydown={(e) => e.key === "Enter" && canSave && addReminder()}
          aria-label="Beschreibung"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-4">
        <button
          onclick={closeModal}
          class="flex-1 py-2 rounded-md text-sm text-zinc-400 cursor-pointer
                 bg-zinc-900 border border-zinc-800
                 hover:bg-zinc-800 hover:text-zinc-300 transition-colors duration-150"
        >
          {t().cancel}
        </button>
        <button
          onclick={addReminder}
          disabled={!canSave}
          class="flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-150
                 {canSave
                   ? 'bg-white text-zinc-900 hover:bg-zinc-100 cursor-pointer'
                   : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}"
          aria-disabled={!canSave}
        >
          {t().save}
        </button>
      </div>
    </div>
  </div>
{/if}
