<script setup>
/**
 * PC 绑定信息管理弹窗：银行卡/区块链列表、移除和新增入口。
 * 列表展示复用 BindingListPanel，接口和删除确认保留在业务组件内。
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';
import BindingListPanel from '@/components/BindingListPanel.vue';
import ProfileBindingModal from './ProfileBindingModal.vue';
import { fetchBindings, removeBinding } from '@/api/user';
import { fetchWithdrawMethods } from '@/api/finance';
import { useToast } from '@/hooks/useToast';
import { getImageUrl } from '@/utils/common';
import iconDialogInfoUrl from '@/assets/images/common/icon_dialog_info.svg?url';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const error = ref(false);
const activeTab = ref('bank');
const bankList = ref([]);
const walletList = ref([]);
const cryptoEnabled = ref(true);
const addModalOpen = ref(false);
const deleteConfirmOpen = ref(false);
const pendingDelete = ref(null);

function bindingId(item) {
  return String(item.id ?? item.bindingId ?? '');
}

function isBankBinding(item) {
  const type = String(item.type || item.bindingType || '').toLowerCase();
  return /bank/.test(type) || (!!item.bankName && !item.chainType && !item.address);
}

function isCryptoBinding(item) {
  const type = String(item.type || item.bindingType || '').toLowerCase();
  return /crypto|wallet|usdt|trc|erc|chain/.test(type) || !!item.chainType || (!!item.address && !item.bankName);
}

function bankDisplayName(item) {
  const bankName = item.bankName || item.name || item.display1 || '';
  const account = String(item.maskedNumber || item.cardNumber || item.accountNo || item.display2 || '');
  const lastFour = account.replace(/\D/g, '').slice(-4);
  if (!bankName) return account || '—';
  return lastFour ? `${bankName}(${lastFour})` : bankName;
}

function walletChainType(item) {
  return item.chainType || item.network || item.walletType || 'TRC20';
}

function walletAddressText(item) {
  return item.address || item.maskedAddress || item.accountNo || '—';
}

function resolveCryptoEnabled(methods) {
  if (!methods || typeof methods !== 'object') return true;
  return methods.crypto !== false;
}

const tabs = computed(() => [
  { key: 'bank', label: t('银行卡') },
  ...(cryptoEnabled.value ? [{ key: 'wallet', label: t('区块链') }] : []),
]);
const currentList = computed(() => (activeTab.value === 'bank' ? bankList.value : walletList.value));
const displayItems = computed(() => currentList.value.map((item) => ({
  id: bindingId(item),
  primary: activeTab.value === 'bank' ? bankDisplayName(item) : walletChainType(item),
  secondary: activeTab.value === 'wallet' ? walletAddressText(item) : '',
  removeLabel: t('删除'),
  raw: item,
})));
const addText = computed(() => (activeTab.value === 'bank' ? t('添加其他银行卡') : t('添加其他区块链')));
const deleteConfirmText = computed(() => {
  const item = pendingDelete.value;
  if (!item) return '';
  const name = activeTab.value === 'bank'
    ? bankDisplayName(item)
    : `${walletChainType(item)} ${walletAddressText(item)}`;
  return t('删除绑定确认带名称', { name });
});

function close() {
  emit('update:modelValue', false);
}

async function loadBindings() {
  loading.value = true;
  error.value = false;
  try {
    const [bindingsRes, methodsRes] = await Promise.all([
      fetchBindings(),
      fetchWithdrawMethods().catch(() => null),
    ]);
    const raw = bindingsRes?.data;
    const list = Array.isArray(raw) ? raw : (raw?.records || []);
    bankList.value = list.filter(isBankBinding);
    walletList.value = list.filter(isCryptoBinding);
    cryptoEnabled.value = resolveCryptoEnabled(methodsRes?.data);
    if (!cryptoEnabled.value && activeTab.value === 'wallet') activeTab.value = 'bank';
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function requestDelete(item) {
  pendingDelete.value = item?.raw || item;
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
    await removeBinding(activeTab.value === 'bank' ? 'bank-card' : 'crypto', id);
    toast.success(t('操作成功'));
    await loadBindings();
  } catch (errorValue) {
    toast.error(errorValue?.message || t('提交失败请重试'));
  } finally {
    pendingDelete.value = null;
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) loadBindings();
  },
);
</script>

<template>
  <BaseModal :model-value="props.modelValue" :title="t('绑定信息')" :button-text="t('确认')"
    @update:model-value="emit('update:modelValue', $event)" @confirm="close">
    <div class="binding-manager">
      <div v-if="loading" class="binding-manager__state">{{ t('加载中') }}</div>
      <div v-else-if="error" class="binding-manager__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" @click="loadBindings">{{ t('重试') }}</button>
      </div>
      <BindingListPanel v-else class="binding-manager__list-panel" :tabs="tabs" :active-tab="activeTab"
        :items="displayItems" :selectable="false" removable :add-text="addText"
        @update:active-tab="activeTab = $event" @remove="requestDelete" @add="addModalOpen = true">
        <template #add-icon><img :src="getImageUrl('profile/add_address_icon.svg')" alt=""></template>
      </BindingListPanel>
    </div>
  </BaseModal>

  <ProfileBindingModal v-model="addModalOpen" :initial-tab="activeTab" @saved="loadBindings" />

  <BaseModal :model-value="deleteConfirmOpen" :title="t('提示')" :show-close="false" @update:model-value="cancelDelete">
    <div class="binding-manager__confirm-text">
      <span class="binding-manager__confirm-icon" aria-hidden="true">
        <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
      </span>
      <span>{{ deleteConfirmText }}</span>
    </div>
    <div class="binding-manager__confirm-actions">
      <button type="button" @click="cancelDelete">{{ t('取消') }}</button>
      <button type="button" @click="confirmDelete">{{ t('确定') }}</button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.binding-manager {
  min-height: 440px;
  padding: 0;
  background: transparent;
  --binding-list-tabs-bg: #eaf1f9;
  --binding-list-add-bg: #e4f0fe;
}

.binding-manager__state {
  display: flex;
  min-height: 440px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 20px;
  background: #fff;
  color: rgba(11, 52, 98, 0.55);
}

.binding-manager__state button {
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--theme-primary);
  border-radius: 18px;
  background: #fff;
  color: var(--theme-primary);
}

/* 公共列表在该弹窗中拆为顶部 Tab 和下方白色内容卡片，以匹配绑定信息设计。 */
.binding-manager :deep(.binding-list-panel__tabs) {
  margin-bottom: 10px;
}

.binding-manager :deep(.binding-list-panel__list) {
  min-height: 360px;
  padding: 18px;
  box-sizing: border-box;
  border-radius: 20px;
  background: #fff;
}

.binding-manager__confirm-text {
  display: flex;
  min-height: 112px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  box-sizing: border-box;
  border-radius: 20px;
  background: #fff;
  // 与登录确认弹窗文案一致：16px / Regular / #0B3462
  color: #0b3462;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  text-align: center;
  word-break: break-all;
}

.binding-manager__confirm-icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  align-items: center;
  justify-content: center;

  img {
    display: block;
    width: 20px;
    height: 20px;
  }
}

.binding-manager__confirm-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.binding-manager__confirm-actions button {
  height: 48px;
  border: 0;
  border-radius: 24px;
  background: #fff;
  color: var(--theme-primary);
  font-size: 18px;
  cursor: pointer;
}

.binding-manager__confirm-actions button:first-child {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}
</style>
