<script setup>
/**
 * 通用空态：暂无数据 / 暂无记录等列表为空时复用。
 * - 图标统一使用 empty_no_data
 * - text 不传时默认 i18n「暂无数据」
 * - 默认插槽可放操作按钮（如「前往比赛」）
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import emptyIconUrl from '@/assets/images/common/empty_no_data.png?url';

const props = defineProps({
  /** 空态文案；空字符串时回退为「暂无数据」 */
  text: { type: String, default: '' },
  /** 图标边长（px） */
  iconSize: { type: [Number, String], default: 120 },
});

const { t } = useI18n();
const displayText = computed(() => props.text || t('暂无数据'));
</script>

<template>
  <div class="empty-state" role="status">
    <img
      class="empty-state__icon"
      :src="emptyIconUrl"
      :width="iconSize"
      :height="iconSize"
      alt=""
      aria-hidden="true"
    />
    <p class="empty-state__text">{{ displayText }}</p>
    <div v-if="$slots.default" class="empty-state__action">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-height: 220px;
  padding: 32px 16px;
  color: rgba(var(--theme-text-rgb), 0.45);
  text-align: center;
}

.empty-state__icon {
  display: block;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

.empty-state__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(var(--theme-text-rgb), 0.45);
}

.empty-state__action {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}
</style>
