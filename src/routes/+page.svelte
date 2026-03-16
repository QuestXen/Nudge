<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { goto } from "$app/navigation";
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
    { id: "1", title: "Stand-up Meeting",  time: "09:00", description: "Daily sync mit dem Team",            priority: "high",   done: false },
    { id: "2", title: "Design Review",     time: "11:30", description: "UI Mockups mit Product besprechen",  priority: "medium", done: false },
    { id: "3", title: "Mittagspause",      time: "12:30",                                                    priority: "low",    done: false },
    { id: "4", title: "PR Review",         time: "15:00", description: "Feature Branch reviewen",            priority: "medium", done: false },
    { id: "5", title: "Deploy Staging",    time: "17:00", description: "Release Candidate pushen",           priority: "high",   done: false },
  ]);

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
      <span class="text-sm font-semibold tracking-tight text-white">nudge</span>
    </div>

    <div class="flex items-center gap-1.5">
      <!-- Add button -->
      <button
        onclick={openModal}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer
               bg-zinc-900 border border-zinc-800 text-zinc-400
               hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700 transition-colors duration-150"
        aria-label="Neue Erinnerung"
      >
        <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/>
        </svg>
        Hinzufügen
      </button>

      <!-- Settings -->
      <button
        onclick={() => goto("/settings")}
        class="flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 cursor-pointer
               hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
        aria-label="Einstellungen"
      >
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.257.646 6.854.095 7.599.03 7.732.01 7.866 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.107c-.072.277-.27.543-.567.705-.02.01-.041.022-.062.033a4.249 4.249 0 0 0-.498.29c-.283.19-.570.339-.887.409l-1.102-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.203.2.332.492.308.787a5.092 5.092 0 0 0 0 .562c.024.295-.105.588-.308.788l-.815.806c-.08.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.317-.07.604.019.887.409.158.107.32.206.498.29l.062.033c.296.162.495.428.567.705l.289 1.107c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.107c.072-.277.27-.543.567-.705.02-.01.041-.022.062-.033.179-.085.34-.184.498-.29.283-.19.57-.339.887-.409l1.102.303c.11.03.175-.016.195-.045.22-.313.413-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.203-.2-.332-.492-.308-.787a5.092 5.092 0 0 0 0-.562c-.024-.295.105-.588.308-.788l.815-.806c.08-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.317.07-.604-.019-.887-.409a4.834 4.834 0 0 0-.498-.29l-.062-.033c-.296-.162-.495-.428-.567-.705L8.704 1.67c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>
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
      <div class="flex flex-col items-center justify-center h-40 text-center border border-zinc-800 rounded-lg"
           in:fade={{ duration: 200 }}>
        <p class="text-sm text-zinc-500">Keine offenen Erinnerungen</p>
        <p class="text-xs text-zinc-700 mt-1">
          <button onclick={openModal} class="underline cursor-pointer hover:text-zinc-500 transition-colors duration-150">
            Erinnerung hinzufügen
          </button>
        </p>
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
