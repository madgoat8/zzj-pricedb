import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPrices, insertPrice, updatePrice, deletePrices, insertCategory, updateCategory, deleteCategory } from "../api/db";

function createMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
  } as any;
}

describe("fetchPrices", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.select
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);
  });

  it("queries count first, skips data when total is 0", async () => {
    await fetchPrices(db, null, "");
    // Count query only - data query skipped when total=0
    expect(db.select).toHaveBeenCalledTimes(1);
    const [countSql] = db.select.mock.calls[0];
    expect(countSql).toContain("COUNT(*)");
  });

  it("queries both count and data when total > 0", async () => {
    db.select.mockReset();
    db.select
      .mockResolvedValueOnce([{ total: 5 }])
      .mockResolvedValueOnce([{ id: 1, model: "test" }]);
    const result = await fetchPrices(db, null, "");
    expect(db.select).toHaveBeenCalledTimes(2);
    const [dataSql] = db.select.mock.calls[1];
    expect(dataSql).toContain("SELECT p.*, c.name as category_name");
    expect(result.total).toBe(5);
    expect(result.data).toHaveLength(1);
  });

  it("filters by category_id", async () => {
    await fetchPrices(db, 3, "");
    // Count query gets filter params only, data query adds pagination
    const [countSql, countParams] = db.select.mock.calls[0];
    expect(countSql).toContain("p.category_id = $1");
    expect(countParams[0]).toBe(3);
  });

  it("filters by keyword", async () => {
    await fetchPrices(db, null, "DN15");
    const [countSql, countParams] = db.select.mock.calls[0];
    expect(countSql).toContain("p.model LIKE $1");
    expect(countParams[0]).toBe("%DN15%");
  });

  it("applies pagination with LIMIT and OFFSET", async () => {
    db.select.mockReset();
    db.select
      .mockResolvedValueOnce([{ total: 100 }])
      .mockResolvedValueOnce([]);
    await fetchPrices(db, null, "", 3, 50);
    const [dataSql, dataParams] = db.select.mock.calls[1];
    expect(dataSql).toContain("LIMIT");
    expect(dataSql).toContain("OFFSET");
    // Last two params are pageSize and offset
    expect(dataParams).toContain(50);
    expect(dataParams).toContain(100); // (3-1)*50
  });

  it("returns PagedResult with data and total", async () => {
    db.select.mockReset();
    db.select
      .mockResolvedValueOnce([{ total: 42 }])
      .mockResolvedValueOnce([{ id: 1, model: "test" }]);
    const result = await fetchPrices(db, null, "");
    expect(result.total).toBe(42);
    expect(result.data).toHaveLength(1);
  });

  it("uses default page=1 and pageSize=50", async () => {
    db.select.mockReset();
    db.select
      .mockResolvedValueOnce([{ total: 10 }])
      .mockResolvedValueOnce([]);
    await fetchPrices(db, null, "");
    const [, dataParams] = db.select.mock.calls[1];
    expect(dataParams).toContain(50); // default pageSize
    expect(dataParams).toContain(0);  // default offset for page 1
  });
});

describe("insertPrice", () => {
  it("executes insert with correct params", async () => {
    const db = createMockDb();
    await insertPrice(db, { category_id: 1, model: "Z15T-10 DN15", price: 21, version: "v1", remark: "test" });
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain("INSERT INTO prices");
    expect(params).toEqual([1, "Z15T-10 DN15", 21, "v1", "test"]);
  });

  it("handles null values", async () => {
    const db = createMockDb();
    await insertPrice(db, { category_id: 1, model: "Z15T-10 DN15", price: null, version: null, remark: null });
    const [, params] = db.execute.mock.calls[0];
    expect(params).toEqual([1, "Z15T-10 DN15", null, null, null]);
  });
});

describe("deletePrices", () => {
  it("deletes by ids", async () => {
    const db = createMockDb();
    await deletePrices(db, [1, 2, 3]);
    const [sql, params] = db.execute.mock.calls[0];
    expect(sql).toContain("DELETE FROM prices WHERE id IN");
    expect(params).toEqual([1, 2, 3]);
  });
});

describe("insertCategory", () => {
  it("inserts category name", async () => {
    const db = createMockDb();
    await insertCategory(db, "低压闸阀");
    const [, params] = db.execute.mock.calls[0];
    expect(params).toEqual(["低压闸阀"]);
  });
});

describe("updateCategory", () => {
  it("updates by id", async () => {
    const db = createMockDb();
    await updateCategory(db, 5, "新名称");
    const [, params] = db.execute.mock.calls[0];
    expect(params).toEqual(["新名称", 5]);
  });
});

describe("deleteCategory", () => {
  it("deletes prices first, then category", async () => {
    const db = createMockDb();
    await deleteCategory(db, 3);
    expect(db.execute).toHaveBeenCalledTimes(2);
    const [priceSql, priceParams] = db.execute.mock.calls[0];
    expect(priceSql).toContain("DELETE FROM prices WHERE category_id");
    expect(priceParams).toEqual([3]);
    const [catSql, catParams] = db.execute.mock.calls[1];
    expect(catSql).toContain("DELETE FROM categories WHERE id");
    expect(catParams).toEqual([3]);
  });
});
