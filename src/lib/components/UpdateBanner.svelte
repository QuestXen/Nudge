<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher } from "svelte";

  export let version: string;
  export let notes: string = "";

  const dispatch = createEventDispatcher();

  function handleInstall() {
    dispatch("install");
  }

  function handleDismiss() {
    dispatch("dismiss");
  }
</script>

<div
  class="fixed top-0 left-0 right-0 z-50 p-4"
  in:fly={{ y: -50, duration: 500 }}
  out:fade
>
  <div
    class="glass-card flex items-center justify-between p-4 shadow-2xl bg-opacity-90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden relative"
  >
    <!-- Animated Gradient Border/Glow -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none"
    ></div>

    <div class="flex items-center space-x-4 z-10">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg animate-pulse"
        style="background: linear-gradient(135deg, #667eea, #764ba2);"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-6 h-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <div>
        <h3 class="text-white font-semibold text-lg">Update verfügbar ✨</h3>
        <p class="text-gray-300 text-sm">Version {version} ist bereit.</p>
        {#if notes}
          <div class="text-xs text-gray-400 mt-1 max-w-md truncate">
            {notes.substring(0, 60)}...
          </div>
        {/if}
      </div>
    </div>

    <div class="flex items-center space-x-3 z-10">
      <button
        on:click={handleDismiss}
        class="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
      >
        Später
      </button>
      <button
        on:click={handleInstall}
        class="px-5 py-2 rounded-lg text-white shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-bold flex items-center space-x-2"
        style="background: linear-gradient(135deg, #667eea, #764ba2);"
      >
        <span>Installieren</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .glass-card {
    background: #1a1a2e;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid #16213e;
    border-radius: 20px;
  }
</style>
