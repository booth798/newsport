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
  { key: '/finance/withdraw', label: '银行卡提现', to: '/finance/withdraw' },
  { key: '/finance/withdraw-chain', label: '区块链提现', to: '/finance/withdraw-chain' },
];
// H5 将两种提现方式收纳在同一页面框架内，通过顶部页签切换具体表单。
const withdrawTabs = tabs.filter((tab) =>
  ['/finance/withdraw', '/finance/withdraw-chain'].includes(tab.to),
);

const activeTab = computed(() => route.path);
const isVipTransfer = computed(() => route.name === 'finance-vip-transfer');
const isWithdrawPage = computed(() => withdrawTabs.some((tab) => tab.to === route.path));
const sidebarTabs = computed(() => tabs.map((tab) => ({ ...tab, label: t(tab.label) })));
</script>

<template>
  <div class="finance-layout" :class="{ 'finance-layout--vip-transfer': isVipTransfer }">
    <div class="finance-layout__inner">
      <AppSideNav :items="sidebarTabs" :active-key="activeTab" aria-label="finance" />

      <nav v-if="isWithdrawPage" class="finance-tabs" :aria-label="t('提现')">
        <RouterLink
          v-for="tab in withdrawTabs"
          :key="tab.to"
          :to="{ path: tab.to, query: route.query }"
          class="finance-tab"
          :class="{ 'active btn--primary': activeTab === tab.to }"
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
  align-items: center;
  justify-content: space-between;

  @include web-only {
    display: none;
  }

  @include mobile-only {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    margin-bottom: 14px;
    padding: 5px;
    border: 1px solid var(--auxiliary-1);
    border-radius: $radius-pill;
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
  }
}

.finance-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 50%;
  max-width: 50%;
  min-width: 0;
  height: 38px;
  padding: 0 $spacing-sm;
  border-radius: $radius-pill;
  font-size: $font-size-base;
  color: var(--theme-primary);
  font-weight: 500;

  @include mobile-only {
    height: 36px;
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
