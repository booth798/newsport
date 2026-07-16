<script setup>
/**
 * 区块链提现页（PC 按设计稿 1309-39335 还原）
 * 结构：钱包地址卡（可切换/更换地址）→ 注意事项 → 提款金额/密码表单 →
 *       月份筛选 → 已完成总合计 → 提现记录列表
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { getImageUrl } from '@/utils/common'

import BaseInput from '@/components/BaseInput.vue';
import EmptyState from '@/components/EmptyState.vue';
import MonthSelector from '@/components/MonthSelector.vue';
import WithdrawAddressModal from './components/WithdrawAddressModal.vue';
import WithdrawBindingForm from './components/WithdrawBindingForm.vue';
import WithdrawNoticeModal from './components/WithdrawNoticeModal.vue';

import { fetchWithdrawList, submitWithdraw } from '@/api/finance';
import { fetchBindings } from '@/api/user';
import { useToast } from '@/hooks/useToast';
import { useUserStore } from '@/store/modules/user';
import { useAppStore } from '@/store/modules/app';

const PAGE_SIZE = 20;
const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已提现' },
  { value: 'processing', label: '审核中' },
  { value: 'cancelled', label: '提现失败' },
];

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();
const appStore = useAppStore();
const { loggedInAssetsFormatted } = storeToRefs(userStore);

const { isMobile } = storeToRefs(appStore);

// 表单
const wallets = ref([]);
const selectedWalletId = ref('');
const amount = ref('');
const withdrawPassword = ref('');
const submitting = ref(false);

// 弹窗
const addressModalOpen = ref(false);
const bindingFormOpen = ref(false);
const noticeModalOpen = ref(false);

// 记录
const recordsLoading = ref(true);
const recordsError = ref(false);
const loadingMore = ref(false);
const records = ref([]);
const pageNum = ref(1);
const reachedEnd = ref(false);
const filterOpen = ref(false);
const filterRef = ref(null);
const selectedFilter = ref('all');

const selectedWallet = computed(
  () => wallets.value.find((w) => w.id === selectedWalletId.value) || null,
);
const hasMore = computed(() => !reachedEnd.value && records.value.length > 0);
const selectedFilterLabel = computed(
  () => FILTER_OPTIONS.find((o) => o.value === selectedFilter.value)?.label || '全部',
);

// 按筛选态过滤已加载记录（后端 data 为数组、无独立筛选接口时的兜底）
const visibleRecords = computed(() => {
  if (selectedFilter.value === 'all') return records.value;
  return records.value.filter((r) => r.statusTone === selectedFilter.value);
});
// 已完成总合计：累计已提现记录金额
const completedTotal = computed(() =>
  records.value
    .filter((r) => r.statusTone === 'completed')
    .reduce((sum, r) => sum + (Number(r.rawAmount) || 0), 0),
);

const displayBalance = computed(() => {
  const value = Number(String(loggedInAssetsFormatted.value ?? 0).replaceAll(',', ''));
  return formatMoney(Number.isFinite(value) ? value : 0);
});

const selectedMonth = computed({
  get() {
    const month = Array.isArray(route.query.month) ? route.query.month[0] : route.query.month;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : getCurrentMonth();
  },
  set(month) {
    router.replace({ query: { ...route.query, month } });
  },
});

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00';
  return number.toLocaleString(locale.value, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const p = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${p('year')}-${p('month')}-${p('day')} ${p('hour')}:${p('minute')}`;
}

function statusInfo(status) {
  const s = String(status || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'DONE', 'PAID', 'FINISHED', 'APPROVED'].includes(s)) {
    return { tone: 'completed', label: t('已提现') };
  }
  if (['PENDING', 'PROCESSING', 'REVIEWING', 'CREATED', 'WAIT', 'AUDITING'].includes(s)) {
    return { tone: 'processing', label: t('审核中') };
  }
  if (['CANCELLED', 'CANCELED', 'FAILED', 'REJECTED', 'EXPIRED'].includes(s)) {
    return { tone: 'cancelled', label: t('提现失败') };
  }
  return { tone: 'processing', label: t('审核中') };
}

// 仅保留区块链类钱包（含链类型/地址、或类型标记为 crypto/wallet）
function isCryptoBinding(b) {
  if (b.chainType || b.network) return true;
  const type = String(b.type || '').toLowerCase();
  return /crypto|wallet|usdt|trc|erc|chain/.test(type);
}

function normalizeWallet(b) {
  return {
    id: String(b.id ?? b.bindingId ?? b.address ?? ''),
    chainType: b.chainType || b.network || b.walletType || 'TRC20',
    address: b.address || b.accountNo || '',
    isDefault: !!b.isDefault,
  };
}

async function loadWallets(preferredId = '') {
  try {
    const res = await fetchBindings();
    const list = Array.isArray(res?.data) ? res.data : (res?.data?.records || []);
    wallets.value = list.filter(isCryptoBinding).map(normalizeWallet);
    const currentId = String(preferredId || selectedWalletId.value || '');
    const selected = wallets.value.find((wallet) => wallet.id === currentId)
      || wallets.value.find((wallet) => wallet.isDefault)
      || wallets.value[0];
    selectedWalletId.value = selected?.id || '';
  } catch {
    wallets.value = [];
  }
}

function normalizeRecord(r) {
  const info = statusInfo(r.status);
  return {
    id: r.id || r.orderNo,
    createdAt: formatDateTime(r.createdAt),
    rawAmount: Number(r.amount) || 0,
    amount: formatMoney(r.amount),
    currency: r.currency || 'CNY',
    address: r.toAddress || r.address || '—',
    rejectReason: r.rejectReason || '',
    statusLabel: info.label,
    statusTone: info.tone,
  };
}

function buildParams(page) {
  return { pageNum: page, pageSize: PAGE_SIZE, month: selectedMonth.value };
}

function applyResponse(res, append, requestedPage) {
  const list = Array.isArray(res?.data) ? res.data : (res?.data?.records || []);
  const next = list.map(normalizeRecord);
  records.value = append ? [...records.value, ...next] : next;
  pageNum.value = requestedPage;
  reachedEnd.value = list.length < PAGE_SIZE;
}

async function loadRecords() {
  recordsLoading.value = true;
  recordsError.value = false;
  reachedEnd.value = false;
  try {
    const res = await fetchWithdrawList(buildParams(1));
    applyResponse(res, false, 1);
  } catch {
    recordsError.value = true;
  } finally {
    recordsLoading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  const nextPage = pageNum.value + 1;
  try {
    loadingMore.value = true;
    const res = await fetchWithdrawList(buildParams(nextPage));
    applyResponse(res, true, nextPage);
  } catch {
    toast.error(t('加载失败'));
  } finally {
    loadingMore.value = false;
  }
}

function openAddressModal() {
  // 无论是否已有地址，都先进入选择界面，由用户主动点击添加入口后再打开绑定表单。
  addressModalOpen.value = true;
}

function handleAddressConfirm(id) {
  if (id) selectedWalletId.value = id;
}

function openAddAddress() {
  addressModalOpen.value = false;
  bindingFormOpen.value = true;
}

async function handleWalletSaved(binding) {
  // 新增地址后刷新接口列表，并优先选中新绑定项。
  await loadWallets(binding?.id);
}

function selectFilter(value) {
  selectedFilter.value = value;
  filterOpen.value = false;
}

function handleFilterOutsideClick(event) {
  if (!filterRef.value?.contains(event.target)) filterOpen.value = false;
}

async function handleSubmit() {
  if (submitting.value) return;
  if (!selectedWallet.value) {
    toast.error(t('请先添加提现地址'));
    return;
  }
  const val = Number(amount.value);
  if (!String(amount.value).trim()) {
    toast.error(t('请输入金额'));
    return;
  }
  if (!Number.isFinite(val) || val <= 0) {
    toast.error(t('金额必须大于零'));
    return;
  }
  if (!withdrawPassword.value.trim()) {
    toast.error(t('请输入提款密码'));
    return;
  }
  try {
    submitting.value = true;
    await submitWithdraw({
      amount: val,
      withdrawPassword: withdrawPassword.value,
      method: selectedWallet.value.chainType,
      chainType: selectedWallet.value.chainType,
      bindingId: selectedWallet.value.id,
      toAddress: selectedWallet.value.address,
    });
    toast.success(t('操作成功'));
    amount.value = '';
    withdrawPassword.value = '';
    await loadRecords();
  } catch (e) {
    toast.error(e?.message || t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}

watch(selectedMonth, () => {
  loadRecords();
});

onMounted(() => {
  loadWallets();
  loadRecords();
  document.addEventListener('click', handleFilterOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleFilterOutsideClick);
});
</script>

<template>
  <div class="wc-page">
    <section class="wc-wallet" aria-label="wallet">
      <img class="bank-card__bg" :src="getImageUrl(`profile/${isMobile ? 'h5' : 'pc'}_bank_bg.png`)" alt="">
      <div class="wc-wallet__inner">
        <div class="wc-wallet__top">
          <span class="wc-wallet__chain">{{ selectedWallet ? selectedWallet.chainType : 'TRC20' }}</span>
          <span class="wc-wallet__type">（{{ t('钱包类型') }}）</span>
          <button type="button" class="wc-wallet__switch" @click="openAddressModal">
            {{ t(selectedWallet ? '切换' : '新增') }}
            <i aria-hidden="true"></i>
          </button>
        </div>
        <div class="wc-wallet__addr">
          {{ selectedWallet ? selectedWallet.address : t('请先添加提现地址') }}
        </div>
      </div>
    </section>
    <main class="wc-panel">
      <!-- 钱包地址卡 -->

      <!-- 提现表单 -->
      <form class="wc-form" @submit.prevent="handleSubmit">
        <div class="wc-notice" @click="noticeModalOpen = true">
          <img class="withdraw-notice__icon-img" :src="getImageUrl('common/icon_tips.svg')" alt="">
          <span class="wc-notice__text">{{ t('注意事项') }}</span>
          <i class="wc-notice__arrow" aria-hidden="true"></i>
        </div>

        <label class="wc-field">
          <span class="wc-field__label">{{ t('提款金额') }}</span>
          <BaseInput v-model="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" />
          <small class="wc-field__hint">{{ t('余额') }}：<b>{{ displayBalance }} CNY</b></small>
        </label>

        <label class="wc-field">
          <span class="wc-field__label">{{ t('提款密码') }}</span>
          <BaseInput v-model="withdrawPassword" type="password" autocomplete="current-password"
            :placeholder="t('请输入提款密码')" />
        </label>

        <button class="wc-form__submit btn btn--primary" type="submit" :disabled="submitting">
          {{ submitting ? t('提交中...') : t('送出提款申请') }}
        </button>
      </form>

      <!-- 记录 -->
      <section class="wc-records" :aria-label="t('提现')">
        <div class="wc-records__toolbar">
          <MonthSelector v-model="selectedMonth" :aria-label="t('选择月份')" />
        </div>

        <div v-if="recordsLoading" class="wc-state">
          <div class="wc-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>
        <div v-else-if="recordsError" class="wc-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="wc-retry" @click="loadRecords">{{ t('重试') }}</button>
        </div>
        <template v-else>
          <!-- 汇总 + 筛选 -->
          <div class="wc-summary">
            <div class="wc-summary__header">
              <span>{{ t('已完成总合计') }}</span>
              <div ref="filterRef" class="wc-filter">
                <button type="button" class="wc-filter__trigger" :aria-expanded="filterOpen"
                  @click.stop="filterOpen = !filterOpen">
                  {{ t(selectedFilterLabel) }}
                  <i aria-hidden="true"></i>
                </button>
                <div v-if="filterOpen" class="wc-filter__menu">
                  <button v-for="option in FILTER_OPTIONS" :key="option.value" type="button"
                    :class="{ active: selectedFilter === option.value }" @click="selectFilter(option.value)">
                    {{ t(option.label) }}
                  </button>
                </div>
              </div>
            </div>
            <strong>{{ formatMoney(completedTotal) }}</strong>
          </div>

          <EmptyState v-if="!visibleRecords.length" :text="t('暂无记录')" />

          <article v-for="record in visibleRecords" :key="record.id" class="wc-record">
            <div class="wc-record__header">
              <time>{{ record.createdAt }}</time>
              <span class="wc-record__badge" :class="`wc-record__badge--${record.statusTone}`">
                {{ record.statusLabel }}
              </span>
            </div>
            <dl class="wc-record__body">
              <div>
                <dt>{{ t('金额') }}</dt>
                <dd>{{ record.amount }} {{ record.currency }}</dd>
              </div>
              <div>
                <dt>{{ t('收款地址') }}</dt>
                <dd class="wc-record__addr">{{ record.address }}</dd>
              </div>
              <div v-if="record.statusTone === 'cancelled' && record.rejectReason">
                <dt>{{ t('备注') }}</dt>
                <dd class="wc-record__reason">{{ record.rejectReason }}</dd>
              </div>
            </dl>
          </article>

          <button v-if="hasMore" type="button" class="wc-more" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? t('加载中') : t('加载更多') }}
          </button>
        </template>
      </section>
    </main>

    <!-- 更换地址弹窗 -->
    <WithdrawAddressModal v-model="addressModalOpen" :addresses="wallets" :selected-id="selectedWalletId"
      @confirm="handleAddressConfirm" @add="openAddAddress" />

    <!-- 新增地址：PC 使用弹窗，H5 使用独立全屏表单。 -->
    <WithdrawBindingForm v-model="bindingFormOpen" type="wallet" @saved="handleWalletSaved" />
    <WithdrawNoticeModal v-model="noticeModalOpen" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.wc-page {
  width: 100%;
  color: var(--theme-text);
}

.wc-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @include web-only {
    padding: 24px;
    border: 1px solid var(--auxiliary-1);
    border-radius: 32px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
    margin-top: 20px;
  }

  @include mobile-only {
    gap: 12px;
  }
}

/* ---------- 钱包卡 ---------- */
.wc-wallet {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  color: var(--auxiliary-1);

  .bank-card__bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .wc-wallet__inner {
    position: relative;
  }

  @include web-only {
    padding: 22px 24px;
    height: 200px;
  }

  @include mobile-only {
    height: 166px;
    padding: 18px;
  }
}

