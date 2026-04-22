use std::process::Child;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct OrchestratorHandle(pub Mutex<Option<Child>>);

mod commands {
    use super::OrchestratorHandle;
    use tauri::{AppHandle, Manager, State};

    #[tauri::command]
    pub fn start_orchestrator(app: AppHandle, state: State<OrchestratorHandle>) -> Result<(), String> {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(()); // already running
        }

        // In production, the orchestrator is bundled as a resource.
        // In dev, fall back to running the TypeScript source via tsx.
        let child = match app.path().resource_dir() {
            Ok(res_dir) => {
                let bundle = res_dir.join("orchestrator.js");
                if bundle.exists() {
                    // Production mode: run the pre-bundled orchestrator
                    std::process::Command::new("node")
                        .arg(&bundle)
                        .current_dir(&res_dir)
                        .spawn()
                        .map_err(|e| format!("failed to spawn orchestrator (prod): {e}"))?
                } else {
                    // Dev mode fallback
                    dev_spawn()?
                }
            }
            Err(_) => dev_spawn()?,
        };

        *guard = Some(child);
        Ok(())
    }

    fn dev_spawn() -> Result<std::process::Child, String> {
        let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
        std::process::Command::new("node")
            .args(["--import", "tsx/esm", "orchestrator/src/index.ts"])
            .current_dir(&cwd)
            .spawn()
            .map_err(|e| format!("failed to spawn orchestrator (dev): {e}"))
    }

    #[tauri::command]
    pub fn stop_orchestrator(state: State<OrchestratorHandle>) -> Result<(), String> {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = guard.take() {
            child.kill().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(OrchestratorHandle(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            commands::start_orchestrator,
            commands::stop_orchestrator
        ])
        .setup(|app| {
            let handle: AppHandle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state: State<OrchestratorHandle> = handle.state();
                let _ = commands::start_orchestrator(handle.clone(), state);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
