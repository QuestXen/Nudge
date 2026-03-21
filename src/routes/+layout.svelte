<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { invoke } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { initStorage } from "$lib/storage";
  import { initLanguage, t, getLanguage } from "$lib/i18n.svelte";
  import { appSettings, loadAppSettings } from "$lib/appSettings.svelte";
  import { ui } from "$lib/ui.svelte";
  import { reminderStore, loadReminders, saveReminders } from "$lib/reminders.svelte";
  import { computeNextTrigger, initNotificationPermission, checkAndFireNotifications } from "$lib/reminder-utils";

  let { children }: { children: Snippet } = $props();

  // ── Sidebar resize ────────────────────────────────────────────────────────
  const SIDEBAR_EXPANDED  = 240;
  const SIDEBAR_COLLAPSED = 64;
  const COLLAPSE_THRESHOLD = 152; // midpoint — crossing this toggles state

  let collapsed = $state(false);
  const sidebarWidth = $derived(collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

  function startDrag(e: MouseEvent) {
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      collapsed = ev.clientX < COLLAPSE_THRESHOLD;
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Update state ──────────────────────────────────────────────────────────
  let updateAvailable = $state(false);
  let isCritical      = $state(false);
  let updateVersion   = $state("");
  let installProgress = $state(0);
  let isInstalling    = $state(false);
  let dismissed       = $state(false);

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
        updateVersion   = result.version ?? "";
        isCritical      = result.critical;
        updateAvailable = true;
        dismissed       = false;
        if (isCritical) startInstall();
      }
    } catch (e) { console.error("Update-Check fehlgeschlagen:", e); }
  }

  async function startInstall() {
    isInstalling    = true;
    installProgress = 0;
    try { await invoke("install_update"); }
    catch (e) { console.error("Installationsfehler:", e); isInstalling = false; }
  }

  const RING_R    = 5;
  const RING_C    = 2 * Math.PI * RING_R;
  const dashoffset = $derived(RING_C * (1 - installProgress / 100));
  const showPill   = $derived((updateAvailable || isInstalling) && !dismissed);

  let unlistenProgress: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;
  let notifInterval: ReturnType<typeof setInterval> | undefined;

  onMount(async () => {
    await initStorage();           // must be first — sets up %APPDATA%\Kavoma\Nudge\
    await initLanguage();
    await loadAppSettings();
    await loadReminders(computeNextTrigger);
    await initNotificationPermission();

    unlistenProgress = await listen<ProgressPayload>("update-progress", (e) => {
      installProgress = Math.min(Math.round(e.payload.percent), 99);
    });
    unlistenComplete = await listen("update-complete", () => { installProgress = 100; });
    await checkForUpdates();

    // Check notifications every 30 seconds (respects user preference)
    notifInterval = setInterval(async () => {
      if (!appSettings.notificationsEnabled) return;
      let changed = false;
      await checkAndFireNotifications(reminderStore.reminders, () => { changed = true; });
      if (changed) await saveReminders();
    }, 30_000);
  });
  onDestroy(() => {
    unlistenProgress?.();
    unlistenComplete?.();
    if (notifInterval) clearInterval(notifInterval);
  });

  // ── Date ─────────────────────────────────────────────────────────────────
  const today = new Date();
  const locale = $derived(getLanguage() === "en" ? "en-GB" : "de-DE");
  const dateWeekday = $derived(
    today.toLocaleDateString(locale, { weekday: "long" }).toUpperCase()
  );
  const dateDay = $derived(
    today.toLocaleDateString(locale, { day: "numeric", month: "long" })
  );

  // ── Nav ───────────────────────────────────────────────────────────────────
  const isReminders = $derived(page.url.pathname === "/");
  const isDashboard = $derived(page.url.pathname.startsWith("/dashboard"));
  const isSettings  = $derived(page.url.pathname.startsWith("/settings"));

  function handleAddClick() {
    if (!isReminders) goto("/");
    ui.showAddModal = true;
  }
</script>

<div
  class="flex h-screen bg-background text-on-surface overflow-hidden relative"
