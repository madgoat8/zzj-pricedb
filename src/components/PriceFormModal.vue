<script setup lang="ts">
import { ref, watch } from "vue";
import { useMessage } from "naive-ui";
import type Database from "@tauri-apps/plugin-sql";
import { insertPrice, updatePrice } from "../api/db";

const props = defineProps<{
  show: boolean;
  db: Database;
  categories: { id: number; name: string }[];
  price: any | null;
  defaultCategoryId: number | null;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  saved: [];
}>();

const message = useMessage();
const form = ref({
  category_id: null as number | null,
  model: "",
  price: null as number | null,
  version: "",
  remark: "",
});

const isEdit = ref(false);

watch(
  () => props.show,
  (val) => {
    if (val) {
      if (props.price) {
        isEdit.value = true;
        form.value = {
          category_id: props.price.category_id,
          model: props.price.model,
          price: props.price.price,
          version: props.price.version ?? "",
          remark: props.price.remark ?? "",
        };
      } else {
        isEdit.value = false;
        form.value = {
          category_id: props.defaultCategoryId,
          model: "",
          price: null,
          version: "",
          remark: "",
        };
      }
    }
  }
);

async function handleSave() {
  if (!form.value.category_id || !form.value.model) {
    message.warning("分类和型号为必填");
    return;
  }
  try {
    const data = {
      category_id: form.value.category_id,
      model: form.value.model,
      price: form.value.price,
      version: form.value.version || null,
      remark: form.value.remark || null,
    };
    if (isEdit.value && props.price) {
      await updatePrice(props.db, props.price.id, data);
      message.success("已更新");
    } else {
      await insertPrice(props.db, data);
      message.success("已添加");
    }
    emit("saved");
  } catch (e: any) {
    message.error("保存失败: " + e);
  }
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="(v: boolean) => emit('update:show', v)"
    preset="card"
    :title="isEdit ? '编辑价格' : '新增价格'"
    style="width: 480px;"
  >
    <n-form label-placement="left" label-width="80">
      <n-form-item label="分类" required>
        <n-select
          v-model:value="form.category_id"
          :options="categories.map(c => ({ label: c.name, value: c.id }))"
          placeholder="选择分类"
        />
      </n-form-item>
      <n-form-item label="规格型号" required>
        <n-input v-model:value="form.model" placeholder="输入规格型号" />
      </n-form-item>
      <n-form-item label="参考价格">
        <n-input-number v-model:value="form.price" placeholder="输入价格" style="width: 100%;" :show-button="false">
          <template #prefix>¥</template>
        </n-input-number>
      </n-form-item>
      <n-form-item label="版本">
        <n-input v-model:value="form.version" placeholder="输入版本" />
      </n-form-item>
      <n-form-item label="备注">
        <n-input v-model:value="form.remark" type="textarea" placeholder="输入备注" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="handleSave">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
