// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use tauri::command;

const DATA_FILE_NAME: &str = "Litask Data.json";
const EMPTY_DATA: &str = r#"{"tasks":[],"projects":[]}"#;

fn data_file_path() -> Result<PathBuf, String> {
    let mut path = dirs::document_dir().ok_or("No documents dir")?;
    path.push(DATA_FILE_NAME);
    Ok(path)
}

#[command]
fn save_litask_data(content: String) -> Result<(), String> {
    let path = data_file_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[command]
fn load_litask_data() -> Result<String, String> {
    let path = data_file_path()?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(contents),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(EMPTY_DATA.to_string()),
        Err(err) => Err(err.to_string()),
    }
}

// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_litask_data,
            save_litask_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
