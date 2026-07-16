<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AppSideNav from '@/components/AppSideNav.vue';
import { fetchWithdrawMethods } from '@/api/finance';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const tabs = [
  { key: '/finance/deposit', label: '充值', to: '/finance/deposit' },
  { key: '/finance/vip-transfer', label: '会员互转', to: '/finance/vip-transfer' },
  { key: '/finance/withdraw', label: '银行卡提现', shortLabel: '银行卡', to: '/finance/withdraw', method: 'bank_card' },
  { key: '/finance/withdraw-chain', label: '区块链提现', shortLabel: '区块链', to: '/finance/withdraw-chain', method: 'crypto' },
];
const withdrawPaths = ['/finance/withdraw', '/finance/withdraw-chain'];
const fallbackFinancePath = '/finance/records';

// 提现方式默认放行，接口返回明确关闭后再隐藏对应入口，避免接口异常造成页面不可用。
const withdrawMethods = ref({
  crypto: true,
  bank_card: true,
});
const withdrawMethodsResolved = ref(false);

const availableTabs = computed(() => tabs.filter((tab) => !tab.method || withdrawMethods.value[tab.method] === true));
// H5 将两种提现方式收纳在同一页面框架内，通过顶部页签切换具体表单。
const withdrawTabs = computed(() => availableTabs.value.filter((tab) => withdrawPaths.includes(tab.to)));

const activeTab = computed(() => route.path);
// 当前是否处于提现相关页面（银行卡 / 区块链），H5 顶部展示两者切换页签。
const isWithdrawPage = computed(() => withdrawPaths.includes(route.path));
const isFinanceHome = computed(() => route.name === 'finance');
// 会员互转 / 银行卡提现 / 区块链提现在 H5 隐藏底部 Tab，页面底部只保留安全区。
const hidesMobileTabBar = computed(() => route.matched.some((r) => r.meta?.hideMobileTabBar));
const isWithdrawRoute = computed(() => withdrawPaths.includes(route.path));
// 两种提现方式都开启时才显示切换 Tab；单一方式直接展示对应页面。
const isWithdrawPage = computed(() => withdrawMethodsResolved.value && isWithdrawRoute.value && withdrawTabs.value.length > 1);
const sidebarTabs = computed(() => availableTabs.value.map((tab) => ({ ...tab, label: t(tab.label) })));

function normalizeWithdrawMethods(methods) {
  return {
    crypto: methods?.crypto === true,
    bank_card: methods?.bank_card === true,
  };
}

function ensureAvailableWithdrawRoute() {
  if (!isWithdrawRoute.value || withdrawTabs.value.some((tab) => tab.to === route.path)) return;
  const targetPath = withdrawTabs.value[0]?.to || fallbackFinancePath;
  return router.replace({ path: targetPath, query: route.query });
}

async function loadWithdrawMethods() {
  try {
    const response = await fetchWithdrawMethods();
    withdrawMethods.value = normalizeWithdrawMethods(response?.data);
    await ensureAvailableWithdrawRoute();
  } catch {
    // 开关接口失败时保留默认两个入口，避免暂时性网络异常导致提现不可进入。
  } finally {
    withdrawMethodsResolved.value = true;
  }
}

watch([() => route.path, withdrawTabs], ensureAvailableWithdrawRoute);

onMounted(loadWithdrawMethods);
</script>

<template>
  <div class="finance-layout" :class="{ 'finance-layout--no-tabbar': hidesMobileTabBar }">
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
          {{ t(tab.shortLabel || tab.label) }}
        </RouterLink>
      </nav>

      <div class="finance-content">
        <!-- 提现入口先确认可用方式，避免短暂渲染已关闭的提现页面并触发其接口。 -->
        <RouterView v-if="!isWithdrawRoute || withdrawMethodsResolved" />
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

// 隐藏底栏的财务二级页，页面底部只需保留安全区。
.finance-layout--no-tabbar {
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
