<script setup lang="ts">
import { ref, onMounted } from "vue";
import { NMessageProvider, NDialogProvider, NText } from "naive-ui";
import { invoke } from "@tauri-apps/api/core";
import CategorySidebar from "./components/CategorySidebar.vue";
import PriceTable from "./components/PriceTable.vue";
import CategoryModal from "./components/CategoryModal.vue";
import PriceFormModal from "./components/PriceFormModal.vue";
import Database from "@tauri-apps/plugin-sql";

const db = ref<Database | null>(null);
const dbReady = ref(false);
const categories = ref<{ id: number; name: string }[]>([]);
const selectedCategoryId = ref<number | null>(null);
const showCategoryModal = ref(false);
const showPriceFormModal = ref(false);
const editingPrice = ref<any>(null);
const refreshKey = ref(0);

const dbPath = ref("");

async function initDb() {
  dbPath.value = await invoke<string>("db_path");
  db.value = await Database.load(`sqlite:${dbPath.value}`);
  await loadCategories();
  dbReady.value = true;
}

async function loadCategories() {
  if (!db.value) return;
  categories.value = await db.value.select("SELECT id, name FROM categories ORDER BY id");
}

function onCategoryChange(id: number | null) {
  selectedCategoryId.value = id;
  refreshKey.value++;
}

function onCategoryUpdated() {
  loadCategories();
  refreshKey.value++;
}

function onImportDone() {
  loadCategories();
  refreshKey.value++;
}

function onPriceSaved() {
  showPriceFormModal.value = false;
  editingPrice.value = null;
  refreshKey.value++;
}

function onEditPrice(row: any) {
  editingPrice.value = row;
  showPriceFormModal.value = true;
}

function onNewPrice() {
  editingPrice.value = null;
  showPriceFormModal.value = true;
}

onMounted(initDb);
</script>

<template>
  <n-message-provider>
    <n-dialog-provider>
    <div class="app-layout">
      <aside class="sidebar">
        <!-- Skeleton sidebar while db loads -->
        <div v-if="!dbReady" style="display: flex; flex-direction: column; gap: 8px; padding-top: 8px;">
          <div style="font-size: 16px; font-weight: bold; padding: 8px 0;">分类列表</div>
          <div v-for="i in 5" :key="i" :style="{
            height: '32px', borderRadius: '4px', backgroundColor: '#f0f0f0',
            animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.05}s`,
          }" />
        </div>
        <template v-else>
          <CategorySidebar
            :categories="categories"
            :selected-id="selectedCategoryId"
            @update:selected-id="onCategoryChange"
            @manage="showCategoryModal = true"
          />
          <n-text depth="3" style="font-size: 11px; padding-top: 8px; word-break: break-all; flex-shrink: 0;">
            {{ dbPath }}
          </n-text>
        </template>
      </aside>
      <main class="main-content">
        <!-- Skeleton while db loads -->
        <div v-if="!dbReady" style="flex: 1; display: flex; flex-direction: column; gap: 8px; padding-top: 8px;">
          <div :style="{ height: '40px', borderRadius: '4px', backgroundColor: '#f0f0f0' }" />
          <div v-for="i in 10" :key="i" :style="{
            height: '40px', borderRadius: '4px', backgroundColor: '#f0f0f0',
            animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.05}s`,
          }" />
        </div>
        <PriceTable
          v-else-if="db"
          :db="db"
          :categories="categories"
          :category-id="selectedCategoryId"
          :refresh-key="refreshKey"
          @import-done="onImportDone"
          @edit="onEditPrice"
          @new="onNewPrice"
        />
      </main>
    </div>

    <CategoryModal
      v-if="db"
      v-model:show="showCategoryModal"
      :db="db"
      :categories="categories"
      @updated="onCategoryUpdated"
    />

    <PriceFormModal
      v-if="db"
      v-model:show="showPriceFormModal"
      :db="db"
      :categories="categories"
      :price="editingPrice"
      :default-category-id="selectedCategoryId"
      @saved="onPriceSaved"
    />
    </n-dialog-provider>
  </n-message-provider>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  border-right: 1px solid #e0e0e0;
  padding: 12px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  padding: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