>

  <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
  <aside
    class="relative flex flex-col h-screen shrink-0 bg-background/80 backdrop-blur-xl
           border-r border-outline-variant/15 overflow-hidden"
    style="width: {sidebarWidth}px; transition: width 220ms cubic-bezier(0.4,0,0.2,1);"
  >

    <!-- Logo + Date -->
    <div class="px-5 pt-6 pb-8 shrink-0 overflow-hidden">
      {#if collapsed}
        <div class="flex items-center justify-center">
          <span class="text-xl font-bold text-primary tracking-tight">N</span>
        </div>
      {:else}
        <h1 class="text-xl font-bold text-primary tracking-tight whitespace-nowrap">NUDGE</h1>
        <p class="text-[10px] text-on-surface/40 font-semibold uppercase tracking-[0.2em] mt-1 whitespace-nowrap">
          {dateWeekday} · {dateDay}
        </p>
      {/if}
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 space-y-1 overflow-hidden">

      <a
        href="/"
        class="flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 overflow-hidden
               {collapsed ? 'justify-center px-0' : 'px-4'}
               {isReminders
                 ? 'text-primary font-semibold bg-surface-variant/50 border-r-2 border-primary'
                 : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-variant/50'}"
        title={collapsed ? "Reminders" : ""}
      >
        <span class="material-symbols-outlined shrink-0">notifications</span>
        {#if !collapsed}
          <span class="text-sm whitespace-nowrap overflow-hidden">Reminders</span>
        {/if}
      </a>

      <a
        href="/dashboard"
        class="flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 overflow-hidden
               {collapsed ? 'justify-center px-0' : 'px-4'}
               {isDashboard
                 ? 'text-primary font-semibold bg-surface-variant/50 border-r-2 border-primary'
                 : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-variant/50'}"
        title={collapsed ? t().dashboard : ""}
      >
        <span class="material-symbols-outlined shrink-0">dashboard</span>
        {#if !collapsed}
          <span class="text-sm whitespace-nowrap overflow-hidden">{t().dashboard}</span>
        {/if}
      </a>

      <a
        href="/settings"
        class="flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 overflow-hidden
               {collapsed ? 'justify-center px-0' : 'px-4'}
               {isSettings
                 ? 'text-primary font-semibold bg-surface-variant/50 border-r-2 border-primary'
                 : 'text-on-surface/50 hover:text-on-surface hover:bg-surface-variant/50'}"
        title={collapsed ? "Settings" : ""}
      >
        <span class="material-symbols-outlined shrink-0">settings</span>
        {#if !collapsed}
          <span class="text-sm whitespace-nowrap overflow-hidden">Settings</span>
        {/if}
      </a>

    </nav>

    <!-- Add Button -->
    <div class="px-3 pb-6 shrink-0">
      <button
        onclick={handleAddClick}
        class="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed
               font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center
               justify-center gap-2 cursor-pointer overflow-hidden"
        title={collapsed ? t().add : ""}
      >
        <span class="material-symbols-outlined shrink-0">add</span>
        {#if !collapsed}
          <span class="text-sm whitespace-nowrap">{t().add}</span>
        {/if}
      </button>
    </div>

    <!-- Drag handle -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="separator"
      aria-label="Sidebar-Größe anpassen"
      aria-orientation="vertical"
      class="absolute inset-y-0 right-0 w-1.5 cursor-col-resize z-10
             hover:bg-primary/20 active:bg-primary/30 transition-colors duration-150"
      onmousedown={startDrag}
    ></div>

  </aside>

  <!-- ── Main content ────────────────────────────────────────────────────── -->
  <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
    {@render children()}
    <!-- Decorative glows -->
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-primary-container/10 blur-[100px] rounded-full pointer-events-none"></div>
    <div class="absolute top-1/2 -left-24 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
  </div>

  <!-- ── Update Pill ─────────────────────────────────────────────────────── -->
  {#if showPill}
    <div class="fixed top-3 right-3 z-50" transition:fade={{ duration: 150 }}>
      {#if isInstalling}
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                 bg-surface-container-highest border border-outline-variant/20 text-on-surface/70"
          role="status"
        >
          <svg class="w-3 h-3 -rotate-90 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r={RING_R} fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.5"/>
            <circle cx="6" cy="6" r={RING_R} fill="none" stroke="#d0bcff" stroke-width="1.5" stroke-linecap="round"
                    stroke-dasharray={RING_C} stroke-dashoffset={dashoffset}
                    style="transition: stroke-dashoffset 300ms ease"/>
          </svg>
          {installProgress < 100 ? `${installProgress}%` : "Neustart…"}
        </div>
      {:else if isCritical}
        <div
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                 bg-surface-container-highest border border-outline-variant/20 text-primary"
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
          class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium
                 bg-surface-container-highest border border-outline-variant/20 text-on-surface/50 cursor-pointer
                 hover:border-primary/30 hover:text-primary transition-colors duration-150"
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
            class="ml-0.5 p-0.5 rounded hover:text-primary transition-colors duration-150"
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

</div>
