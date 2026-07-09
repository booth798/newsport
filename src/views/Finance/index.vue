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
const isFinanceHome = computed(() => route.name === 'finance');
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

      <nav v-if="!isFinanceHome" class="finance-tabs" aria-label="finance">
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
        <div v-if="isFinanceHome" class="finance-empty">
          <div class="finance-empty__illustration" aria-hidden="true">
            <span></span>
          </div>
          <p>{{ t('暂无记录') }}</p>
          <RouterLink to="/market" class="btn btn--primary finance-empty__btn">
            {{ t('前往比赛') }}
          </RouterLink>
        </div>
        <RouterView v-else />
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
  min-height: 100dvh;
  overflow-x: hidden;
  background: var(--theme-bg);

  @include web-only {
    padding: 10px 30px $spacing-2xl;
  }

  @include mobile-only {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0 8px calc(#{$mobile-tab-bar-offset} + env(safe-area-inset-bottom, 0px) + #{$spacing-md});
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
    display: flex;
    flex-direction: column;
    max-width: 100%;
    min-height: calc(100dvh - 80px - #{$mobile-tab-bar-offset});
  }
}

.finance-sidebar {
  @include mobile-only {
    display: none;
  }

  @include web-only {
    position: sticky;
    flex: 0 0 175px;
    min-height: min(690px, calc(100dvh - 12px));
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
    display: none;
  }
}

.finance-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: rgba(23, 59, 97, 0.48);

  @include web-only {
    min-height: 520px;
    justify-content: center;
  }

  @include mobile-only {
    min-height: calc(100dvh - 80px - #{$mobile-tab-bar-offset} - 16px);
    justify-content: center;
    padding-bottom: 62px;
    box-sizing: border-box;
  }
}

.finance-empty__illustration {
  position: relative;
  width: 118px;
  height: 118px;
  margin-bottom: 10px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 86% 20%, #8dbdff 0 3px, transparent 4px),
    radial-gradient(circle at 21% 62%, #8dbdff 0 3px, transparent 4px),
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(116, 174, 252, 0.24));

  span {
    position: absolute;
    left: 32px;
    top: 25px;
    width: 54px;
    height: 68px;
    border-radius: 8px;
    background: linear-gradient(180deg, #c8def9, #8cbcff);
    box-shadow: 14px 10px 0 rgba(115, 174, 253, 0.18);

    &::before,
    &::after {
      content: '';
      position: absolute;
      left: 13px;
      right: 13px;
      height: 2px;
      border-radius: 2px;
      background: #fff;
    }

    &::before {
      top: 22px;
      box-shadow: 0 14px 0 #fff;
    }

    &::after {
      top: 50px;
    }
  }
}

.finance-empty p {
  margin: 0 0 42px;
  font-size: 15px;
}

.finance-empty__btn {
  width: 166px;
  height: 43px;
  border-radius: 24px;
  font-size: 16px;
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

  @include mobile-only {
    height: 34px;
  }
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
