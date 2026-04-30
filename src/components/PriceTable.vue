<script setup lang="ts">
import { ref, watch, computed, h } from "vue";
import { NButton, NSpace, NPagination, NSelect, NIcon, useMessage, useDialog } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import type Database from "@tauri-apps/plugin-sql";
import { Pencil, Trash, Refresh } from "@vicons/ionicons5";
import { fetchPrices, deletePrices, type PriceRecord } from "../api/db";
import { parseExcel, importToDatabase, exportExcel } from "../api/excel";

const props = defineProps<{
  db: Database;
  categories: { id: number; name: string }[];
  categoryId: number | null;
  refreshKey: number;
}>();

const emit = defineEmits<{
  importDone: [];
  edit: [row: PriceRecord];
  new: [];
}>();

const message = useMessage();
const dialog = useDialog();
const loading = ref(false);
const hasLoaded = ref(false);
const importing = ref(false);
const importProgress = ref("");
const data = ref<PriceRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(50);
const keyword = ref("");
const checkedRowKeys = ref<number[]>([]);

const pageSizeOptions = [
  { label: "20 条/页", value: 20 },
  { label: "50 条/页", value: 50 },
  { label: "100 条/页", value: 100 },
];

const columns: DataTableColumns<PriceRecord> = [
  { type: "selection", width: 40 },
  { title: "分类", key: "category_name", width: 110, ellipsis: { tooltip: true } },
  { title: "规格型号", key: "model", ellipsis: { tooltip: true }, sorter: (a, b) => (a.model ?? "").localeCompare(b.model ?? "") },
  {
    title: "参考价格(元)",
    key: "price",
    width: 120,
    align: "right",
    sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
    render: (row) => (row.price != null ? `¥${row.price}` : "-"),
  },
  { title: "备注", key: "remark", width: 150, ellipsis: { tooltip: true } },
  {
    title: "操作",
    key: "actions",
    width: 80,
    align: "center",
    render(row) {
      return h(NSpace, { size: 4, justify: "center" }, {
        default: () => [
          h(NButton, {
            size: "small",
            quaternary: true,
            circle: true,
            onClick: () => emit("edit", row),
          }, {
            icon: () => h(NIcon, null, { default: () => h(Pencil) }),
          }),
          h(NButton, {
            size: "small",
            quaternary: true,
            circle: true,
            type: "error",
            onClick: () => confirmDelete(row.id),
          }, {
            icon: () => h(NIcon, null, { default: () => h(Trash) }),
          }),
        ],
      });
    },
  },
];

const showEmpty = computed(() => !loading.value && !hasLoaded.value);
const showTable = computed(() => hasLoaded.value);
const showSkeleton = computed(() => loading.value && !hasLoaded.value);

async function loadData() {
  loading.value = true;
  try {
    const result = await fetchPrices(props.db, props.categoryId, keyword.value, page.value, pageSize.value);
    data.value = result.data;
    total.value = result.total;
    hasLoaded.value = true;
  } catch (e: any) {
    message.error("加载失败: " + e);
  } finally {
    loading.value = false;
  }
}

function triggerLoad() {
  page.value = 1;
  checkedRowKeys.value = [];
  loadData();
}

function confirmDelete(id: number) {
  dialog.warning({
    title: "确认删除",
    content: "确定删除这条价格记录吗？",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => doDelete([id]),
  });
}

async function doDelete(ids: number[]) {
  try {
    await deletePrices(props.db, ids);
    message.success(`已删除 ${ids.length} 条`);
    checkedRowKeys.value = checkedRowKeys.value.filter((k) => !ids.includes(k));
    loadData();
  } catch (e: any) {
    message.error("删除失败: " + e);
  }
}

