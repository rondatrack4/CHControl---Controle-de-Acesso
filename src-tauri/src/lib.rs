use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Porta local onde o sidecar Node (Next.js standalone) escuta.
const SIDECAR_PORT: u16 = 34115;

/// Guarda o processo Node pra encerrá-lo quando o app fechar.
struct Sidecar(Mutex<Option<Child>>);

fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Sidecar(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Pasta de dados do app (SQLite + mídia) em %APPDATA%/CHControl.
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir).ok();

            // Em dev, o Next roda via `beforeDevCommand` (npm run dev, porta 3000).
            // Em produção, sobe o servidor Node standalone empacotado como sidecar.
            let url = if cfg!(debug_assertions) {
                "http://localhost:3000".to_string()
            } else {
                let resource_dir = app.path().resource_dir()?;
                let server_js = resource_dir.join("server").join("server.js");
                let node_bin = resource_dir.join("node").join("node.exe");

                let mut cmd = Command::new(if node_bin.exists() {
                    node_bin.into_os_string()
                } else {
                    "node".into()
                });
                cmd.arg(&server_js)
                    .env("APP_MODE", "desktop")
                    .env("NEXT_PUBLIC_APP_MODE", "desktop")
                    .env("APP_DATA_DIR", &data_dir)
                    .env("PORT", SIDECAR_PORT.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .current_dir(server_js.parent().unwrap());

                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
                }

                let child = cmd.spawn().expect("falha ao iniciar o servidor Node");
                app.state::<Sidecar>().0.lock().unwrap().replace(child);
                wait_for_port(SIDECAR_PORT, Duration::from_secs(30));
                format!("http://127.0.0.1:{SIDECAR_PORT}")
            };

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse().unwrap()))
                .title("CHControl — Controle de Acesso")
                .inner_size(1280.0, 800.0)
                .min_inner_size(1024.0, 640.0)
                .build()?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Encerra o Node junto com a janela.
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(sidecar) = window.app_handle().try_state::<Sidecar>() {
                    if let Some(mut child) = sidecar.0.lock().unwrap().take() {
                        child.kill().ok();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
