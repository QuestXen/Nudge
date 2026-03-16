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
    date?: string;
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

  // SVG ring math for progress indicator
  const RING_R = 5;
  const RING_C = 2 * Math.PI * RING_R; // ≈ 31.4

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

  const showPill = $derived((updateAvailable || isInstalling) && !dismissed);
  const dashoffset = $derived(RING_C * (1 - installProgress / 100));
</script>

<!-- Ambient background glow -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
  <div
    class="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px]"
    style="background: rgba(139,92,246,0.12)"
  ></div>
  <div
    class="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-[120px]"
    style="background: rgba(59,130,246,0.10)"
  ></div>
  <div
    class="absolute top-1/2 left-1/3 w-64 h-64 rounded-full blur-[100px]"
    style="background: rgba(139,92,246,0.06)"
  ></div>
</div>

<!-- Update Pill -->
{#if showPill}
  <div class="fixed top-3 right-3 z-[100]" transition:fade={{ duration: 200 }}>
    {#if isInstalling}
      <!-- Progress pill (non-dismissable) -->
      <div
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium"
        style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.25); color: rgb(252,211,77);"
      >
        <!-- SVG ring progress -->
        <svg class="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
          <circle
            cx="6" cy="6" r={RING_R}
            fill="none"
            stroke="currentColor"
            stroke-opacity="0.25"
            stroke-width="1.5"
          />
          <circle
            cx="6" cy="6" r={RING_R}
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-dasharray={RING_C}
            stroke-dashoffset={dashoffset}
            style="transition: stroke-dashoffset 300ms ease"
          />
        </svg>
        <span>{installProgress < 100 ? `${installProgress}%` : "Neustart…"}</span>
      </div>
    {:else if isCritical}
      <!-- Critical pill (auto-installing soon) -->
      <div
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium"
        style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.25); color: rgb(252,165,165);"
        role="status"
      >
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        Kritisches Update
      </div>
    {:else}
      <!-- Normal update pill (dismissable) -->
      <button
        onclick={startInstall}
        class="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full text-xs font-medium cursor-pointer group"
        style="background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.2); color: rgb(196,181,253); transition: background 200ms, border-color 200ms;"
        onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.22)')}
        onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.12)')}
        aria-label="Update auf v{updateVersion} installieren"
      >
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
        </svg>
        <span>v{updateVersion}</span>
        <!-- Dismiss -->
        <span
          role="button"
          tabindex="0"
          onclick={(e) => { e.stopPropagation(); dismissed = true; }}
          onkeydown={(e) => e.key === 'Enter' && (dismissed = true)}
          class="ml-0.5 p-0.5 rounded-full opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Schließen"
        >
          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </span>
      </button>
    {/if}
  </div>
{/if}

<!-- Page content -->
<div class="relative z-10 h-screen">
  {@render children()}
</div>
