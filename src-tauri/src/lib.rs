use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

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
        .plugin(tauri_plugin_dialog::init())
        .menu(|handle| {
            // Barra de menus nativa exibida na barra de título (Windows).
            let arquivo = SubmenuBuilder::new(handle, "Arquivo")
                .item(&MenuItemBuilder::new("Recarregar").id("reload").accelerator("CmdOrCtrl+R").build(handle)?)
                .item(&MenuItemBuilder::new("Imprimir").id("print").accelerator("CmdOrCtrl+P").build(handle)?)
                .separator()
                .item(&PredefinedMenuItem::quit(handle, Some("Sair"))?)
                .build()?;
            let editar = SubmenuBuilder::new(handle, "Editar")
                .item(&PredefinedMenuItem::undo(handle, Some("Desfazer"))?)
                .item(&PredefinedMenuItem::redo(handle, Some("Refazer"))?)
                .separator()
                .item(&PredefinedMenuItem::cut(handle, Some("Recortar"))?)
                .item(&PredefinedMenuItem::copy(handle, Some("Copiar"))?)
                .item(&PredefinedMenuItem::paste(handle, Some("Colar"))?)
                .item(&PredefinedMenuItem::select_all(handle, Some("Selecionar tudo"))?)
                .build()?;
            let exibir = SubmenuBuilder::new(handle, "Exibir")
                .item(&MenuItemBuilder::new("Recarregar").id("reload2").accelerator("F5").build(handle)?)
                .separator()
                .item(&MenuItemBuilder::new("Aumentar zoom").id("zoom_in").accelerator("CmdOrCtrl+Plus").build(handle)?)
                .item(&MenuItemBuilder::new("Diminuir zoom").id("zoom_out").accelerator("CmdOrCtrl+-").build(handle)?)
                .item(&MenuItemBuilder::new("Restaurar zoom").id("zoom_reset").accelerator("CmdOrCtrl+0").build(handle)?)
                .separator()
                .item(&MenuItemBuilder::new("Tela cheia").id("fullscreen").accelerator("F11").build(handle)?)
                .build()?;
            let ajuda = SubmenuBuilder::new(handle, "Ajuda")
                .item(&MenuItemBuilder::new("Verificar atualizações").id("check_updates").build(handle)?)
                .separator()
                .item(&MenuItemBuilder::new("Sobre o CHControl").id("about").build(handle)?)
                .build()?;
            MenuBuilder::new(handle)
                .item(&arquivo)
                .item(&editar)
                .item(&exibir)
                .item(&ajuda)
                .build()
        })
        .on_menu_event(|app, event| {
            let win = app.get_webview_window("main");
            match event.id().as_ref() {
                "reload" | "reload2" => {
                    if let Some(w) = win {
                        let _ = w.eval("window.location.reload()");
                    }
                }
                "print" => {
                    if let Some(w) = win {
                        let _ = w.eval("window.print()");
                    }
                }
                "zoom_in" => {
                    if let Some(w) = win {
                        let _ = w.eval("var b=document.body,z=parseFloat(b.style.zoom||'1');b.style.zoom=(z+0.1).toFixed(2);");
                    }
                }
                "zoom_out" => {
                    if let Some(w) = win {
                        let _ = w.eval("var b=document.body,z=parseFloat(b.style.zoom||'1');b.style.zoom=Math.max(0.5,z-0.1).toFixed(2);");
                    }
                }
                "zoom_reset" => {
                    if let Some(w) = win {
                        let _ = w.eval("document.body.style.zoom='1';");
                    }
                }
                "fullscreen" => {
                    if let Some(w) = win {
                        let f = w.is_fullscreen().unwrap_or(false);
                        let _ = w.set_fullscreen(!f);
                    }
                }
                "check_updates" => {
                    app.dialog()
                        .message("Você está usando a versão mais recente (v1.0).")
                        .title("Verificar atualizações")
                        .kind(MessageDialogKind::Info)
                        .show(|_| {});
                }
                "about" => {
                    app.dialog()
                        .message("CHControl — Sistema de Controle de Acesso\nVersão 1.0\n\nControle de moradores, visitantes, prestadores, correspondências e acessos — 100% offline.")
                        .title("Sobre o CHControl")
                        .kind(MessageDialogKind::Info)
                        .show(|_| {});
                }
                _ => {}
            }
        })
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

                // CRÍTICO: o app.exe é um processo GUI sem console. Se o sidecar
                // herdar stdout/stderr (handles inválidos), o Next.js quebra ao
                // logar "Ready" e o servidor morre na hora. Redireciona para um
                // arquivo de log — corrige o crash e ainda registra erros.
                match std::fs::File::create(data_dir.join("sidecar.log")) {
                    Ok(f) => match f.try_clone() {
                        Ok(f2) => {
                            cmd.stdout(Stdio::from(f)).stderr(Stdio::from(f2));
                        }
                        Err(_) => {
                            cmd.stdout(Stdio::null()).stderr(Stdio::null());
                        }
                    },
                    Err(_) => {
                        cmd.stdout(Stdio::null()).stderr(Stdio::null());
                    }
                }

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
