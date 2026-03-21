<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getVersion } from "@tauri-apps/api/app";
  import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
  import Toggle from "$lib/components/Toggle.svelte";
  import { fade } from "svelte/transition";
  import { t, getLanguage, setLanguage, type Language } from "$lib/i18n.svelte";
  import { reminderStore, saveReminders } from "$lib/reminders.svelte";
  import { appSettings, saveAppSettings } from "$lib/appSettings.svelte";

  // ── App info ───────────────────────────────────────────────────────────────
  let appVersion = $state("…");

  function getWindowsArch(): string {
    const ua = navigator.userAgent;
    if (ua.includes("ARM64")) return "ARM64";
    if (ua.includes("Win64") || ua.includes("x64")) return "x64";
    if (ua.includes("WOW64")) return "x86";
    return "x86";
  }

  // ── Settings state ─────────────────────────────────────────────────────────
  // notificationsEnabled & soundEnabled live in appSettings (shared, persisted)
  let autostart       = $state(false);
  let autostartLoaded = $state(false);

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
      appVersion = "–";
    }

    try {
      autostart = await isEnabled();
    } catch {
      autostart = false;
    }
    autostartLoaded = true;
  });

  $effect(() => {
    if (!autostartLoaded) return;
    if (autostart) enable().catch(console.error);
    else           disable().catch(console.error);
  });

  // Persist notification & sound settings whenever they change
  $effect(() => {
    void appSettings.notificationsEnabled;
    void appSettings.soundEnabled;
    saveAppSettings();
  });

  const currentLang = $derived(getLanguage());

  async function switchLanguage(l: Language) {
    await setLanguage(l);
  }

  // ── Categories ────────────────────────────────────────────────────────────
  // Design-system-konforme Kategorie-Farben (MD3 tonal, gut auf dunklem Hintergrund)
  const CATEGORY_COLORS = [
    "#d0bcff", // primary
    "#7a49e4", // primary-container
    "#ffb4ab", // error (coral)
    "#4fc3f7", // light blue
    "#a5d6a7", // light green
    "#ffe082", // amber
    "#f48fb1", // pink
    "#80cbc4", // teal
  ];

  let newCatName  = $state("");
  let newCatColor = $state(CATEGORY_COLORS[0]);
  let showCatForm = $state(false);

  function addCategory() {
    if (!newCatName.trim()) return;
    reminderStore.categories.push({
      id:    crypto.randomUUID(),
      name:  newCatName.trim(),
      color: newCatColor,
    });
    saveReminders();
    newCatName = ""; newCatColor = CATEGORY_COLORS[0]; showCatForm = false;
  }

  function deleteCategory(id: string) {
    const idx = reminderStore.categories.findIndex(c => c.id === id);
    if (idx !== -1) reminderStore.categories.splice(idx, 1);
    // Remove from reminders that use this category
    reminderStore.reminders.forEach(r => { if (r.categoryId === id) r.categoryId = undefined; });
    saveReminders();
  }
</script>

