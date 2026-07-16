<script setup>
/**
 * H5 绑定信息列表页（对齐 App BindingListActivity）
 * - 顶栏返回 + 标题「绑定信息」+ 右侧「管理/完成」
 * - Tab：银行卡 / 区块链
 * - 列表选中 / 管理模式删除 / 底部添加入口
 * - 仅移动端使用；PC 仍走 Overview 弹窗，不改动
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import EmptyState from '@/components/EmptyState.vue';
import ProfileMobileHeader from '@/views/Profile/components/ProfileMobileHeader.vue';
import ProfileBindingModal from '@/views/Profile/components/ProfileBindingModal.vue';
import { fetchBindings, removeBinding, setDefaultBinding } from '@/api/user';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const toast = useToast();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const loading = ref(true);
const error = ref(false);
const activeTab = ref('bank'); // bank | wallet
const managementMode = ref(false);
const bankList = ref([]);
const walletList = ref([]);
const selectedId = ref('');
const bindingModalOpen = ref(false);

const currentList = computed(() => (activeTab.value === 'bank' ? bankList.value : walletList.value));
const hasBindings = computed(() => currentList.value.length > 0);
const rightText = computed(() => {
  if (!hasBindings.value) return '';
  return managementMode.value ? t('完成') : t('管理');
});

function isBankBinding(item) {
  const type = String(item.type || item.bindingType || '').toLowerCase();
  return /bank/.test(type) || (!!item.bankName && !item.chainType && !item.address);
}

function isCryptoBinding(item) {
  const type = String(item.type || item.bindingType || '').toLowerCase();
  return /crypto|wallet|usdt|trc|erc|chain/.test(type) || !!item.chainType || (!!item.address && !item.bankName);
}

function bindingApiType(tab) {
  return tab === 'bank' ? 'bank-card' : 'crypto';
}

function bindingId(item) {
  return String(item.id ?? item.bindingId ?? '');
}

function bankDisplayName(item) {
  const bankName = item.bankName || item.name || item.display1 || '';
  const account = String(item.maskedNumber || item.cardNumber || item.accountNo || item.display2 || '');
  const lastFour = account.replace(/\D/g, '').slice(-4);
  if (!bankName) return account || '—';
  if (!lastFour) return bankName;
  return `${bankName}(${lastFour})`;
}

function walletDisplayName(item) {
  const chain = item.chainType || item.network || item.walletType || 'TRC20';
  const address = item.address || item.accountNo || '';
  const short = address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
  return short ? `${chain} ${short}` : chain;
}

function normalizeList(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.records || []);
  bankList.value = list.filter(isBankBinding);
  walletList.value = list.filter(isCryptoBinding);
  const preferred = currentList.value.find((item) => item.isDefault) || currentList.value[0];
  selectedId.value = preferred ? bindingId(preferred) : '';
  if (!hasBindings.value) managementMode.value = false;
}

async function loadBindings() {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetchBindings();
    normalizeList(res?.data);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function switchTab(tab) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  managementMode.value = false;
  const preferred = currentList.value.find((item) => item.isDefault) || currentList.value[0];
  selectedId.value = preferred ? bindingId(preferred) : '';
}

function toggleManagement() {
  if (!hasBindings.value) return;
  managementMode.value = !managementMode.value;
}

async function selectItem(item) {
  if (managementMode.value) return;
  const id = bindingId(item);
  if (!id || id === selectedId.value) return;
  selectedId.value = id;
  try {
    await setDefaultBinding(bindingApiType(activeTab.value), id);
  } catch (e) {
    toast.error(e?.message || t('提交失败请重试'));
  }
}

async function deleteItem(item) {
  const id = bindingId(item);
  if (!id) return;
  const name = activeTab.value === 'bank' ? bankDisplayName(item) : walletDisplayName(item);
  if (!window.confirm(`${t('删除绑定确认')}\n${name}`)) return;
  try {
    await removeBinding(bindingApiType(activeTab.value), id);
    toast.success(t('操作成功'));
    await loadBindings();
  } catch (e) {
    toast.error(e?.message || t('提交失败请重试'));
  }
}

function openAdd() {
  bindingModalOpen.value = true;
}

function handleBindingSaved() {
  loadBindings();
}

onMounted(() => {
  // 本页仅面向 H5；PC 误入时仍可加载数据，避免空白。
  loadBindings();
});
</script>

<template>
  <div class="bindings-page" :class="{ 'bindings-page--mobile': isMobile }">
    <ProfileMobileHeader
      v-if="isMobile"
      :title="t('绑定信息')"
      :right-text="rightText"
      :right-disabled="!hasBindings"
      @right-click="toggleManagement"
    />

    <main class="bindings-panel">
      <div class="bindings-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="bindings-tabs__item"
          :class="{ active: activeTab === 'bank' }"
          @click="switchTab('bank')"
        >
          {{ t('银行卡') }}
        </button>
        <button
          type="button"
          role="tab"
          class="bindings-tabs__item"
          :class="{ active: activeTab === 'wallet' }"
          @click="switchTab('wallet')"
        >
          {{ t('区块链') }}
        </button>
      </div>

      <div v-if="loading" class="bindings-state">
        <div class="bindings-spinner" />
        <span>{{ t('加载中') }}</span>
      </div>
      <div v-else-if="error" class="bindings-state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="bindings-retry" @click="loadBindings">{{ t('重试') }}</button>
      </div>
      <EmptyState v-else-if="!currentList.length" :text="t('暂无绑定')" :icon-size="96" />
      <template v-if="!loading && !error">
        <ul v-if="currentList.length" class="bindings-list">
          <li
            v-for="item in currentList"
            :key="bindingId(item)"
            class="bindings-item"
            :class="{
              'bindings-item--selected': !managementMode && selectedId === bindingId(item),
              'bindings-item--manage': managementMode,
            }"
          >
            <button type="button" class="bindings-item__main" @click="selectItem(item)">
              <span class="bindings-item__name">
                {{ activeTab === 'bank' ? bankDisplayName(item) : walletDisplayName(item) }}
              </span>
            </button>
            <button
              v-if="managementMode"
              type="button"
              class="bindings-item__action bindings-item__action--delete"
              :aria-label="t('删除')"
              @click="deleteItem(item)"
            >
              ×
            </button>
            <span
              v-else
              class="bindings-item__action"
              :class="{ 'bindings-item__action--checked': selectedId === bindingId(item) }"
              aria-hidden="true"
            />
          </li>
        </ul>

        <button v-if="!managementMode" type="button" class="bindings-add" @click="openAdd">
          + {{ activeTab === 'bank' ? t('添加银行卡') : t('添加钱包地址') }}
        </button>
      </template>
    </main>

    <ProfileBindingModal
      v-model="bindingModalOpen"
      :initial-tab="activeTab === 'wallet' ? 'wallet' : 'bank'"
      @saved="handleBindingSaved"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.bindings-page {
  color: var(--theme-text);

  &--mobile {
    min-height: 100dvh;
    margin: -18px -8px 0;
    padding: 0 8px 20px;
    box-sizing: border-box;
    background: #eaf1f9;
  }
}

.bindings-panel {
  box-sizing: border-box;
  min-height: calc(100dvh - 88px);
  padding: 12px;
  border-radius: 16px;
  background: #fff;
}

.bindings-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  height: 48px;
  margin-bottom: 12px;
  padding: 6px 8px;
  border-radius: 30px;
  background: #eaf1f9;
}

.bindings-tabs__item {
  border: 0;
  border-radius: 24px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &.active {
    background: #1c7bff;
    color: #fff;
  }
}

.bindings-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  color: #7b92ad;
  font-size: 14px;
}

.bindings-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: bindings-spin 0.8s linear infinite;
}

@keyframes bindings-spin {
  to { transform: rotate(360deg); }
}

.bindings-retry {
  height: 32px;
  padding: 0 16px;
  border: 1px solid #1c7bff;
  border-radius: 16px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  cursor: pointer;
}

.bindings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bindings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 0 14px;
  border-radius: 12px;
  background: #eaf1f9;
}

.bindings-item__main {
  flex: 1;
  min-width: 0;
  padding: 12px 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.bindings-item__name {
  display: block;
  overflow: hidden;
  color: #0b3462;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bindings-item__action {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 1.5px solid #c3d4ea;
  border-radius: 50%;
  background: transparent;

  &--checked {
    border-color: #1c7bff;
    background: #1c7bff;
    box-shadow: inset 0 0 0 4px #fff;
  }

  &--delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: #ff2d2d;
    color: #fff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
}

.bindings-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  margin-top: 12px;
  border: 0;
  border-radius: 12px;
  background: #eaf1f9;
  color: #1c7bff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>
