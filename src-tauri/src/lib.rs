use std::process::Child;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct OrchestratorHandle(pub Mutex<Option<Child>>);

fn rust_log(msg: &str) {
    use std::io::Write;
    let log_dir = dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".workroom");
    let _ = std::fs::create_dir_all(&log_dir);
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(log_dir.join("app.log")) {
        let _ = writeln!(f, "[rust] {msg}");
    }
}

mod commands {
    use super::{OrchestratorHandle, rust_log};
    use std::io::Write;
    use tauri::{AppHandle, Manager, State};

    #[tauri::command]
    pub fn start_orchestrator(app: AppHandle, state: State<OrchestratorHandle>) -> Result<(), String> {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(()); // already running
        }

        // In production, the orchestrator is bundled as a resource.
        // In dev, fall back to running the TypeScript source via tsx.
        rust_log("start_orchestrator called");
        let child = match app.path().resource_dir() {
            Ok(res_dir) => {
                rust_log(&format!("resource_dir={}", res_dir.display()));
                let bundle = res_dir.join("orchestrator.cjs");
                rust_log(&format!("bundle_exists={}", bundle.exists()));
                if bundle.exists() {
                    // Production mode: run the pre-bundled orchestrator
                    let node = find_node();
                    rust_log(&format!("spawning node={node} bundle={}", bundle.display()));
                    std::process::Command::new(node)
                        .arg(&bundle)
                        .current_dir(&res_dir)
                        .spawn()
                        .map_err(|e| {
                            rust_log(&format!("spawn failed: {e}"));
                            format!("failed to spawn orchestrator (prod): {e}")
                        })?
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

    fn find_node() -> &'static str {
        // macOS GUI apps don't inherit the shell PATH.
        // Try common install locations in order.
        for candidate in &[
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node",
            "/usr/bin/node",
            "node", // fall back to PATH as last resort
        ] {
            if candidate.starts_with('/') {
                if std::path::Path::new(candidate).exists() {
                    return candidate;
                }
            } else {
                return candidate;
            }
        }
        "node"
    }

    fn dev_spawn() -> Result<std::process::Child, String> {
        let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
        std::process::Command::new(find_node())
            .args(["--import", "tsx/esm", "orchestrator/src/index.ts"])
            .current_dir(&cwd)
            .spawn()
            .map_err(|e| format!("failed to spawn orchestrator (dev): {e}"))
    }

    #[tauri::command]
    pub fn write_log(message: String) {
        let log_dir = dirs::home_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join(".workroom");
        let _ = std::fs::create_dir_all(&log_dir);
        let log_path = log_dir.join("app.log");
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&log_path) {
            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(f, "[{ts}] {message}");
        }
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
            commands::stop_orchestrator,
            commands::write_log
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
