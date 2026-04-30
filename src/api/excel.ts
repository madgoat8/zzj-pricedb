import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type Database from "@tauri-apps/plugin-sql";

export interface ImportedRow {
  sheet_name: string;
  model: string;
  price: number | null;
}

export async function parseExcel(): Promise<ImportedRow[] | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
  });
  if (!path) return null;
  return invoke("import_excel", { path });
}

export async function importToDatabase(
  db: Database,
  rows: ImportedRow[],
  onProgress?: (current: number, total: number) => void
): Promise<{ total: number; success: number }> {
  const sheetNames = [...new Set(rows.map((r) => r.sheet_name))];

  // Create categories
  for (const name of sheetNames) {
    await db.execute(`INSERT OR IGNORE INTO categories (name) VALUES ($1)`, [name]);
  }

  const categories: { id: number; name: string }[] = await db.select(`SELECT id, name FROM categories`);
  const nameToId = new Map(categories.map((c) => [c.name, c.id]));

  // Batch insert in chunks of 500
  const BATCH_SIZE = 500;
  let success = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const values: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    for (const row of chunk) {
      const categoryId = nameToId.get(row.sheet_name);
      if (!categoryId) continue;
      values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
      params.push(categoryId, row.model, row.price);
      paramIdx += 3;
      success++;
    }

    if (values.length > 0) {
      await db.execute(
        `INSERT INTO prices (category_id, model, price) VALUES ${values.join(", ")}`,
        params
      );
    }

    onProgress?.(Math.min(i + BATCH_SIZE, rows.length), rows.length);
    // Yield to event loop so UI stays responsive
    await new Promise((r) => setTimeout(r, 0));
  }

  return { total: rows.length, success };
}

export async function exportExcel(data: string[][]): Promise<boolean> {
  const path = await save({
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
    defaultPath: "价格数据导出.xlsx",
  });
  if (!path) return false;
  await invoke("export_excel", { path, data });
  return true;
}
