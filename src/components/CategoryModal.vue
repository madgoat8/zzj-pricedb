<script setup lang="ts">
import { ref } from "vue";
import { useMessage, useDialog } from "naive-ui";
import type Database from "@tauri-apps/plugin-sql";
import { insertCategory, updateCategory, deleteCategory } from "../api/db";

const props = defineProps<{
  show: boolean;
  db: Database;
  categories: { id: number; name: string }[];
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  updated: [];
}>();

const message = useMessage();
const dialog = useDialog();
const newCategoryName = ref("");
const editingId = ref<number | null>(null);
const editingName = ref("");

async function handleAdd() {
  const name = newCategoryName.value.trim();
  if (!name) {
    message.warning("请输入分类名称");
    return;
  }
  try {
    await insertCategory(props.db, name);
    newCategoryName.value = "";
    message.success("已添加");
    emit("updated");
  } catch (e: any) {
    message.error("添加失败: " + e);
  }
}

function startEdit(id: number, name: string) {
  editingId.value = id;
  editingName.value = name;
}

async function handleUpdate() {
  if (editingId.value === null) return;
  const name = editingName.value.trim();
  if (!name) return;
  try {
    await updateCategory(props.db, editingId.value, name);
    editingId.value = null;
    message.success("已更新");
    emit("updated");
  } catch (e: any) {
    message.error("更新失败: " + e);
  }
}

function confirmDelete(id: number, name: string) {
  dialog.warning({
    title: "确认删除",
    content: `删除分类「${name}」将同时删除该分类下的所有价格数据，确定删除吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => doDelete(id),
  });
}

async function doDelete(id: number) {
  try {
    await deleteCategory(props.db, id);
    message.success("已删除");
    emit("updated");
  } catch (e: any) {
    message.error("删除失败: " + e);
  }
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    title="管理分类"
    style="width: 420px;"
  >
    <n-space vertical :size="12">
      <n-space>
        <n-input v-model:value="newCategoryName" placeholder="新分类名称" style="width: 240px;" @keyup.enter="handleAdd" />
        <n-button type="primary" @click="handleAdd">添加</n-button>
      </n-space>

      <n-list bordered>
        <n-list-item v-for="cat in categories" :key="cat.id">
          <n-space justify="space-between" align="center" style="width: 100%;">
            <template v-if="editingId === cat.id">
              <n-input v-model:value="editingName" size="small" style="width: 200px;" @keyup.enter="handleUpdate" />
              <n-space>
                <n-button size="small" type="primary" @click="handleUpdate">保存</n-button>
                <n-button size="small" @click="editingId = null">取消</n-button>
              </n-space>
            </template>
            <template v-else>
              <span>{{ cat.name }}</span>
              <n-space>
                <n-button size="small" @click="startEdit(cat.id, cat.name)">编辑</n-button>
                <n-button size="small" type="error" @click="confirmDelete(cat.id, cat.name)">删除</n-button>
              </n-space>
            </template>
          </n-space>
        </n-list-item>
      </n-list>
    </n-space>
  </n-modal>
</template>
