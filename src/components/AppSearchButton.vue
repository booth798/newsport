<script setup>
/**
 * 圆形搜索按钮（对齐 Header 市场列表右上角搜索）
 * 仅负责展示与点击，跳转由父组件处理。
 */
import { useI18n } from 'vue-i18n';

defineProps({
  /** 按钮尺寸，默认与 Header 一致 44 */
  size: {
    type: Number,
    default: 44,
  },
});

defineEmits(['click']);

const { t } = useI18n();
</script>

<template>
  <button
    type="button"
    class="app-search-btn"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :aria-label="t('搜索')"
    @click="$emit('click', $event)"
  >
    <span aria-hidden="true" />
  </button>
</template>

<style lang="scss" scoped>
.app-search-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--auxiliary-1);
  box-shadow: 0 4px 8px rgba(var(--theme-shadow-rgb), 0.12);
  cursor: pointer;

  span {
    width: 22px;
    height: 22px;
    background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22' fill='none'%3E%3Ccircle cx='9.5' cy='9.5' r='6.5' stroke='%23FF0004' stroke-width='2'/%3E%3Cpath d='M14.5 14.5L20 20' stroke='%23FF0004' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
  }
}
</style>
