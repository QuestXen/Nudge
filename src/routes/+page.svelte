<script lang="ts">
  import { fade, scale, fly } from "svelte/transition";
  import { cubicOut, cubicInOut } from "svelte/easing";
  import ReminderCard from "$lib/components/ReminderCard.svelte";

  interface Reminder {
    id: string;
    title: string;
    time: string;
    description?: string;
    priority: "low" | "medium" | "high";
    done: boolean;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let reminders = $state<Reminder[]>([
    { id: "1", title: "Stand-up Meeting", time: "09:00", description: "Daily sync mit dem Team", priority: "high", done: false },
    { id: "2", title: "Design Review", time: "11:30", description: "UI Mockups mit Product besprechen", priority: "medium", done: false },
    { id: "3", title: "Mittagspause", time: "12:30", priority: "low", done: false },
    { id: "4", title: "PR Review", time: "15:00", description: "Feature Branch reviewen und mergen", priority: "medium", done: false },
    { id: "5", title: "Deploy Staging", time: "17:00", description: "Release Candidate auf Staging pushen", priority: "high", done: false },
  ]);

  let showAddModal = $state(false);
  let showSettings = $state(false);
  let newTitle = $state("");
  let newTime = $state("");
  let newDescription = $state("");
  let newPriority = $state<"low" | "medium" | "high">("medium");
  let inputRef = $state<HTMLInputElement | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeReminders = $derived(
    reminders.filter((r) => !r.done).sort((a, b) => a.time.localeCompare(b.time))
  );
  const doneToday = $derived(reminders.filter((r) => r.done).length);
  const canSave = $derived(newTitle.trim().length > 0 && newTime.length > 0);

  // ── Date ───────────────────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const greetHour = today.getHours();
  const greeting =
    greetHour < 12 ? "Guten Morgen" : greetHour < 17 ? "Hallo" : "Guten Abend";

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
      description: newDescription.trim() || undefined,
      priority: newPriority,
      done: false,
    });
    closeModal();
  }

  function closeModal() {
    showAddModal = false;
    newTitle = "";
    newTime = "";
    newDescription = "";
    newPriority = "medium";
  }

  function openModal() {
    showAddModal = true;
    // focus input after transition
    setTimeout(() => inputRef?.focus(), 80);
  }

  const priorityOptions: { value: "low" | "medium" | "high"; label: string; color: string }[] = [
    { value: "low", label: "Niedrig", color: "#22C55E" },
    { value: "medium", label: "Mittel", color: "#F59E0B" },
    { value: "high", label: "Hoch", color: "#EF4444" },
  ];
</script>

