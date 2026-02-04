<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  export let version: string;
  export let progress: number = 0; // 0 to 100
  export let statusMessage: string = "Bereite Update vor...";
</script>

<div
  class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
  transition:fade
>
  <div
    class="w-full max-w-lg bg-[#0f0f1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
    in:scale={{ duration: 400, easing: cubicOut, start: 0.95 }}
  >
    <!-- Background Decor -->
    <div
      class="absolute top-0 right-0 w-64 h-64 bg-[#764ba2]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"
    ></div>
    <div
      class="absolute bottom-0 left-0 w-64 h-64 bg-[#667eea]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"
    ></div>

    <div class="p-8 relative z-10 text-center">
      <div
        class="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-3"
        style="background: linear-gradient(135deg, #fbbf24, #f59e0b);"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-10 h-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 class="text-3xl font-bold text-white mb-2">Kritisches Update</h2>
      <p class="text-gray-400 mb-8">
        Ein wichtiges Sicherheits-Update (v{version}) wird installiert. Die App
        wird nach Abschluss automatisch neu gestartet.
      </p>

      <!-- Progress Bar -->
      <div
        class="relative w-full h-4 bg-[#16213e] rounded-full overflow-hidden mb-4 border border-white/5"
      >
        <div
          class="absolute top-0 left-0 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(118,75,162,0.5)]"
          style="width: {progress}%; background: linear-gradient(90deg, #667eea, #764ba2);"
        >
          <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      <p class="text-sm text-gray-500 font-mono">
        {statusMessage} ({Math.round(progress)}%)
      </p>
    </div>
  </div>
</div>