.wc-wallet__top {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wc-wallet__chain {
  font-size: 20px;
  font-weight: 600;
}

.wc-wallet__type {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.wc-wallet__switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  margin-left: auto;
  padding: 0 12px;
  border: 0;
  border-radius: 18px;
  background: rgba(28, 123, 255, 0.9);
  color: var(--auxiliary-1);
  font-size: 12px;
  cursor: pointer;

  i {
    width: 5px;
    height: 5px;
    border-right: 1.5px solid currentColor;
    border-top: 1.5px solid currentColor;
    transform: rotate(45deg);
  }
}

.wc-wallet__addr {
  overflow: hidden;
  font-family: $font-family-num, $font-family-base;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-overflow: ellipsis;
  white-space: nowrap;

  @include web-only {
    margin-top: 100px;
  }

  @include mobile-only {
    margin-top: 80px;
    font-size: 15px;
  }
}

/* ---------- 表单 ---------- */
.wc-form {
  display: flex;
  flex-direction: column;

  @include web-only {
    gap: 18px;
    border-radius: 20px;
  }

  @include mobile-only {
    gap: 14px;
    padding: 16px;
    border-radius: 16px;
    background: var(--auxiliary-1);
    margin-top: 8px;
  }
}

.wc-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 16px;
  background: rgba(251, 92, 13, 0.1);
  color: #fb5c0d;
  font-size: 13px;
  cursor: pointer;
}

