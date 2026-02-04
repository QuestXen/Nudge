use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Clone)]
pub struct UpdatePayload {
    pub update_available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
    pub critical: bool,
    pub date: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LatestJson {
    // release_notes: Option<String>,
    // date: Option<String>,
    pub critical: Option<bool>,
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    event: String,
    chunk_length: usize,
    content_length: Option<u64>,
}

#[tauri::command]
pub async fn check_for_updates<R: Runtime>(app: AppHandle<R>) -> Result<UpdatePayload, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    // Check for updates using the plugin
    let update_op = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update_op {
        let version = update.version.to_string();
        let notes = update.body.clone().unwrap_or_default();
        let date = update.date.map(|d| d.to_string());

        // Critical Update Check Logic:
        // Since the plugin doesn't expose custom fields, we would normally fetch the JSON manifest here.
        // For this template, we default to false, or check if "CRITICAL" is in the notes.
        // If you want to use the 'critical' field from latest.json, you need the URL.
        // Implementation:
        // let critical = reqwest::get("URL_TO_LATEST_JSON").await.ok()
        //     .and_then(|r| r.json::<LatestJson>().await.ok())
        //     .and_then(|j| j.critical)
        //     .unwrap_or(false);

        let critical = false; // Default for now

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
pub async fn install_update<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        let mut downloaded = 0;

        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    // println!("Downloaded {downloaded} of {:?}", content_length);

                    let _ = app.emit(
                        "update-progress",
                        DownloadProgress {
                            event: "downloading".into(),
                            chunk_length,
                            content_length,
                        },
                    );
                },
                || {
                    // println!("Download finished");
                    let _ = app.emit("update-complete", ());
                },
            )
            .await
            .map_err(|e| e.to_string())?;

        // Restart
        app.restart();
    }

    Ok(())
}
