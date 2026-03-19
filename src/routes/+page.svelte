<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { goto } from "$app/navigation";
  import ReminderCard from "$lib/components/ReminderCard.svelte";
  import NudgeLogo from "$lib/components/NudgeLogo.svelte";

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
  const dateLabel = today.toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long",
  });

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

  const priorities: { value: "low" | "medium" | "high"; label: string }[] = [
    { value: "low",    label: "Niedrig" },
    { value: "medium", label: "Mittel"  },
    { value: "high",   label: "Hoch"    },
  ];
</script>

<div class="flex flex-col h-screen">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="flex items-center justify-between px-4 h-12 border-b border-zinc-800 shrink-0">
    <div class="flex items-center gap-2">
      <NudgeLogo size={16} />
      <span class="text-sm font-semibold tracking-tight text-white">nudge</span>
    </div>

    <div class="flex items-center gap-1.5">
      <!-- Add button -->
      <button
        onclick={openModal}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer
               text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all duration-200"
        aria-label="Neue Erinnerung"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Hinzufügen
      </button>

      <!-- Settings -->
      <button
        onclick={() => goto("/settings")}
        class="flex items-center justify-center w-7 h-7 rounded-md text-zinc-500 cursor-pointer
               hover:text-zinc-100 hover:bg-zinc-800/50 transition-all duration-200"
        aria-label="Einstellungen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    </div>
  </header>

  <!-- ── Section label ───────────────────────────────────────────────────── -->
  <div class="flex items-center justify-between px-4 py-2.5 shrink-0">
    <span class="text-xs font-medium text-zinc-500 uppercase tracking-widest">Heute</span>
    <div class="flex items-center gap-2 text-xs text-zinc-600">
      {#if doneCount > 0}
        <span>{doneCount} erledigt</span>
        <span>·</span>
      {/if}
      <span>{active.length} offen</span>
    </div>
  </div>

  <!-- ── List ────────────────────────────────────────────────────────────── -->
  <main class="flex-1 overflow-y-auto px-4 pb-4" aria-label="Erinnerungen">

    {#if active.length === 0}
      <div class="flex flex-col items-center justify-center h-48 text-center gap-3"
           in:fade={{ duration: 200 }}>
        <div class="flex items-center justify-center w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900">
          <NudgeLogo size={18} />
        </div>
        <div>
          <p class="text-sm text-zinc-400 font-medium">Noch keine Erinnerungen</p>
          <p class="text-xs text-zinc-600 mt-0.5">Füge deine erste Erinnerung hinzu</p>
        </div>
        <button
          onclick={openModal}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer
                 bg-white text-zinc-900 hover:bg-zinc-200 transition-colors duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Hinzufügen
        </button>
      </div>
    {:else}
      <div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">
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
        <span class="text-sm font-medium text-zinc-100">Neue Erinnerung</span>
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
          placeholder="Was möchtest du nicht vergessen?"
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
          placeholder="Beschreibung (optional)"
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
          Abbrechen
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
          Hinzufügen
        </button>
      </div>
    </div>
  </div>
{/if}