.withdraw-notice__icon-img {
  width: 20px;
  height: 20px;
  margin-right: 4px;
}

.wc-notice__arrow {
  width: 7px;
  height: 7px;
  margin-left: auto;
  border-right: 1.5px solid currentColor;
  border-top: 1.5px solid currentColor;
  transform: rotate(45deg);
}

.wc-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
}

.wc-field__label {
  color: rgba(11, 52, 98, 0.5);
}

.wc-field__hint {
  font-size: 12px;

  b {
    color: var(--theme-primary);
    font-weight: 500;
  }
}

.wc-form__submit {
  align-self: center;
  width: 300px;
  height: 48px;
  margin-top: 4px;
  font-size: 18px;

  @include mobile-only {
    width: 100%;
    height: 44px;
  }
}

/* ---------- 记录 ---------- */
.wc-records {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
}

.wc-records__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @include mobile-only {
    display: none;
  }
}

.wc-summary {
  position: relative;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--theme-divider);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(28, 123, 255, 0.2), rgba(28, 123, 255, 0) 100px), #fff;
  font-size: 14px;

  strong {
    box-sizing: border-box;
    height: 38px;
    padding: 7px 10px;
    border-radius: 6px;
    background: rgba(28, 123, 255, 0.1);
    color: var(--theme-primary);
    font-size: 20px;
    font-weight: 500;
    font-family: $font-family-num, $font-family-base;
  }
}

