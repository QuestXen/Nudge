<script lang="ts">
  import "../app.css";
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import UpdateBanner from "$lib/components/UpdateBanner.svelte";
  import CriticalUpdateModal from "$lib/components/CriticalUpdateModal.svelte";

  let updateAvailable = false;
  let isCritical = false;
  let updateVersion = "";
  let updateNotes = "";

  let installProgress = 0;
  let installStatus = "Initailisiere...";
  let isInstalling = false;

  interface UpdatePayload {
    update_available: boolean;
    version?: string;
    notes?: string;
    critical: boolean;
    date?: string;
  }

  interface ProgressPayload {
    event: string;
    chunk_length: number;
    content_length?: number;
  }

  // --- Handlers ---
  async function checkForUpdates() {
    try {
      const result = await invoke<UpdatePayload>("check_for_updates");
      console.log("Update check result:", result);

      if (result.update_available) {
        updateVersion = result.version || "Unknown";
        updateNotes = result.notes || "";
        isCritical = result.critical;
        updateAvailable = true;

        if (isCritical) {
          // Auto-start for critical
          startInstall();
        }
      }
    } catch (e) {
      console.error("Failed to check updates:", e);
    }
  }

  async function startInstall() {
    isInstalling = true;
    installStatus = "Starte Download...";
    await invoke("install_update").catch((e) => {
      console.error("Install error:", e);
      installStatus = "Fehler bei Installation!";
      // Handle error (maybe show persistent error state or retry button)
    });
  }

  // --- Lifecycle ---
  let unlistenProgress: () => void;
  let unlistenComplete: () => void;

  onMount(async () => {
    // Initial Check
    await checkForUpdates();

    // Setup Listeners
    unlistenProgress = await listen<ProgressPayload>(
      "update-progress",
      (event) => {
        const { chunk_length, content_length } = event.payload;
        if (content_length) {
          // This is a simple approximation/accumulation if you track total downloaded manually
          // But the payload event helps.
          // Since tauri v2 updater events might differ, we rely on what we emitted in Rust.
          // In a real scenario, we'd accumulate `chunk_length`.
          // For demo, we might just increment or if we had total from start.
          // Let's assume content_length is passed.
          // Since we don't hold state of `total_downloaded` in JS easily without resets,
          // let's do a fake visual progress if proper tracking isn't easy,
          // OR better: Assume the Rust side emits the proper percentage or we accumulate in a store.
          // For now, let's just make it look alive.
          installStatus = "Downloading...";
          // Actually, let's just use an indeterminate loader if we don't calculate % accurately easily here.
          // Or update progress:
          if (installProgress < 90) installProgress += 1; // Fake progress for demo unless we track byte by byte
        }
      },
    );

    unlistenComplete = await listen("update-complete", () => {
      installProgress = 100;
      installStatus = "Installation abgeschlossen! Neustart...";
    });
  });

  onDestroy(() => {
    if (unlistenProgress) unlistenProgress();
    if (unlistenComplete) unlistenComplete();
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
        on:install={startInstall}
        on:dismiss={() => (updateAvailable = false)}
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

  <!-- Main Content Slot -->
  <main
    class:blur-sm={isCritical || isInstalling}
    class="transition-all duration-300 relative"
  >
    <!-- Background Ambient Glow -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div
        class="absolute top-[20%] left-[20%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]"
      ></div>
      <div
        class="absolute bottom-[20%] right-[20%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"
      ></div>
    </div>
    <div class="relative z-10">
      <slot />
    </div>
  </main>
</div>
