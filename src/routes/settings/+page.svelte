<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getVersion } from "@tauri-apps/api/app";
  import Toggle from "$lib/components/Toggle.svelte";
  import { fade } from "svelte/transition";

  // ── App info ───────────────────────────────────────────────────────────────
  let appVersion = $state("…");

  // ── Settings state ─────────────────────────────────────────────────────────
  let notificationsEnabled = $state(true);
  let soundEnabled         = $state(false);
  let autostart            = $state(false);

  // ── Update check ───────────────────────────────────────────────────────────
  let checkStatus = $state<"idle" | "checking" | "available" | "uptodate" | "error">("idle");
  let updateVersion = $state("");

  interface UpdatePayload {
    update_available: boolean;
    version?: string;
    critical: boolean;
  }

  async function checkForUpdates() {
    checkStatus = "checking";
    try {
      const result = await invoke<UpdatePayload>("check_for_updates");
      if (result.update_available) {
        checkStatus = "available";
        updateVersion = result.version ?? "";
      } else {
        checkStatus = "uptodate";
      }
    } catch {
      checkStatus = "error";
    }
  }

  async function installUpdate() {
    try {
      await invoke("install_update");
    } catch (e) {
      console.error(e);
    }
  }

  onMount(async () => {
    try {
      appVersion = await getVersion();
    } catch {
      appVersion = "1.0.3";
    }
  });

  // Settings row helper
  interface SettingRow {
    label: string;
    value: string;
  }
</script>

<div class="flex flex-col h-screen" in:fade={{ duration: 120 }}>

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="flex items-center gap-3 px-4 h-12 border-b border-zinc-800 shrink-0">
    <button
      onclick={() => goto("/")}
      class="flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 cursor-pointer
             hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150 -ml-1"
      aria-label="Zurück"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"/>
      </svg>
    </button>
    <span class="text-sm font-medium text-zinc-100">Einstellungen</span>
  </header>

  <!-- ── Content ─────────────────────────────────────────────────────────── -->
  <main class="flex-1 overflow-y-auto">

    <!-- Section: Allgemein -->
    <section class="px-4 pt-5 pb-2">
      <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Allgemein</h2>
      <div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">

        <!-- Autostart -->
        <div class="px-4 bg-zinc-900/40">
          <Toggle
            label="Beim Systemstart öffnen"
            description="Nudge startet automatisch mit Windows"
            bind:checked={autostart}
          />
        </div>

        <!-- Language — static row -->
        <div class="flex items-center justify-between px-4 py-3 bg-zinc-900/40">
          <span class="text-sm text-zinc-100">Sprache</span>
          <span class="text-sm text-zinc-500 font-mono">Deutsch</span>
        </div>

      </div>
    </section>

    <!-- Section: Benachrichtigungen -->
    <section class="px-4 pt-4 pb-2">
      <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Benachrichtigungen</h2>
      <div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">

        <div class="px-4 bg-zinc-900/40">
          <Toggle
            label="System-Benachrichtigungen"
            description="Zeigt Desktop-Benachrichtigungen für Erinnerungen"
            bind:checked={notificationsEnabled}
          />
        </div>

        <div class="px-4 bg-zinc-900/40">
          <Toggle
            label="Ton"
            description="Spielt einen Ton bei Erinnerungen ab"
            bind:checked={soundEnabled}
            disabled={!notificationsEnabled}
          />
        </div>

      </div>
    </section>

    <!-- Section: Updates -->
    <section class="px-4 pt-4 pb-2">
      <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Updates</h2>
      <div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">

        <div class="flex items-center justify-between px-4 py-3 bg-zinc-900/40">
          <div>
            <span class="text-sm text-zinc-100">Update-Status</span>
            {#if checkStatus === "uptodate"}
              <p class="text-xs text-zinc-500 mt-0.5">App ist aktuell</p>
            {:else if checkStatus === "available"}
              <p class="text-xs text-zinc-400 mt-0.5">v{updateVersion} verfügbar</p>
            {:else if checkStatus === "error"}
              <p class="text-xs text-zinc-600 mt-0.5">Prüfung fehlgeschlagen</p>
            {:else if checkStatus === "checking"}
              <p class="text-xs text-zinc-600 mt-0.5">Wird geprüft…</p>
            {/if}
          </div>

          {#if checkStatus === "available"}
            <button
              onclick={installUpdate}
              class="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer
                     bg-white text-zinc-900 hover:bg-zinc-100 transition-colors duration-150"
            >
              Installieren
            </button>
          {:else}
            <button
              onclick={checkForUpdates}
              disabled={checkStatus === "checking"}
              class="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer
                     border border-zinc-800 text-zinc-400 bg-zinc-900
                     hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors duration-150"
            >
              {checkStatus === "checking" ? "Prüfe…" : "Prüfen"}
            </button>
          {/if}
        </div>

      </div>
    </section>

    <!-- Section: Info -->
    <section class="px-4 pt-4 pb-6">
      <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Info</h2>
      <div class="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">

        <div class="flex items-center justify-between px-4 py-3 bg-zinc-900/40">
          <span class="text-sm text-zinc-100">Version</span>
          <span class="text-sm text-zinc-500 font-mono">{appVersion}</span>
        </div>

        <div class="flex items-center justify-between px-4 py-3 bg-zinc-900/40">
          <span class="text-sm text-zinc-100">Entwickler</span>
          <span class="text-sm text-zinc-500 font-mono">a-kaufm</span>
        </div>

        <div class="flex items-center justify-between px-4 py-3 bg-zinc-900/40">
          <span class="text-sm text-zinc-100">Plattform</span>
          <span class="text-sm text-zinc-500 font-mono">Windows · Tauri v2</span>
        </div>

      </div>
    </section>

  </main>
</div>