.wc-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wc-filter__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 18px;
  background: var(--theme-primary);
  color: var(--auxiliary-1);
  font-size: 14px;
  box-shadow: var(--shadow-primary-btn);
  cursor: pointer;

  i {
    width: 7px;
    height: 7px;
    margin-top: -3px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg);
  }
}

.wc-filter {
  position: relative;
}

.wc-filter__menu {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  width: 120px;
  overflow: hidden;
  border-radius: 16px;
  background: var(--auxiliary-1);
  box-shadow: 0 4px 14px rgba(21, 58, 119, 0.18);

  button {
    height: 44px;
    padding: 0 16px;
    border: 0;
    background: transparent;
    color: var(--theme-text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;

    &:hover,
    &.active {
      background: #eaf1f9;
    }
  }
}

.wc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  gap: 12px;
  color: #7b92ad;
  font-size: 14px;
}

.wc-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: wc-spin 0.8s linear infinite;
}

@keyframes wc-spin {
  to {
    transform: rotate(360deg);
  }
}

.wc-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid #1c7bff;
  border-radius: 16px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  cursor: pointer;
}

.wc-record {
  box-sizing: border-box;
  padding: 16px;
  border-radius: 16px;
  background: rgba(28, 123, 255, 0.1);

  @include mobile-only {
    background: var(--auxiliary-1);
    box-shadow: 0 2px 12px rgba(21, 58, 118, 0.06);
  }
}

