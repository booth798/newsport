<script setup>
/**
 * H5「我的」二级页通用顶栏：左侧返回 + 居中标题（对齐 App SportsTopBarView back 模式）。
 * 仅供移动端使用；右侧可选操作按钮（如绑定页「管理」）。
 */
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';

defineProps({
  title: { type: String, required: true },
  /** 右侧操作文案；空则不展示 */
  rightText: { type: String, default: '' },
  rightDisabled: { type: Boolean, default: false },
});

const emit = defineEmits(['right-click']);
const { t } = useI18n();
const router = useRouter();

function goBack() {
  if (window.history.length > 1) router.back();
  else router.replace('/profile');
}
</script>

<template>
  <header class="profile-mobile-header">
    <div class="profile-mobile-header__bar">
      <button type="button" class="profile-mobile-header__back" :aria-label="t('返回')" @click="goBack">
        <img :src="iconNavBackMarketUrl" width="36" height="36" alt="" />
      </button>
      <h1 class="profile-mobile-header__title">{{ title }}</h1>
      <button
        v-if="rightText"
        type="button"
        class="profile-mobile-header__right"
        :disabled="rightDisabled"
        @click="emit('right-click')"
      >
        {{ rightText }}
      </button>
      <span v-else class="profile-mobile-header__right-spacer" aria-hidden="true" />
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-mobile-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 8px 0;
}

.profile-mobile-header__bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px;
  border: 0.8px solid #fff;
  border-radius: 30px;
  background: #eaf1f9;
  box-sizing: border-box;
}

.profile-mobile-header__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;

  img {
    display: block;
    width: 36px;
    height: 36px;
  }

  &:active {
    opacity: 0.7;
  }
}

.profile-mobile-header__title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  max-width: calc(100% - 140px);
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  color: #0b3462;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-mobile-header__right {
  min-width: 36px;
  height: 36px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    color: rgba(11, 52, 98, 0.35);
    cursor: default;
  }
}

.profile-mobile-header__right-spacer {
  width: 36px;
  flex-shrink: 0;
}
</style>