<div class="flex flex-col h-full overflow-hidden" in:fade={{ duration: 120 }}>

  <!-- Top Bar -->
  <header class="flex justify-between items-center w-full px-8 py-5 bg-surface-container-low/60 shrink-0">
    <h2 class="text-lg font-bold tracking-tight text-on-surface">{t().settings}</h2>
  </header>

  <!-- Scrollable Settings Canvas -->
  <div class="flex-1 overflow-y-auto px-8 py-6">
    <div class="max-w-2xl mx-auto space-y-10 pb-16">

      <!-- ALLGEMEIN -->
      <section class="space-y-4">
        <header class="flex flex-col gap-1">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            {t().general}
          </span>
          <h3 class="text-xl font-semibold text-on-surface uppercase tracking-wide">
            {t().general}
          </h3>
        </header>
        <div class="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">

          <!-- Autostart -->
          <div class="px-5 hover:bg-surface-container-high/40 transition-colors">
            <Toggle
              label={t().autostartLabel}
              description={t().autostartDesc}
              bind:checked={autostart}
            />
          </div>

          <!-- Language -->
          <div class="flex items-center justify-between px-5 py-4 hover:bg-surface-container-high/40 transition-colors border-t border-outline-variant/10">
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-on-surface">{t().languageLabel}</span>
            </div>
            <div class="flex p-1 bg-surface-container-highest rounded-lg">
              <button
                onclick={() => switchLanguage("de")}
                class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer
                       {currentLang === 'de'
                         ? 'bg-surface-container-low text-primary shadow-sm'
                         : 'text-on-surface/40 hover:text-on-surface'}"
              >DE</button>
              <button
                onclick={() => switchLanguage("en")}
                class="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer
                       {currentLang === 'en'
                         ? 'bg-surface-container-low text-primary shadow-sm'
                         : 'text-on-surface/40 hover:text-on-surface'}"
              >EN</button>
            </div>
          </div>

        </div>
      </section>

      <!-- BENACHRICHTIGUNGEN -->
      <section class="space-y-4">
        <header class="flex flex-col gap-1">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            Feedback
          </span>
          <h3 class="text-xl font-semibold text-on-surface uppercase tracking-wide">
            {t().notifications}
          </h3>
        </header>
        <div class="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">

          <div class="px-5 hover:bg-surface-container-high/40 transition-colors">
            <Toggle
              label={t().notificationsLabel}
              description={t().notificationsDesc}
              bind:checked={appSettings.notificationsEnabled}
            />
          </div>

          <div class="px-5 hover:bg-surface-container-high/40 transition-colors border-t border-outline-variant/10">
            <Toggle
              label={t().soundLabel}
              description={t().soundDesc}
              bind:checked={appSettings.soundEnabled}
              disabled={!appSettings.notificationsEnabled}
            />
          </div>

        </div>
      </section>

      <!-- UPDATES -->
      <section class="space-y-4">
        <header class="flex flex-col gap-1">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            Wartung
          </span>
          <h3 class="text-xl font-semibold text-on-surface uppercase tracking-wide">
            {t().updates}
          </h3>
        </header>
        <div class="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10 flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="h-10 w-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined">update</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-on-surface">{t().updateStatus}</span>
              {#if checkStatus === "uptodate"}
                <span class="text-xs text-on-surface-variant">{t().upToDate}</span>
              {:else if checkStatus === "available"}
                <span class="text-xs text-primary">v{updateVersion} {t().updateAvailable}</span>
              {:else if checkStatus === "error"}
                <span class="text-xs text-on-surface/40">{t().updateFailed}</span>
              {:else if checkStatus === "checking"}
                <span class="text-xs text-on-surface-variant">{t().checking}</span>
              {:else}
                <span class="text-xs text-on-surface-variant">–</span>
              {/if}
            </div>
          </div>

          {#if checkStatus === "available"}
            <button
              onclick={installUpdate}
              class="px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer
                     bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed
                     hover:opacity-90"
            >
              {t().installBtn}
            </button>
          {:else}
            <button
              onclick={checkForUpdates}
              disabled={checkStatus === "checking"}
              class="px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer
                     bg-surface-container-highest hover:bg-surface-bright text-on-surface
                     border border-outline-variant/10
                     disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checkStatus === "checking" ? t().checkingBtn : t().checkBtn}
            </button>
          {/if}
        </div>
      </section>

      <!-- KATEGORIEN -->
      <section class="space-y-4">
        <header class="flex flex-col gap-1">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            Personalisierung
          </span>
          <h3 class="text-xl font-semibold text-on-surface uppercase tracking-wide">
            {t().categories}
          </h3>
        </header>
        <div class="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">

          {#if reminderStore.categories.length === 0 && !showCatForm}
            <div class="px-5 py-4 text-sm text-on-surface/40">{t().noCategoriesHint}</div>
          {/if}

          {#each reminderStore.categories as cat}
            <div class="flex items-center justify-between px-5 py-3 hover:bg-surface-container-high/40 transition-colors border-b border-outline-variant/10 last:border-0">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full shrink-0" style="background: {cat.color}"></span>
                <span class="text-sm font-medium text-on-surface">{cat.name}</span>
              </div>
              <button
                onclick={() => deleteCategory(cat.id)}
                class="flex items-center justify-center w-7 h-7 rounded-lg text-on-surface/30 cursor-pointer
                       hover:text-error hover:bg-surface-container-high transition-colors duration-150"
                aria-label="{cat.name} löschen"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
                </svg>
              </button>
            </div>
          {/each}

          <!-- New category form -->
          {#if showCatForm}
            <div class="px-5 py-4 border-t border-outline-variant/10 space-y-3">
              <input
                bind:value={newCatName}
                type="text"
                placeholder={t().categoryNameLabel}
                maxlength="30"
                class="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest border border-outline-variant/15
                       text-on-surface placeholder:text-on-surface/30 outline-none
                       focus:border-primary/40 transition-colors duration-150"
                onkeydown={(e) => e.key === "Enter" && addCategory()}
                aria-label="Kategorie-Name"
              />
              <div class="flex gap-2 items-center flex-wrap">
                {#each CATEGORY_COLORS as color}
                  <button
                    onclick={() => (newCatColor = color)}
                    class="w-6 h-6 rounded-full transition-transform duration-150 cursor-pointer
                           {newCatColor === color ? 'scale-125 ring-2 ring-primary/50 ring-offset-1 ring-offset-surface-container-low' : 'hover:scale-110'}"
                    style="background: {color}"
                    aria-label="Farbe {color}"
                  ></button>
                {/each}
              </div>
              <div class="flex gap-2">
                <button
                  onclick={() => { showCatForm = false; newCatName = ""; }}
                  class="flex-1 py-2 rounded-lg text-sm text-on-surface/50 cursor-pointer
                         bg-surface-container-highest border border-outline-variant/10
                         hover:text-on-surface transition-colors duration-150"
                >{t().cancel}</button>
                <button
                  onclick={addCategory}
                  disabled={!newCatName.trim()}
                  class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer
                         bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed
                         hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >{t().addCategoryBtn}</button>
              </div>
            </div>
          {:else}
            <button
              onclick={() => (showCatForm = true)}
              class="w-full flex items-center gap-2 px-5 py-3 text-sm text-on-surface/50 cursor-pointer
                     hover:text-primary hover:bg-surface-container-high/40 transition-colors duration-150
                     border-t border-outline-variant/10"
            >
              <span class="material-symbols-outlined" style="font-size:1rem">add</span>
              {t().newCategory}
            </button>
          {/if}

        </div>
      </section>

      <!-- INFO -->
      <section class="space-y-4">
        <header class="flex flex-col gap-1">
          <span class="text-[0.6875rem] font-bold text-primary/70 uppercase tracking-widest">
            System
          </span>
          <h3 class="text-xl font-semibold text-on-surface uppercase tracking-wide">
            {t().info}
          </h3>
        </header>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col gap-2">
            <span class="text-[0.6875rem] font-bold text-on-surface/40 uppercase tracking-tighter">
              {t().version}
            </span>
            <span class="text-sm font-medium text-on-surface font-mono">{appVersion}</span>
          </div>
          <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col gap-2">
            <span class="text-[0.6875rem] font-bold text-on-surface/40 uppercase tracking-tighter">
              {t().developer}
            </span>
            <span class="text-sm font-medium text-on-surface">kavoma</span>
          </div>
          <div class="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col gap-2">
            <span class="text-[0.6875rem] font-bold text-on-surface/40 uppercase tracking-tighter">
              {t().platform}
            </span>
            <span class="text-sm font-medium text-on-surface">Windows {getWindowsArch()}</span>
          </div>
        </div>
      </section>


    </div>
  </div>

</div>
