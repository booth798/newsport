<script setup>
import { RouterLink } from 'vue-router';

import logoUrl from '@/assets/images/common/logo_nav.svg';

defineProps({
  items: {
    type: Array,
    required: true,
  },
  activeKey: {
    type: [String, Number],
    default: '',
  },
});

const emit = defineEmits(['select']);

function selectItem(item) {
  // 路由项由 RouterLink 处理跳转；非路由项通过事件交给页面切换内容。
  if (!item.to) emit('select', item.key);
}
</script>

<template>
  <aside class="app-side-nav">
    <img class="app-side-nav__logo" :src="logoUrl" alt="UNIBET" width="100" height="36" />
    <nav class="app-side-nav__list">
      <component
        :is="item.to ? RouterLink : 'button'"
        v-for="item in items"
        :key="item.key"
        :to="item.to"
        type="button"
        class="app-side-nav__item"
        :class="{ active: activeKey === item.key }"
        @click="selectItem(item)"
      >
        {{ item.label }}
      </component>
    </nav>
  </aside>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-side-nav {
  @include web-only {
    flex: 0 0 175px;
    min-height: min(690px, calc(100dvh - 12px));
    padding: 26px 18px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 25px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
  }

  @include mobile-only {
    display: none;
  }
}

.app-side-nav__logo {
  display: block;
  width: 100px;
  height: 36px;
  margin: 0 auto 34px;
  object-fit: contain;
}

.app-side-nav__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.app-side-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 52px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  color: var(--theme-text);
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;

  &::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 10px;
    bottom: 10px;
    width: 4px;
    border-radius: 0 4px 4px 0;
    background: transparent;
  }

  &:hover,
  &.active {
    background: #e8f2ff;
    color: var(--theme-primary);
  }

  &.active::before {
    background: var(--theme-primary);
  }
}
</style>
