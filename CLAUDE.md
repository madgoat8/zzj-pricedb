# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZJ-PriceDB is a Tauri 2 desktop application for managing valve (阀门) product pricing data. Targets Windows as a portable executable. Single-page layout: left sidebar for category selection, right area for price table with search/import/export.

## Build & Run Commands

```bash
# Development (starts Vite dev server + Tauri window)
cargo tauri dev

# Production build (bundles to src-tauri/target/release/bundle/)
cargo tauri build

# Frontend only (type-check + bundle)
npm run build

# Vite dev server only (port 1420)
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

Prerequisites: Node.js >= 18, Rust toolchain (rustup), Tauri CLI (`cargo install tauri-cli`).

Network proxy if needed: `export https_proxy=http://127.0.0.1:7890`

## Architecture

**Two communication paths:**

1. **Database CRUD — direct from frontend** via `@tauri-apps/plugin-sql`. The `Database` instance is created in `App.vue` (`Database.load("sqlite:app.db")`) and passed as a prop to all child components. All SQL lives in `src/api/db.ts` using `$1, $2, ...` parameterized queries.

2. **Excel I/O — through Rust commands** (`src-tauri/src/commands.rs`). Frontend calls `invoke()` from `@tauri-apps/api/core`. Rust parses xlsx with `calamine` (read) and `rust_xlsxwriter` (write). The parsed data is returned to the frontend, which then inserts into SQLite via the plugin-sql API.

**State management:** No store library. `App.vue` is the single state hub holding `db`, `categories`, `selectedCategoryId`, modal visibility, and `refreshKey` (incremented to trigger child data reloads). Children communicate up via typed emits.

**Database schema** (migrations in `src-tauri/src/lib.rs`):
- `categories`: id, name (UNIQUE), created_at
- `prices`: id, category_id (FK→categories), model, price, version, created_at, updated_at, remark

**Excel import mapping:** Sheet name → category, column[2] → model, column[3] → price. Header row (index 0) is skipped.

## Key Files

- `src-tauri/src/lib.rs` — Tauri plugin registration + SQL migrations
- `src-tauri/src/commands.rs` — Rust commands for Excel read/write
- `src/App.vue` — Root component, state hub, DB init
- `src/api/db.ts` — All SQL operations + `PriceRecord` type
- `src/api/excel.ts` — Excel parse/import/export bridge
- `src/components/PriceTable.vue` — Main data table with search, import/export, CRUD
- `src/components/CategorySidebar.vue` — Category list (plain div, not Naive UI menu)
- `src/components/PriceFormModal.vue` — Price add/edit modal
- `src/components/CategoryModal.vue` — Category management modal

## Conventions

- Vue 3 `<script setup lang="ts">` with Composition API everywhere
- Naive UI components are auto-imported via `unplugin-vue-components` + `NaiveUiResolver`; composables (`useMessage`, etc.) via `unplugin-auto-import`
- `CategorySidebar` uses plain HTML divs for the category list (Naive UI `n-menu` has compatibility issues in this setup)
- SQL parameterized queries use `$1, $2, ...` syntax (not `?`)
- `moduleResolution` in tsconfig is `"node"` (not `"bundler"`) because naive-ui lacks an `exports` field in its package.json
- Tests use Vitest + happy-dom, located in `src/__tests__/`; Tauri APIs (Database, invoke, dialog) are mocked in tests