<div class="flex flex-col h-screen overflow-hidden select-none">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <div
        class="w-7 h-7 rounded-lg flex items-center justify-center"
        style="background: linear-gradient(135deg, #8B5CF6, #3B82F6);"
        aria-hidden="true"
      >
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
        </svg>
      </div>
      <span class="text-base font-semibold tracking-tight" style="color: var(--text-primary);">nudge</span>
    </div>

    <!-- Date -->
    <span class="text-xs" style="color: var(--text-faint);">{dateStr}</span>

    <!-- Settings -->
    <button
      onclick={() => (showSettings = !showSettings)}
      class="w-7 h-7 flex items-center justify-center rounded-xl cursor-pointer
             transition-all duration-150"
      style="color: var(--text-muted); background: transparent;"
      onmouseenter={(e) => {
        e.currentTarget.style.background = "var(--glass-bg-hover)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
      aria-label="Einstellungen"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    </button>
  </header>

  <!-- ── Greeting + Stats ─────────────────────────────────────────────────── -->
  <div class="px-5 pb-4 shrink-0">
    <p class="text-xl font-semibold" style="color: var(--text-primary);">{greeting}</p>
    <p class="text-xs mt-0.5" style="color: var(--text-muted);">
      {#if activeReminders.length === 0}
        Alles erledigt für heute
      {:else}
        {activeReminders.length} offene {activeReminders.length === 1 ? "Erinnerung" : "Erinnerungen"}
        {#if doneToday > 0}
          · {doneToday} erledigt
        {/if}
      {/if}
    </p>
  </div>

  <!-- ── Divider ──────────────────────────────────────────────────────────── -->
  <div class="mx-5 mb-4 shrink-0" style="height: 1px; background: var(--glass-border);"></div>

  <!-- ── Reminder List ────────────────────────────────────────────────────── -->
  <main class="flex-1 overflow-y-auto px-5 pb-24 space-y-2.5" aria-label="Erinnerungen">

    {#if activeReminders.length === 0}
      <!-- Empty state -->
      <div
        class="flex flex-col items-center justify-center h-48 text-center"
        in:fade={{ duration: 300 }}
      >
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" style="color: var(--text-faint);" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p class="text-sm font-medium" style="color: var(--text-muted);">Alles erledigt</p>
        <p class="text-xs mt-1" style="color: var(--text-faint);">Neue Erinnerung mit + hinzufügen</p>
      </div>
    {:else}
      {#each activeReminders as reminder (reminder.id)}
        <ReminderCard
          {reminder}
          oncomplete={completeReminder}
          onsnooze={snoozeReminder}
        />
      {/each}
    {/if}

  </main>

  <!-- ── FAB ─────────────────────────────────────────────────────────────── -->
  <div class="absolute bottom-5 right-5 z-20">
    <button
      onclick={openModal}
      class="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer
             shadow-lg transition-all duration-200"
      style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white;
             box-shadow: 0 8px 24px rgba(139,92,246,0.35);"
      onmouseenter={(e) => {
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(139,92,246,0.5)";
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(139,92,246,0.35)";
      }}
      aria-label="Neue Erinnerung hinzufügen"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
      </svg>
    </button>
  </div>

</div>

<!-- ── Add Reminder Modal ──────────────────────────────────────────────────── -->
{#if showAddModal}
  <!-- Backdrop (z-49) handles close-on-click -->
  <button
    class="fixed inset-0 z-[49] w-full cursor-default"
    style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
    onclick={closeModal}
    tabindex="-1"
    aria-label="Modal schließen"
    transition:fade={{ duration: 180 }}
  ></button>

  <!-- Modal positioner (pointer-events-none so clicks pass through to backdrop) -->
  <div
    class="fixed inset-0 z-[50] flex items-end justify-center pb-4 px-4 pointer-events-none"
    transition:fade={{ duration: 10 }}
    role="dialog"
    aria-modal="true"
    aria-label="Erinnerung hinzufügen"
  >
    <!-- Modal card (pointer-events-auto, no onclick needed) -->
    <div
      class="pointer-events-auto w-full max-w-sm rounded-3xl p-5"
      style="background: rgba(18,12,36,0.95); border: 1px solid var(--glass-border);
             backdrop-filter: blur(40px);"
      in:fly={{ y: 40, duration: 260, easing: cubicOut }}
      out:fly={{ y: 40, duration: 200, easing: cubicInOut }}
      role="document"
    >
      <!-- Modal header -->
      <div class="flex items-center justify-between mb-5">
        <p class="text-sm font-semibold" style="color: var(--text-primary);">Erinnerung hinzufügen</p>
        <button
          onclick={closeModal}
          class="w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer
                 transition-colors duration-150"
          style="color: var(--text-muted);"
          onmouseenter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onmouseleave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          aria-label="Abbrechen"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Title input -->
      <div class="mb-3">
        <input
          bind:this={inputRef}
          bind:value={newTitle}
          type="text"
          placeholder="Was möchtest du nicht vergessen?"
          maxlength="80"
          class="w-full text-sm px-3.5 py-2.5 rounded-xl outline-none transition-all duration-150"
          style="background: var(--glass-bg); border: 1px solid var(--glass-border);
                 color: var(--text-primary); placeholder-color: var(--text-faint);"
          onfocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
          onblur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          onkeydown={(e) => e.key === "Enter" && canSave && addReminder()}
          aria-label="Titel der Erinnerung"
        />
      </div>

      <!-- Time + Priority row -->
      <div class="flex gap-2.5 mb-3">
        <!-- Time -->
        <div class="flex-1">
          <input
            bind:value={newTime}
            type="time"
            class="w-full text-sm px-3.5 py-2.5 rounded-xl outline-none transition-all duration-150 cursor-pointer"
            style="background: var(--glass-bg); border: 1px solid var(--glass-border);
                   color: var(--text-primary); color-scheme: dark;"
            onfocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
            onblur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
            aria-label="Uhrzeit"
          />
        </div>

        <!-- Priority picker -->
        <div class="flex items-center gap-1.5 px-3 rounded-xl" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
          {#each priorityOptions as opt}
            <button
              onclick={() => (newPriority = opt.value)}
              class="w-4 h-4 rounded-full cursor-pointer transition-all duration-150 shrink-0"
              style="background: {opt.color};
                     opacity: {newPriority === opt.value ? 1 : 0.25};
                     transform: scale({newPriority === opt.value ? 1.2 : 1});"
              title={opt.label}
              aria-label="Priorität: {opt.label}"
              aria-pressed={newPriority === opt.value}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Description -->
      <div class="mb-5">
        <input
          bind:value={newDescription}
          type="text"
          placeholder="Beschreibung (optional)"
          maxlength="120"
          class="w-full text-sm px-3.5 py-2.5 rounded-xl outline-none transition-all duration-150"
          style="background: var(--glass-bg); border: 1px solid var(--glass-border);
                 color: var(--text-primary);"
          onfocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
          onblur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          onkeydown={(e) => e.key === "Enter" && canSave && addReminder()}
          aria-label="Beschreibung"
        />
      </div>

      <!-- Save button -->
      <button
        onclick={addReminder}
        disabled={!canSave}
        class="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer
               transition-all duration-200"
        style="background: {canSave ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'rgba(255,255,255,0.06)'};
               color: {canSave ? 'white' : 'var(--text-faint)'};
               opacity: {canSave ? 1 : 0.6};
               cursor: {canSave ? 'pointer' : 'not-allowed'}"
        aria-disabled={!canSave}
      >
        Hinzufügen
      </button>
    </div>
  </div>
{/if}
