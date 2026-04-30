# PriceDB - 阀门价格数据库管理工具

基于 Tauri 构建的轻量级桌面应用，用于管理阀门产品的价格信息。支持 Excel 批量导入导出、分类筛选、增删改查等功能。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + TypeScript | 界面与交互 |
| 后端 | Rust (Tauri) | 桌面容器与系统调用 |
| 数据库 | SQLite | 本地嵌入式存储 |
| 构建 | Vite + cargo | 前端打包 + Rust 编译 |

## 交付目标

打包为 Windows 环境下的可执行文件，解压即用，无需安装。

## 功能概览

- **价格管理** — 增删改查阀门价格记录
- **分类管理** — 按阀门类型（低压/中压/高压等）分类，支持自定义分类
- **Excel 导入** — 从 Excel 文件批量导入价格数据
- **Excel 导出** — 将查询结果导出为 Excel 文件
- **筛选搜索** — 按分类、型号、价格范围等条件筛选

## 数据库设计

### 分类表 (categories)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 分类名称（如：低压闸阀） |
| created_at | DATETIME | 创建时间 |

### 价格表 (prices)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| category_id | INTEGER | 外键，关联分类表 |
| model | TEXT | 规格型号 |
| price | REAL | 参考价格（元） |
| version | TEXT | 版本 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 修改时间 |
| remark | TEXT | 备注 |

## Excel 数据映射

| Excel 列 | 数据库字段 | 示例 |
|-----------|-----------|------|
| 名称 | categories.name | 低压闸阀 |
| 规格型号 | prices.model | Z15T-10 DN15 |
| 参考价格（元） | prices.price | 21 |

## 项目结构

```
priceDb/
├── src-tauri/          # Rust 后端 (Tauri)
│   ├── src/
│   │   ├── main.rs     # 入口
│   │   ├── db.rs       # SQLite 数据库操作
│   │   └── commands.rs # Tauri 命令（前端调用接口）
│   └── Cargo.toml
├── src/                # Vue 3 前端
│   ├── components/     # UI 组件
│   ├── views/          # 页面视图
│   ├── api/            # Tauri 命令调用封装
│   └── App.vue
├── refData/            # 参考数据（Excel 示例文件）
├── index.html
├── package.json
└── readme.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- Rust (rustup)
- Tauri CLI

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI（如未安装）
cargo install tauri-cli
```

### 开发运行

```bash
cargo tauri dev
```

### 构建打包

```bash
cargo tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`，为 Windows 可执行文件。

## 截图

> 开发完成后补充