.wc-record__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  time {
    color: var(--theme-text);
    font-size: 14px;
    font-weight: 300;
  }
}

.wc-record__badge {
  min-width: 56px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;

  &--completed {
    background: rgba(11, 52, 98, 0.1);
    color: #5d7899;
  }

  &--processing {
    background: rgba(28, 123, 255, 0.15);
    color: #1c7bff;
  }

  &--cancelled {
    background: rgba(255, 45, 45, 0.12);
    color: #ff2d2d;
  }
}

.wc-record__body {
  margin: 0;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--auxiliary-1);

  div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 48px;
    padding: 8px 0;

    &+div {
      border-top: 1px solid var(--theme-divider);
    }
  }

  dt,
  dd {
    margin: 0;
  }

  dt {
    flex-shrink: 0;
    color: rgba(11, 52, 98, 0.5);
    font-size: 14px;
  }

  dd {
    color: var(--theme-text);
    font-size: 16px;
    font-weight: 500;
    text-align: right;
    word-break: break-all;
  }
}

.wc-record__addr {
  font-family: $font-family-num, $font-family-base;
  font-size: 14px !important;
  font-weight: 400 !important;
}

.wc-record__reason {
  color: #ff2d2d !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  line-height: 1.4;
}

.wc-more {
  align-self: center;
  padding: 8px 20px;
  border: 0;
  background: transparent;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
  cursor: pointer;
}
</style>
