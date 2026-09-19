use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendState(Mutex<Option<Child>>);

fn main() {
  tauri::Builder::default()
    .manage(BackendState(Mutex::new(None)))
    .setup(|app| {
      // backend.exe viene empaquetado como resource: bin/backend.exe
      let backend_path = app
        .path()
        .resolve("bin/backend.exe", tauri::path::BaseDirectory::Resource)
        .expect("No se pudo resolver bin/backend.exe (resource)");

      let child = Command::new(backend_path)
        .spawn()
        .expect("No pude iniciar backend.exe");

      let state = app.state::<BackendState>();
      *state.0.lock().unwrap() = Some(child);

      Ok(())
    })
    .on_window_event(|app, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        let state = app.state::<BackendState>();
        if let Some(mut child) = state.0.lock().unwrap().take() {
          let _ = child.kill();
        }
        std::process::exit(0);
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
