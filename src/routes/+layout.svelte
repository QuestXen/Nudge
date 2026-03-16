<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { invoke } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";

  let { children }: { children: Snippet } = $props();

  let updateAvailable = $state(false);
  let isCritical = $state(false);
  let updateVersion = $state("");
  let installProgress = $state(0);
  let isInstalling = $state(false);
  let dismissed = $state(false);

  interface UpdatePayload {
    update_available: boolean;
    version?: string;
    notes?: string;
    critical: boolean;
  }

  interface ProgressPayload {
    downloaded: number;
    total?: number;
    percent: number;
  }

  async function checkForUpdates() {
    try {
      const result = await invoke<UpdatePayload>("check_for_updates");
      if (result.update_available) {
        updateVersion = result.version ?? "";
        isCritical = result.critical;
        updateAvailable = true;
        dismissed = false;
        if (isCritical) startInstall();
      }
    } catch (e) {
      console.error("Update-Check fehlgeschlagen:", e);
    }
  }

  async function startInstall() {
    isInstalling = true;
    installProgress = 0;
    try {
      await invoke("install_update");
    } catch (e) {
      console.error("Installationsfehler:", e);
      isInstalling = false;
    }
  }

  const RING_R = 5;
  const RING_C = 2 * Math.PI * RING_R;
  const dashoffset = $derived(RING_C * (1 - installProgress / 100));
  const showPill = $derived((updateAvailable || isInstalling) && !dismissed);

  let unlistenProgress: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;

  onMount(async () => {
    unlistenProgress = await listen<ProgressPayload>("update-progress", (e) => {
      installProgress = Math.min(Math.round(e.payload.percent), 99);
    });
    unlistenComplete = await listen("update-complete", () => {
      installProgress = 100;
    });
    await checkForUpdates();
  });

  onDestroy(() => {
    unlistenProgress?.();
    unlistenComplete?.();
  });
</script>

<!-- Update pill — fixed top-right, monochrome -->
{#if showPill}
  <div class="fixed top-3 right-3 z-50" transition:fade={{ duration: 150 }}>
    {#if isInstalling}
      <div
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
               bg-zinc-900 border border-zinc-800 text-zinc-300"
        role="status"
      >
        <svg class="w-3 h-3 -rotate-90 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r={RING_R} fill="none" stroke="currentColor"
                  stroke-opacity="0.2" stroke-width="1.5"/>
          <circle cx="6" cy="6" r={RING_R} fill="none" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round"
                  stroke-dasharray={RING_C} stroke-dashoffset={dashoffset}
                  style="transition: stroke-dashoffset 300ms ease"/>
        </svg>
        {installProgress < 100 ? `${installProgress}%` : "Neustart…"}
      </div>
    {:else if isCritical}
      <div
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
               bg-zinc-900 border border-zinc-700 text-white"
        role="status"
      >
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
        </svg>
        Kritisches Update
      </div>
    {:else}
      <button
        onclick={startInstall}
        class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-medium
               bg-zinc-900 border border-zinc-800 text-zinc-400 cursor-pointer
               hover:border-zinc-600 hover:text-zinc-300 transition-colors duration-150"
        aria-label="Update v{updateVersion} installieren"
      >
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
          <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z"/>
        </svg>
        <span>v{updateVersion}</span>
        <span
          role="button"
          tabindex="0"
          onclick={(e) => { e.stopPropagation(); dismissed = true; }}
          onkeydown={(e) => e.key === "Enter" && (dismissed = true)}
          class="ml-0.5 p-0.5 rounded hover:text-white transition-colors duration-150"
          aria-label="Schließen"
        >
          <svg class="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
          </svg>
        </span>
      </button>
    {/if}
  </div>
{/if}

<!-- Page -->
<div class="h-screen bg-zinc-950 text-white">
  {@render children()}
</div>