function confirmBatchDelete() {
  if (checkedRowKeys.value.length === 0) return;
  const count = checkedRowKeys.value.length;
  dialog.warning({
    title: "确认删除",
    content: `确定删除选中的 ${count} 条记录吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => doDelete([...checkedRowKeys.value]),
  });
}

async function handleImport() {
  if (importing.value) return;
  try {
    const rows = await parseExcel();
    if (!rows || rows.length === 0) {
      message.warning("未读取到数据");
      return;
    }
    importing.value = true;
    importProgress.value = `正在导入 0/${rows.length}...`;
    const result = await importToDatabase(props.db, rows, (current: number, total: number) => {
      importProgress.value = `正在导入 ${current}/${total}...`;
    });
    message.success(`导入完成: ${result.success}/${result.total} 条`);
    emit("importDone");
  } catch (e: any) {
    message.error("导入失败: " + e);
  } finally {
    importing.value = false;
    importProgress.value = "";
  }
}

async function handleExport() {
  const rows = [["分类", "规格型号", "参考价格(元)", "版本", "备注"]];
  for (const r of data.value) {
    rows.push([
      r.category_name ?? "",
      r.model,
      r.price?.toString() ?? "",
      r.version ?? "",
      r.remark ?? "",
    ]);
  }
  try {
    const ok = await exportExcel(rows);
    if (ok) message.success("导出成功");
  } catch (e: any) {
    message.error("导出失败: " + e);
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(triggerLoad, 300);
}

function onPageChange(p: number) {
  page.value = p;
  loadData();
}

function onPageSizeChange(ps: number) {
  pageSize.value = ps;
  triggerLoad();
}

// Watch category changes from sidebar
watch(() => props.categoryId, () => {
  triggerLoad();
});

// Watch refreshKey for import/save/delete
watch(() => props.refreshKey, () => {
  if (hasLoaded.value) {
    loadData();
  }
});

// Auto-load on mount
loadData();
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%; gap: 12px;">
    <!-- Toolbar -->
    <div style="display: flex; justify-content: space-between; flex-shrink: 0;">
      <n-space>
        <n-input
          v-model:value="keyword"
          placeholder="搜索型号/备注"
          clearable
          size="small"
          style="width: 240px;"
          @update:value="onSearch"
        />
      </n-space>
      <n-space>
        <n-button size="small" type="primary" :loading="importing" @click="handleImport">
          {{ importing ? importProgress : "导入 Excel" }}
        </n-button>
        <n-button size="small" @click="handleExport">导出 Excel</n-button>
        <n-button size="small" quaternary circle @click="loadData">
          <template #icon><n-icon :component="Refresh" /></template>
        </n-button>
      </n-space>
    </div>

    <!-- Content area -->
    <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">

      <!-- Skeleton loading (first load) -->
      <div v-if="showSkeleton" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
        <div v-for="i in 12" :key="i" :style="{
          height: '32px',
          borderRadius: '4px',
          backgroundColor: '#f0f0f0',
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.05}s`,
        }" />
      </div>

      <!-- Empty state -->
      <div v-else-if="showEmpty" style="flex: 1; display: flex; align-items: center; justify-content: center;">
        <n-text depth="3">请选择分类或搜索型号查看数据</n-text>
      </div>

      <!-- Data table -->
      <div v-else-if="showTable" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <n-data-table
          :columns="columns"
          :data="data"
          :loading="loading"
          :row-key="(row: any) => row.id"
          v-model:checked-row-keys="checkedRowKeys"
          :scroll-x="700"
          :row-props="() => ({ style: { fontSize: '13px' } })"
          size="small"
          flex-height
          style="flex: 1;"
        />

        <!-- Pagination footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; flex-shrink: 0;">
          <n-space size="small">
            <n-button size="small" type="primary" @click="emit('new')">新增</n-button>
            <n-button size="small" type="error" :disabled="checkedRowKeys.length === 0" @click="confirmBatchDelete">
              批量删除 ({{ checkedRowKeys.length }})
            </n-button>
          </n-space>
          <n-space size="small" align="center">
            <n-text depth="3" style="font-size: 12px;">共 {{ total }} 条</n-text>
            <n-select
              :value="pageSize"
              :options="pageSizeOptions"
              size="small"
              style="width: 100px;"
              @update:value="onPageSizeChange"
            />
            <n-pagination
              :page="page"
              :page-count="Math.ceil(total / pageSize) || 1"
              :page-slot="5"
              size="small"
              @update:page="onPageChange"
            />
          </n-space>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
