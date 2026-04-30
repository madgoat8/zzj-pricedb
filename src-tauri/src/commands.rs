use calamine::{open_workbook, Reader, Xlsx};
use rust_xlsxwriter::Workbook;
use std::env;
use std::fs::File;
use std::io::BufReader;

#[derive(Debug, serde::Serialize)]
pub struct ImportedRow {
    pub sheet_name: String,
    pub model: String,
    pub price: Option<f64>,
}

#[tauri::command]
pub fn import_excel(path: String) -> Result<Vec<ImportedRow>, String> {
    let mut workbook: Xlsx<BufReader<File>> =
        open_workbook(&path).map_err(|e: calamine::XlsxError| e.to_string())?;
    let mut rows: Vec<ImportedRow> = Vec::new();

    for sheet_name in workbook.sheet_names().to_owned() {
        let range = match workbook.worksheet_range(&sheet_name) {
            Ok(r) => r,
            Err(_) => continue,
        };

        for (i, row) in range.rows().enumerate() {
            if i == 0 {
                continue;
            }
            let cells: Vec<String> = row.iter().map(|c| c.to_string()).collect();
            if cells.len() < 4 {
                continue;
            }
            let model = cells[2].trim().to_string();
            if model.is_empty() {
                continue;
            }
            let price = cells[3].trim().parse::<f64>().ok();
            rows.push(ImportedRow {
                sheet_name: sheet_name.clone(),
                model,
                price,
            });
        }
    }

    Ok(rows)
}

#[tauri::command]
pub fn export_excel(path: String, data: Vec<Vec<String>>) -> Result<(), String> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    for (row_idx, row) in data.iter().enumerate() {
        for (col_idx, val) in row.iter().enumerate() {
            worksheet
                .write_string(row_idx as u32, col_idx as u16, val)
                .map_err(|e| e.to_string())?;
        }
    }

    workbook.save(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_path() -> String {
    if cfg!(debug_assertions) {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        format!("{}/../app.db", manifest_dir)
    } else {
        env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_default()
            .join("app.db")
            .to_string_lossy()
            .to_string()
    }
}
