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

  const priorityBar: Record<string, string> = {
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#22C55E",
  };

  const priorityLabel: Record<string, string> = {
    high: "Hoch",
    medium: "Mittel",
    low: "Niedrig",
  };

  let completing = $state(false);

  function handleComplete() {
    completing = true;
    setTimeout(() => oncomplete(reminder.id), 280);
  }
</script>

{#if !completing}
  <div
    class="group relative flex items-start gap-3 rounded-2xl p-4 cursor-default
           transition-all duration-200"
    style="background: var(--glass-bg); border: 1px solid var(--glass-border);
           backdrop-filter: blur(var(--glass-blur));"
    onmouseenter={(e) => (e.currentTarget.style.background = "var(--glass-bg-hover)")}
    onmouseleave={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
    in:fly={{ y: 12, duration: 250, delay: 30 }}
    out:fly={{ x: 60, duration: 260 }}
    role="article"
    aria-label="{reminder.title} um {reminder.time}"
  >
    <!-- Priority accent bar -->
    <div
      class="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
      style="background: {priorityBar[reminder.priority] ?? '#8B5CF6'};"
      aria-label="Priorität: {priorityLabel[reminder.priority]}"
    ></div>

    <!-- Content -->
    <div class="flex-1 min-w-0 pl-2">
      <!-- Time badge -->
      <div class="flex items-center gap-2 mb-1.5">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
          style="background: rgba(139,92,246,0.12); color: rgba(196,181,253,0.9); border: 1px solid rgba(139,92,246,0.15);"
        >
          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>
          </svg>
          {reminder.time}
        </span>
      </div>

      <!-- Title -->
      <p
        class="text-sm font-medium leading-snug truncate"
        style="color: var(--text-primary);"
      >
        {reminder.title}
      </p>

      <!-- Description -->
      {#if reminder.description}
        <p
          class="text-xs mt-1 line-clamp-1"
          style="color: var(--text-muted);"
        >
          {reminder.description}
        </p>
      {/if}
    </div>

    <!-- Actions (visible on hover, always on touch) -->
    <div
      class="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
    >
      <!-- Snooze: +15 min -->
      <button
        onclick={() => onsnooze(reminder.id)}
        class="flex items-center justify-center w-7 h-7 rounded-xl cursor-pointer
               transition-all duration-150"
        style="background: rgba(255,255,255,0.05); color: var(--text-muted);"
        onmouseenter={(e) => {
          e.currentTarget.style.background = "rgba(139,92,246,0.15)";
          e.currentTarget.style.color = "rgb(196,181,253)";
        }}
        onmouseleave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
        title="+15 Min. verschieben"
        aria-label="{reminder.title} um 15 Minuten verschieben"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </button>

      <!-- Done -->
      <button
        onclick={handleComplete}
        class="flex items-center justify-center w-7 h-7 rounded-xl cursor-pointer
               transition-all duration-150"
        style="background: rgba(34,197,94,0.12); color: rgb(74,222,128);"
        onmouseenter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.25)")}
        onmouseleave={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.12)")}
        title="Als erledigt markieren"
        aria-label="{reminder.title} als erledigt markieren"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
      </button>
    </div>
  </div>
{/if}
