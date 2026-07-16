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

import BaseModal from '@/components/BaseModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import ProfileMobileHeader from '@/views/Profile/components/ProfileMobileHeader.vue';
import ProfileBindingModal from '@/views/Profile/components/ProfileBindingModal.vue';
import { fetchBindings, removeBinding, setDefaultBinding } from '@/api/user';
import { fetchWithdrawMethods } from '@/api/finance';
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
// 对齐 Android：区块链提现未开启时隐藏「区块链」Tab、拦截新增。默认放行，接口明确关闭才隐藏。
const cryptoEnabled = ref(true);
// 删除二次确认（对齐 Android CommonMyDialog）
const deleteConfirmOpen = ref(false);
const pendingDelete = ref(null);

const currentList = computed(() => (activeTab.value === 'bank' ? bankList.value : walletList.value));
const hasBindings = computed(() => currentList.value.length > 0);
const rightText = computed(() => {
  if (!hasBindings.value) return '';
  return managementMode.value ? t('完成') : t('管理');
});
const deleteConfirmText = computed(() => {
  const item = pendingDelete.value;
  if (!item) return '';
  const name = activeTab.value === 'bank' ? bankDisplayName(item) : walletDisplayName(item);
  return t('删除绑定确认带名称', { name });
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

// 区块链链类型（对齐 Android display1 / chainType / network）
function walletChainType(item) {
  return item.chainType || item.network || item.walletType || 'TRC20';
}

// 区块链地址（对齐 Android display2 / address，列表整行展示、超出省略）
function walletAddressText(item) {
  return item.address || item.maskedAddress || item.accountNo || '—';
}

function walletDisplayName(item) {
  return `${walletChainType(item)} ${walletAddressText(item)}`.trim();
}

// 判断提现方式接口是否开启了区块链/USDT（兼容数组或对象两种返回结构）
function resolveCryptoEnabled(methods) {
  if (!methods) return true;
  const matchKey = (key) => /crypto|blockchain|usdt/i.test(String(key || ''));
  if (Array.isArray(methods)) {
    if (methods.length === 0) return true;
    return methods.some((m) => {
      if (typeof m === 'string') return matchKey(m);
      const key = m?.type || m?.method || m?.key || m?.code || m?.name;
      const enabled = m?.enabled ?? m?.value ?? m?.available ?? true;
      return matchKey(key) && enabled !== false;
    });
  }
  if (typeof methods === 'object') {
    const entry = Object.entries(methods).find(([key]) => matchKey(key));
    return entry ? entry[1] === true : true;
  }
  return true;
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
    // 与提现方式并行拉取：绑定列表必需，方式接口失败不阻断（默认放行区块链）。
    const [bindingsRes, methodsRes] = await Promise.all([
      fetchBindings(),
      fetchWithdrawMethods().catch(() => null),
    ]);
    cryptoEnabled.value = resolveCryptoEnabled(methodsRes?.data);
    // 区块链关闭且当前停留在区块链 Tab 时回退到银行卡
    if (!cryptoEnabled.value && activeTab.value === 'wallet') {
      activeTab.value = 'bank';
      managementMode.value = false;
    }
    normalizeList(bindingsRes?.data);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function switchTab(tab) {
  if (tab === 'wallet' && !cryptoEnabled.value) return;
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

// 点击删除：先打开二次确认弹窗（对齐 Android CommonMyDialog）
function requestDelete(item) {
  if (!bindingId(item)) return;
  pendingDelete.value = item;
  deleteConfirmOpen.value = true;
}

function cancelDelete() {
  deleteConfirmOpen.value = false;
  pendingDelete.value = null;
}

async function confirmDelete() {
  const item = pendingDelete.value;
  const id = item ? bindingId(item) : '';
  deleteConfirmOpen.value = false;
  if (!id) return;
  try {
    await removeBinding(bindingApiType(activeTab.value), id);
    toast.success(t('操作成功'));
    await loadBindings();
  } catch (e) {
    toast.error(e?.message || t('提交失败请重试'));
  } finally {
    pendingDelete.value = null;
  }
}

function openAdd() {
  // 区块链未开启时拦截新增（对齐 Android withdraw_blockchain_disabled）
  if (activeTab.value === 'wallet' && !cryptoEnabled.value) {
    toast.error(t('区块链提现暂未开启'));
    return;
  }
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
      <div class="bindings-tabs" :class="{ 'bindings-tabs--single': !cryptoEnabled }" role="tablist">
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
          v-if="cryptoEnabled"
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
              'bindings-item--wallet': activeTab === 'wallet',
            }"
          >
            <button type="button" class="bindings-item__main" @click="selectItem(item)">
              <template v-if="activeTab === 'wallet'">
                <span class="bindings-item__name">{{ walletChainType(item) }}</span>
                <span class="bindings-item__desc">{{ walletAddressText(item) }}</span>
              </template>
              <span v-else class="bindings-item__name">{{ bankDisplayName(item) }}</span>
            </button>
            <button
              v-if="managementMode"
              type="button"
              class="bindings-item__action bindings-item__action--delete"
              :aria-label="t('删除')"
              @click="requestDelete(item)"
            >
              <span aria-hidden="true"></span>
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
          <span class="bindings-add__plus" aria-hidden="true">+</span>
          {{ activeTab === 'bank' ? t('添加其他银行卡') : t('添加其他区块链') }}
        </button>
      </template>
    </main>

    <ProfileBindingModal
      v-model="bindingModalOpen"
      :initial-tab="activeTab === 'wallet' ? 'wallet' : 'bank'"
      @saved="handleBindingSaved"
    />

    <BaseModal
      :model-value="deleteConfirmOpen"
      :title="t('提示')"
      :show-close="false"
      @update:model-value="cancelDelete"
    >
      <div class="bindings-delete-dialog__body">
        <p>{{ deleteConfirmText }}</p>
      </div>
      <div class="bindings-delete-dialog__actions">
        <button type="button" class="bindings-delete-dialog__btn--cancel" @click="cancelDelete">
          {{ t('取消') }}
        </button>
        <button type="button" class="bindings-delete-dialog__btn--confirm" @click="confirmDelete">
          {{ t('确定') }}
        </button>
      </div>
    </BaseModal>
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

  // 区块链未开启时仅剩银行卡单 Tab，占满整行
  &--single {
    grid-template-columns: 1fr;
  }
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
  min-height: 54px;
  padding: 0 18px;
  border-radius: 16px;
  background: #eaf1f9;

  // 区块链项为两行（链类型 + 地址），高度对齐 App 的 80dp
  &--wallet {
    min-height: 80px;
  }
}

.bindings-item__main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
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
  font-size: 16px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bindings-item__desc {
  display: block;
  overflow: hidden;
  color: rgba(11, 52, 98, 0.6);
  font-size: 14px;
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

  // 选中态：蓝色实心 + 白色内环（对齐 App icon063 单选选中）
  &--checked {
    border-color: #1c7bff;
    background: #1c7bff;
    box-shadow: inset 0 0 0 4px #fff;
  }

  // 管理态：红色圆形减号删除按钮（对齐 App icon129）
  &--delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: #ff2d2d;
    cursor: pointer;

    span {
      width: 12px;
      height: 2px;
      border-radius: 1px;
      background: #fff;
    }
  }
}

.bindings-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 54px;
  margin-top: 8px;
  border: 0;
  border-radius: 16px;
  background: #eaf1f9;
  color: #1c7bff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.bindings-add__plus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 18px;
  line-height: 1;
}

.bindings-delete-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 0 8px;
  border-radius: 12px;
  background: #fff;
  color: #0b3462;
  font-size: 16px;
  font-weight: 500;
  text-align: center;

  p {
    margin: 0;
    word-break: break-all;
  }
}

.bindings-delete-dialog__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;

  button {
    height: 44px;
    border-radius: 22px;
    font-size: 18px;
    font-weight: 400;
    cursor: pointer;
  }
}

.bindings-delete-dialog__btn--cancel {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}

.bindings-delete-dialog__btn--confirm {
  border: 0;
  background: #fff;
  color: var(--theme-primary);
}
</style>
