mod commands;

use std::env;
use tauri_plugin_sql::{Migration, MigrationKind};

fn get_db_url() -> String {
    if cfg!(debug_assertions) {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let path = std::path::Path::new(manifest_dir).join("..").join("app.db");
        let abs = path.canonicalize().unwrap_or(path);
        format!("sqlite:{}", abs.display())
    } else {
        let exe_dir = env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_default();
        let db_path = exe_dir.join("app.db");
        format!("sqlite:{}", db_path.display())
    }
}

pub fn run() {
    let db_url = get_db_url();

    let migrations = vec![
        Migration {
            version: 1,
            description: "create_categories_table",
            sql: "CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_prices_table",
            sql: "CREATE TABLE IF NOT EXISTS prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                model TEXT NOT NULL,
                price REAL,
                version TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                remark TEXT,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&db_url, migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::import_excel,
            commands::export_excel,
            commands::db_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
