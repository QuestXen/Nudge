use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime, State};
use tauri_plugin_updater::UpdaterExt;

pub struct PendingUpdate(pub Mutex<Option<tauri_plugin_updater::Update>>);

#[derive(Debug, Serialize, Clone)]
pub struct UpdatePayload {
    pub update_available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
    pub critical: bool,
    pub date: Option<String>,
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: Option<u64>,
    percent: f64,
}

#[tauri::command]
pub async fn check_for_updates<R: Runtime>(
    app: AppHandle<R>,
    pending: State<'_, PendingUpdate>,
) -> Result<UpdatePayload, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update_op = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update_op {
        let version = update.version.to_string();
        let notes = update.body.clone().unwrap_or_default();
        let date = update.date.map(|d| d.to_string());
        let critical = notes.contains("CRITICAL UPDATE");

        *pending.0.lock().unwrap() = Some(update);

        Ok(UpdatePayload {
            update_available: true,
            version: Some(version),
            notes: Some(notes),
            critical,
            date,
        })
    } else {
        Ok(UpdatePayload {
            update_available: false,
            version: None,
            notes: None,
            critical: false,
            date: None,
        })
    }
}

#[tauri::command]
pub async fn install_update<R: Runtime>(
    app: AppHandle<R>,
    pending: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = pending
        .0
        .lock()
        .unwrap()
        .take()
        .ok_or_else(|| "Kein Update gecacht – bitte zuerst check_for_updates aufrufen".to_string())?;

    let mut downloaded: u64 = 0;
    let app_clone = app.clone();

    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                let percent = content_length
                    .map(|total| (downloaded as f64 / total as f64) * 100.0)
                    .unwrap_or(0.0);

                let _ = app_clone.emit(
                    "update-progress",
                    DownloadProgress {
                        downloaded,
                        total: content_length,
                        percent,
                    },
                );
            },
            {
                let app = app.clone();
                move || {
                    let _ = app.emit("update-complete", ());
                }
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    app.restart();
}
