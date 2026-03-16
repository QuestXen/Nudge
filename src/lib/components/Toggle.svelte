<script lang="ts">
  let {
    checked = $bindable(false),
    label,
    description,
    disabled = false,
  }: {
    checked?: boolean;
    label: string;
    description?: string;
    disabled?: boolean;
  } = $props();
</script>

<label
  class="flex items-center justify-between py-3 cursor-pointer group"
  class:opacity-40={disabled}
  class:pointer-events-none={disabled}
>
  <div class="flex-1 min-w-0 pr-4">
    <span class="text-sm text-zinc-100">{label}</span>
    {#if description}
      <p class="text-xs text-zinc-500 mt-0.5">{description}</p>
    {/if}
  </div>

  <!-- Toggle: pattern from Magic MCP (peer-checked siblings) -->
  <div class="relative inline-flex shrink-0">
    <input
      type="checkbox"
      class="sr-only peer"
      bind:checked
      {disabled}
    />
    <!-- Track -->
    <div
      class="w-9 h-5 rounded-full border transition-colors duration-150
             bg-zinc-800 border-zinc-700
             peer-checked:bg-white peer-checked:border-transparent
             peer-focus-visible:ring-1 peer-focus-visible:ring-white
             peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-zinc-950"
    ></div>
    <!-- Thumb -->
    <span
      class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full shadow-sm
             transition-transform duration-150
             bg-zinc-500 peer-checked:bg-zinc-900 peer-checked:translate-x-4"
    ></span>
  </div>
</label>
