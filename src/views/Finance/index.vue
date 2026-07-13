<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

import AppSideNav from '@/components/AppSideNav.vue';

const { t } = useI18n();
const route = useRoute();

const tabs = [
  { key: '/finance/deposit', label: '充值', to: '/finance/deposit' },
  { key: '/finance/vip-transfer', label: '会员互转', to: '/finance/vip-transfer' },
  { key: '/finance/withdraw', label: '提领', to: '/finance/withdraw' },
  { key: '/finance/records', label: '交易记录', to: '/finance/records' },
];

const activeTab = computed(() => route.path);
const isFinanceHome = computed(() => route.name === 'finance');
const isVipTransfer = computed(() => route.name === 'finance-vip-transfer');
const sidebarTabs = computed(() => tabs.map((tab) => ({ ...tab, label: t(tab.label) })));
</script>

<template>
  <div class="finance-layout" :class="{ 'finance-layout--vip-transfer': isVipTransfer }">
    <div class="finance-layout__inner">
      <AppSideNav :items="sidebarTabs" :active-key="activeTab" aria-label="finance" />

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

// 会员互转 H5 隐藏了全局底栏，页面底部只需保留安全区。
.finance-layout--vip-transfer {
  @include mobile-only {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + $spacing-lg);
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
