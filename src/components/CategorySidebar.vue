<script setup lang="ts">
defineProps<{
  categories: { id: number; name: string }[];
  selectedId: number | null;
}>();

const emit = defineEmits<{
  "update:selectedId": [id: number | null];
  manage: [];
}>();
</script>

<template>
  <div style="display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;">
    <div style="font-size: 16px; font-weight: bold; padding: 8px 0;">分类列表</div>

    <div style="flex: 1; overflow-y: auto; min-height: 0;">
      <div
        :style="{
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: '4px',
          backgroundColor: selectedId === null ? '#18a058' : 'transparent',
          color: selectedId === null ? '#fff' : '#333',
          transition: 'background-color 0.2s, color 0.2s',
        }"
        @click="emit('update:selectedId', null)"
      >
        全部
      </div>
      <div
        v-for="cat in categories"
        :key="cat.id"
        :style="{
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: '4px',
          backgroundColor: selectedId === cat.id ? '#18a058' : 'transparent',
          color: selectedId === cat.id ? '#fff' : '#333',
          transition: 'background-color 0.2s, color 0.2s',
        }"
        @click="emit('update:selectedId', cat.id)"
      >
        {{ cat.name }}
      </div>
    </div>

    <div style="padding-top: 12px;">
      <button
        :style="{
          width: '100%',
          padding: '8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#fff',
          cursor: 'pointer',
        }"
        @click="emit('manage')"
      >
        管理分类
      </button>
    </div>
  </div>
</template>
