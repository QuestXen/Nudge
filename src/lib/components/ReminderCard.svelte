<script lang="ts">
  import { fly } from "svelte/transition";

  interface Reminder {
    id: string;
    title: string;
    time: string;
    description?: string;
    priority: "low" | "medium" | "high";
    done: boolean;
  }

  let {
    reminder,
    oncomplete,
    onsnooze,
  }: {
    reminder: Reminder;
    oncomplete: (id: string) => void;
    onsnooze: (id: string) => void;
  } = $props();

  // Monochrome priority — left border intensity only
  const priorityBorder: Record<string, string> = {
    high:   "border-l-zinc-100",
    medium: "border-l-zinc-600",
    low:    "border-l-zinc-800",
  };

  const priorityLabel: Record<string, string> = {
    high:   "Hoch",
    medium: "Mittel",
    low:    "Niedrig",
  };

  let completing = $state(false);

  function handleComplete() {
    completing = true;
    setTimeout(() => oncomplete(reminder.id), 250);
  }
</script>

{#if !completing}
  <div
    class="group flex items-start gap-3 px-4 py-3 border-l-2 transition-colors duration-150
           hover:bg-zinc-900/60 cursor-default {priorityBorder[reminder.priority] ?? 'border-l-zinc-800'}"
    in:fly={{ y: 8, duration: 200 }}
    out:fly={{ x: 40, duration: 200, opacity: 0 }}
    role="article"
    aria-label="{reminder.title}, {reminder.time}"
  >
    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline justify-between gap-4">
        <span class="text-sm font-medium text-zinc-100 truncate">{reminder.title}</span>
        <span class="font-mono text-xs text-zinc-500 shrink-0 tabular-nums">{reminder.time}</span>
      </div>
      {#if reminder.description}
        <p class="text-xs text-zinc-500 mt-0.5 truncate">{reminder.description}</p>
      {/if}
    </div>

    <!-- Actions (always visible, subtle until hover) -->
    <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <!-- Snooze +15 min -->
      <button
        onclick={() => onsnooze(reminder.id)}
        class="flex items-center justify-center w-6 h-6 rounded text-zinc-600 cursor-pointer
               hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
        title="+15 Min"
        aria-label="{reminder.title} um 15 Minuten verschieben"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3.25a.75.75 0 0 1 .75.75v2.69l1.28 1.28a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L7.47 9.03A.75.75 0 0 1 7.25 8.5v-3a.75.75 0 0 1 .75-.75Z"/>
        </svg>
      </button>

      <!-- Done -->
      <button
        onclick={handleComplete}
        class="flex items-center justify-center w-6 h-6 rounded text-zinc-600 cursor-pointer
               hover:text-white hover:bg-zinc-800 transition-colors duration-150"
        title="Erledigt"
        aria-label="{reminder.title} als erledigt markieren"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
        </svg>
      </button>
    </div>
  </div>
{/if}
