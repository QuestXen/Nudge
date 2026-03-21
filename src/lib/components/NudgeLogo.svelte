<script lang="ts">
  let { size = 20, class: className = "" }: { size?: number; class?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  class={className}
  aria-hidden="true"
>
  <defs>
    <linearGradient id="nudge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d0bcff" />
      <stop offset="100%" stop-color="#7a49e4" />
    </linearGradient>
  </defs>

  <!-- Bell body -->
  <path
    d="M12 4C12 4 10 4 10 6V11C10 11 10 13 12 13C14 13 14 11 14 11V6C14 4 12 4 12 4Z"
    stroke="url(#nudge-grad)"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Bell base arc -->
  <path
    d="M8 13C6.5 13 5 14.5 5 16.5C5 18.5 6.5 20 8 20H16C17.5 20 19 18.5 19 16.5C19 14.5 17.5 13 16 13"
    stroke="url(#nudge-grad)"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Clapper dot -->
  <circle cx="12" cy="17" r="1" fill="#d0bcff" />

  <!-- Top stem -->
  <path d="M12 2V4" stroke="#7a49e4" stroke-width="1.5" stroke-linecap="round" />
</svg>
