<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

import logoUrl from '@/assets/images/common/logo_nav.svg';

const { t } = useI18n();
const route = useRoute();

const tabs = [
  { label: '充值', to: '/finance/deposit' },
  { label: '提领', to: '/finance/withdraw' },
  { label: '交易记录', to: '/finance/records' },
];

const activeTab = computed(() => route.path);
</script>

<template>
  <div class="finance-layout">
    <div class="finance-layout__inner">
      <aside class="finance-sidebar" aria-label="finance">
        <img class="finance-sidebar__logo" :src="logoUrl" alt="UNIBET" width="100" height="36" />
        <nav class="finance-side-nav">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            class="finance-side-nav__item"
            :class="{ active: activeTab === tab.to }"
          >
            {{ t(tab.label) }}
          </RouterLink>
        </nav>
      </aside>

      <nav class="finance-tabs" aria-label="finance">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="finance-tab"
          :class="{ active: activeTab === tab.to }"
        >
          {{ t(tab.label) }}
        </RouterLink>
      </nav>

      <div class="finance-content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.finance-layout {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--theme-bg);

  @include web-only {
    padding: 10px 30px $spacing-2xl;
  }

  @include mobile-only {
    min-height: 100vh;
    padding: 0 $spacing-sm $spacing-md;
  }
}

.finance-layout__inner {
  display: flex;
  align-items: flex-start;
  margin: 0 auto;

  @include web-only {
    width: min(100%, 1088px);
    gap: $spacing-xl;
    justify-content: center;
  }

  @include mobile-only {
    display: block;
    max-width: 100%;
  }
}

.finance-sidebar {
  @include mobile-only {
    display: none;
  }

  @include web-only {
    position: sticky;
    flex: 0 0 175px;
    min-height: min(690px, calc(100vh - 12px));
    padding: 26px 18px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 25px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
  }
}

.finance-sidebar__logo {
  display: block;
  width: 100px;
  height: 36px;
  margin: 0 auto 34px;
  object-fit: contain;
}

.finance-side-nav {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.finance-side-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 18px;
  border-radius: 10px;
  color: var(--theme-text);
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.finance-side-nav__item::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: transparent;
}

.finance-side-nav__item:hover,
.finance-side-nav__item.active {
  background: #e8f2ff;
  color: var(--theme-primary);
}

.finance-side-nav__item.active::before {
  background: var(--theme-primary);
}

.finance-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;

  @include web-only {
    display: none;
  }

  @include mobile-only {
    position: sticky;
    top: 0;
    z-index: 3;
    width: 100%;
    overflow: hidden;
    height: 48px;
    margin: 0 0 $spacing-sm;
    padding: $spacing-xs $radius-sm;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 24px;
    background: rgba(238, 246, 255, 0.95);
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.85),
      0 2px 8px rgba(21, 58, 119, 0.14);
    backdrop-filter: blur(10px);
  }
}

.finance-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 33.3333%;
  max-width: 33.3333%;
  min-width: 0;
  height: 38px;
  padding: 0 $spacing-sm;
  border-radius: $radius-pill;
  font-size: $font-size-base;
  color: var(--theme-primary);
  text-decoration: none;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
  white-space: nowrap;
  font-weight: 700;
}

.finance-tab:hover,
.finance-tab.active {
  background: var(--theme-primary);
  color: var(--auxiliary-1);
  box-shadow: 0 3px 9px rgba(28, 123, 255, 0.35);
}

.finance-content {
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;

  @include web-only {
    flex: 0 1 820px;
  }

  @include mobile-only {
    width: 100%;
  }
}
</style>
