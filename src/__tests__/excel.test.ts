import { describe, it, expect, vi, beforeEach } from "vitest";
import { importToDatabase, type ImportedRow } from "../api/excel";

function createMockDb(existingCategories: { id: number; name: string }[] = []) {
  let selectCallCount = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++;
      // First call is for categories after INSERT OR IGNORE
      if (selectCallCount === 1) {
        return Promise.resolve(existingCategories);
      }
      return Promise.resolve([]);
    }),
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
  } as any;
}

describe("importToDatabase", () => {
  it("creates categories from sheet names", async () => {
    const db = createMockDb([
      { id: 1, name: "低压闸阀" },
      { id: 2, name: "中压闸阀" },
    ]);
    const rows: ImportedRow[] = [
      { sheet_name: "低压闸阀", model: "Z15T-10 DN15", price: 21 },
      { sheet_name: "中压闸阀", model: "CL150 DN15", price: 198 },
    ];

    await importToDatabase(db, rows);

    // Should call INSERT OR IGNORE for each unique category
    const categoryInserts = db.execute.mock.calls.filter((c: any[]) =>
      String(c[0]).includes("INSERT OR IGNORE INTO categories")
    );
    expect(categoryInserts).toHaveLength(2);
  });

  it("batch inserts prices in chunks", async () => {
    const db = createMockDb([{ id: 1, name: "低压闸阀" }]);
    const rows: ImportedRow[] = Array.from({ length: 1200 }, (_, i) => ({
      sheet_name: "低压闸阀",
      model: `DN${i}`,
      price: i * 10,
    }));

    await importToDatabase(db, rows);

    // Should batch insert: 500 + 500 + 200 = 3 price inserts
    const priceInserts = db.execute.mock.calls.filter((c: any[]) =>
      String(c[0]).includes("INSERT INTO prices")
    );
    expect(priceInserts).toHaveLength(3);
  });

  it("calls onProgress callback", async () => {
    const db = createMockDb([{ id: 1, name: "test" }]);
    const rows: ImportedRow[] = Array.from({ length: 600 }, (_, i) => ({
      sheet_name: "test",
      model: `M${i}`,
      price: i,
    }));
    const onProgress = vi.fn();

    await importToDatabase(db, rows, onProgress);

    expect(onProgress).toHaveBeenCalled();
    // Should report progress at least twice (batch of 500 + batch of 100)
    expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Last call should report full total
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(lastCall[1]).toBe(600);
  });

  it("skips rows with unknown category", async () => {
    // Mock db returns empty categories (no match)
    const db = {
      select: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    } as any;
    const rows: ImportedRow[] = [
      { sheet_name: "不存在的分类", model: "X", price: 1 },
    ];

    const result = await importToDatabase(db, rows);

    expect(result.success).toBe(0);
    // Should not attempt price insert
    const priceInserts = db.execute.mock.calls.filter((c: any[]) =>
      String(c[0]).includes("INSERT INTO prices")
    );
    expect(priceInserts).toHaveLength(0);
  });

  it("returns correct total and success count", async () => {
    const db = createMockDb([{ id: 1, name: "cat" }]);
    const rows: ImportedRow[] = [
      { sheet_name: "cat", model: "A", price: 1 },
      { sheet_name: "cat", model: "B", price: 2 },
    ];

    const result = await importToDatabase(db, rows);

    expect(result.total).toBe(2);
    expect(result.success).toBe(2);
  });
});
