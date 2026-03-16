<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import UpdateBanner from "$lib/components/UpdateBanner.svelte";
  import CriticalUpdateModal from "$lib/components/CriticalUpdateModal.svelte";

  let { children }: { children: Snippet } = $props();

  let updateAvailable = $state(false);
  let isCritical = $state(false);
  let updateVersion = $state("");
  let updateNotes = $state("");
  let installProgress = $state(0);
  let installStatus = $state("Initialisiere...");
  let isInstalling = $state(false);

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
        updateVersion = result.version ?? "Unbekannt";
        updateNotes = result.notes ?? "";
        isCritical = result.critical;
        updateAvailable = true;

        if (isCritical) {
          startInstall();
        }
      }
    } catch (e) {
      console.error("Update-Check fehlgeschlagen:", e);
    }
  }

  async function startInstall() {
    isInstalling = true;
    installProgress = 0;
    installStatus = "Starte Download...";
    try {
      await invoke("install_update");
    } catch (e) {
      console.error("Installationsfehler:", e);
      installStatus = "Fehler bei der Installation!";
      isInstalling = false;
    }
  }

  let unlistenProgress: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;

  onMount(async () => {
    // Listener ZUERST registrieren, damit bei kritischem Update kein Event verpasst wird
    unlistenProgress = await listen<ProgressPayload>("update-progress", (event) => {
      installProgress = Math.min(Math.round(event.payload.percent), 99);
      installStatus = "Wird heruntergeladen...";
    });

    unlistenComplete = await listen("update-complete", () => {
      installProgress = 100;
      installStatus = "Installation abgeschlossen! Neustart...";
    });

    await checkForUpdates();
  });

  onDestroy(() => {
    unlistenProgress?.();
    unlistenComplete?.();
  });
</script>

<div
  class="app-layout min-h-screen bg-[#0f0f1e] text-white font-sans antialiased overflow-hidden selection:bg-purple-500 selection:text-white"
>
  {#if updateAvailable && !isCritical && !isInstalling}
    <div class="fixed top-0 left-0 right-0 z-50">
      <UpdateBanner
        version={updateVersion}
        notes={updateNotes}
        oninstall={startInstall}
        ondismiss={() => (updateAvailable = false)}
      />
    </div>
  {/if}

  {#if isCritical || isInstalling}
    <CriticalUpdateModal
      version={updateVersion}
      progress={installProgress}
      statusMessage={installStatus}
    />
  {/if}

  <main
    class:blur-sm={isCritical || isInstalling}
    class="transition-all duration-300 relative"
  >
    <div class="fixed inset-0 pointer-events-none z-0">
      <div
        class="absolute top-[20%] left-[20%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]"
      ></div>
      <div
        class="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"
      ></div>
    </div>
    <div class="relative z-10">
      {@render children()}
    </div>
  </main>
</div>
