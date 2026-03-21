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
  class="flex items-center justify-between py-4 cursor-pointer group"
  class:opacity-40={disabled}
  class:pointer-events-none={disabled}
>
  <div class="flex-1 min-w-0 pr-4">
    <span class="text-sm font-medium text-on-surface">{label}</span>
    {#if description}
      <p class="text-xs text-on-surface-variant mt-0.5">{description}</p>
    {/if}
  </div>

  <div class="relative inline-flex shrink-0">
    <input
      type="checkbox"
      class="sr-only peer"
      bind:checked
      {disabled}
    />
    <!-- Track -->
    <div
      class="w-11 h-6 rounded-full transition-colors duration-150
             bg-surface-variant
             peer-checked:bg-primary-container
             peer-focus-visible:ring-1 peer-focus-visible:ring-primary
             peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background"
    ></div>
    <!-- Thumb -->
    <span
      class="absolute left-[2px] top-[2px] w-5 h-5 rounded-full shadow-sm
             transition-transform duration-150
             bg-on-surface/30 peer-checked:bg-white peer-checked:translate-x-5"
    ></span>
  </div>
</label>
