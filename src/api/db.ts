import type Database from "@tauri-apps/plugin-sql";

export interface PriceRecord {
  id: number;
  category_id: number;
  category_name?: string;
  model: string;
  price: number | null;
  version: string | null;
  created_at: string;
  updated_at: string;
  remark: string | null;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
}

export async function fetchPrices(
  db: Database,
  categoryId: number | null,
  keyword: string,
  page: number = 1,
  pageSize: number = 50
): Promise<PagedResult<PriceRecord>> {
  const conditions: string[] = [];
  const filterParams: any[] = [];

  if (categoryId !== null) {
    filterParams.push(categoryId);
    conditions.push(`p.category_id = $${filterParams.length}`);
  }
  if (keyword) {
    filterParams.push(`%${keyword}%`);
    conditions.push(`(p.model LIKE $${filterParams.length} OR p.remark LIKE $${filterParams.length})`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  // Count total (uses only filter params)
  const countSql = `SELECT COUNT(*) as total FROM prices p${where}`;
  const countResult: { total: number }[] = await db.select(countSql, filterParams);
  const total = countResult[0]?.total ?? 0;

  if (total === 0) {
    return { data: [], total: 0 };
  }

  // Fetch page (adds pagination params)
  const offset = (page - 1) * pageSize;
  const dataParams = [...filterParams, pageSize, offset];
  const limitIdx = filterParams.length + 1;
  const offsetIdx = filterParams.length + 2;
  const dataSql = `SELECT p.*, c.name as category_name FROM prices p LEFT JOIN categories c ON p.category_id = c.id${where} ORDER BY p.id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  const data: PriceRecord[] = await db.select(dataSql, dataParams);

  return { data, total };
}

export async function insertPrice(
  db: Database,
  data: { category_id: number; model: string; price: number | null; version: string | null; remark: string | null }
) {
  return db.execute(
    `INSERT INTO prices (category_id, model, price, version, remark) VALUES ($1, $2, $3, $4, $5)`,
    [data.category_id, data.model, data.price, data.version, data.remark]
  );
}

export async function updatePrice(
  db: Database,
  id: number,
  data: { category_id: number; model: string; price: number | null; version: string | null; remark: string | null }
) {
  return db.execute(
    `UPDATE prices SET category_id = $1, model = $2, price = $3, version = $4, remark = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
    [data.category_id, data.model, data.price, data.version, data.remark, id]
  );
}

export async function deletePrices(db: Database, ids: number[]) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  return db.execute(`DELETE FROM prices WHERE id IN (${placeholders})`, ids);
}

export async function insertCategory(db: Database, name: string) {
  return db.execute(`INSERT INTO categories (name) VALUES ($1)`, [name]);
}

export async function updateCategory(db: Database, id: number, name: string) {
  return db.execute(`UPDATE categories SET name = $1 WHERE id = $2`, [name, id]);
}

export async function deleteCategory(db: Database, id: number) {
  await db.execute(`DELETE FROM prices WHERE category_id = $1`, [id]);
  return db.execute(`DELETE FROM categories WHERE id = $1`, [id]);
}
