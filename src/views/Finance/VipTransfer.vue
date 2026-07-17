<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import BaseInput from '@/components/BaseInput.vue';
import EmptyState from '@/components/EmptyState.vue';
import MonthSelector from '@/components/MonthSelector.vue';
import { fetchBalance, fetchTransferRecords, transfer } from '@/api/finance';
import { useToast } from '@/hooks/useToast';
import { useUserStore } from '@/store/modules/user';

import { getImageUrl } from '@/utils/common';

const PAGE_SIZE = 20;
// 与安卓 MemberTransferActivity 一致：金额下限 1，提现密码 6-20 位字母数字。
const MIN_TRANSFER_AMOUNT = 1;
const WITHDRAW_PASSWORD_PATTERN = /^[a-zA-Z0-9]{6,20}$/;
const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'out', label: '会员转出' },
  { value: 'in', label: '会员转入' },
];

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();
const { loggedInAssetsFormatted } = storeToRefs(userStore);

const loading = ref(true);
const error = ref(false);
const submitting = ref(false);
const loadingMore = ref(false);
const accountId = ref('');
const amount = ref('');
const withdrawPassword = ref('');
const records = ref([]);
const total = ref(0);
const totalAmount = ref(0);
const pageNum = ref(1);
const selectedType = ref('all');
const filterOpen = ref(false);
const filterRef = ref(null);
const selectedMonth = computed({
  get() {
    const month = Array.isArray(route.query.month) ? route.query.month[0] : route.query.month;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : getCurrentMonth();
  },
  set(month) {
    // PC 月份选择器同步到路由，移动端 Header 会立即展示同一月份。
    router.replace({ query: { ...route.query, month } });
  },
});

const hasMore = computed(() => records.value.length < total.value);
const selectedFilterLabel = computed(
  () => FILTER_OPTIONS.find((option) => option.value === selectedType.value)?.label || '全部',
);
const balanceAmount = computed(() => {
  // 余额展示读取用户 store；提交前不在前端拦截余额不足，交由后端校验（对齐安卓）。
  const value = Number(String(loggedInAssetsFormatted.value ?? 0).replaceAll(',', ''));
  return Number.isFinite(value) ? value : 0;
});
const displayBalance = computed(() => formatMoney(balanceAmount.value));

onMounted(() => {
  // 与安卓一致：进入页面先刷新钱包余额，再拉互转记录。
  refreshWalletBalance();
  loadPage();
  document.addEventListener('click', handleFilterOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleFilterOutsideClick);
});

// 移动端 Header 和 PC 选择器都通过路由月份触发同一条记录查询。
watch(selectedMonth, () => {
  refreshRecords();
});

async function refreshWalletBalance() {
  try {
    const res = await fetchBalance();
    // 主钱包字段优先级对齐安卓：balance ?: available
    const nextBalance = res.data?.balance ?? res.data?.available;
    if (nextBalance != null) {
      userStore.updateUserProfile({ balance: nextBalance });
    }
  } catch {
    // 余额刷新失败不阻断页面，记录列表仍可正常加载。
  }
}

async function loadPage({ silent = false } = {}) {
  // 首次进入展示轻量 loading；筛选/提交后的刷新静默更新，避免整块「加载中」闪屏。
  if (!silent) {
    loading.value = true;
  }
  error.value = false;
  try {
    const recordsRes = await fetchTransferRecords(buildRecordParams(1));
    applyRecordResponse(recordsRes, false);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
}

function buildRecordParams(page) {
  return {
    type: selectedType.value,
    month: selectedMonth.value,
    pageNum: page,
    pageSize: PAGE_SIZE,
  };
}

function applyRecordResponse(response, append) {
  const data = response?.data || {};
  const nextRecords = (data.records || []).map(normalizeRecord);
  records.value = append ? [...records.value, ...nextRecords] : nextRecords;
  total.value = Number(data.total) || 0;
  totalAmount.value = Number(data.totalAmount) || 0;
  pageNum.value = Number(data.pageNum) || 1;
}

function normalizeRecord(record) {
  return {
    id: record.transferId,
    direction: record.direction === 'in' ? 'in' : 'out',
    typeLabel: record.typeLabel || (record.direction === 'in' ? '会员转入' : '会员转出'),
    amount: formatMoney(record.amount),
    account: record.counterpartyNo || '—',
    createdAt: formatDateTime(record.createdAt),
  };
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00';
  return number.toLocaleString(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

async function handleSubmit() {
  // 校验与请求体字段对齐安卓 MemberTransferActivity.validateTransfer / transfer。
  const account = accountId.value.trim();
  const amountText = String(amount.value ?? '').replaceAll(',', '').trim();
  const password = withdrawPassword.value.trim();
  const transferAmount = Number(amountText);

  if (!account) {
    toast.error(t('请输入对方账户ID'));
    return;
  }
  if (
    !Number.isFinite(transferAmount)
    || transferAmount < MIN_TRANSFER_AMOUNT
    || amountText.startsWith('-')
    || !/^\d+(\.\d{1,2})?$/.test(amountText)
  ) {
    toast.error(t('互转金额格式提示'));
    return;
  }
  if (!password) {
    toast.error(t('请输入提款密码'));
    return;
  }
  if (!WITHDRAW_PASSWORD_PATTERN.test(password)) {
    toast.error(t('提现密码格式提示'));
    return;
  }

  try {
    submitting.value = true;
    // 传参与安卓一致：toCustomerNo / amount / withdrawPassword，并带 Idempotency-Key。
    await transfer({
      toCustomerNo: account,
      amount: transferAmount,
      withdrawPassword: password,
    });
    toast.success(t('转账申请已提交'));
    accountId.value = '';
    amount.value = '';
    withdrawPassword.value = '';
    // 与安卓一致：成功后重新拉取钱包余额，再静默刷新互转记录。
    await refreshWalletBalance();
    await loadPage({ silent: true });
  } catch (error) {
    toast.error(error?.message || t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}

async function refreshRecords() {
  // 切换月份/筛选时静默刷新，保留当前列表，避免大块「加载中」文案。
  await loadPage({ silent: true });
}

function selectRecordType(type) {
  if (selectedType.value === type) {
    filterOpen.value = false;
    return;
  }
  selectedType.value = type;
  filterOpen.value = false;
  refreshRecords();
}

function handleFilterOutsideClick(event) {
  if (!filterRef.value?.contains(event.target)) {
    filterOpen.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  try {
    loadingMore.value = true;
    const response = await fetchTransferRecords(buildRecordParams(pageNum.value + 1));
    applyRecordResponse(response, true);
  } catch {
    toast.error(t('加载失败'));
  } finally {
    loadingMore.value = false;
  }
}

</script>

<template>
  <div class="vip-transfer">
    <main class="vip-transfer__panel">
      <form class="vip-transfer-form" @submit.prevent="handleSubmit">
        <div class="vip-transfer-notice">
          <img :src="getImageUrl('common/icon_tips.svg')">
          <div class="vip-transfer-notice__content">
            <strong>{{ t('温馨提示') }}</strong>
            <p>{{ t('互转提示第一行') }}<br />{{ t('互转提示第二行') }}</p>
          </div>
        </div>

        <label class="vip-transfer-field">
          <span>{{ t('转入账户') }}</span>
          <BaseInput v-model="accountId" autocomplete="off" :placeholder="t('请输入对方账户ID')" />
        </label>

        <label class="vip-transfer-field">
          <span>{{ t('转出金额') }}</span>
          <BaseInput v-model="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" />
          <small>
            {{ t('余额') }}：<b>{{ displayBalance }} CNY</b>
          </small>
        </label>

        <label class="vip-transfer-field">
          <span>{{ t('提款密码') }}</span>
          <BaseInput v-model="withdrawPassword" type="password" autocomplete="current-password"
            :placeholder="t('请输入提款密码')" />
        </label>

        <button class="vip-transfer-form__submit btn btn--primary" type="submit" :disabled="submitting">
          {{ submitting ? t('处理中...') : t('确认转账') }}
        </button>
      </form>

      <section class="vip-transfer-records" :aria-label="t('互转记录')">
        <div class="vip-transfer-records__toolbar">
          <MonthSelector v-model="selectedMonth" :aria-label="t('选择月份')" />
        </div>

        <div v-if="loading" class="vip-transfer-state" role="status" :aria-label="t('加载中')">
          <span class="vip-transfer-spinner" aria-hidden="true" />
        </div>
        <div v-else-if="error" class="vip-transfer-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="btn btn--primary" @click="loadPage()">{{ t('重试') }}</button>
        </div>
        <template v-else>
          <div class="vip-transfer-summary">
            <div class="vip-transfer-summary__header">
              <span>{{ t('已完成总合计') }}</span>
              <div ref="filterRef" class="vip-transfer-filter">
                <button
                  type="button"
                  class="vip-transfer-filter__trigger"
                  :aria-expanded="filterOpen"
                  :aria-label="t('筛选类型')"
                  @click.stop="filterOpen = !filterOpen"
                >
                  {{ t(selectedFilterLabel) }}
                  <i aria-hidden="true"></i>
                </button>
                <div v-if="filterOpen" class="vip-transfer-filter__menu">
                  <button
                    v-for="option in FILTER_OPTIONS"
                    :key="option.value"
                    type="button"
                    :class="{ active: selectedType === option.value }"
                    @click="selectRecordType(option.value)"
                  >
                    {{ t(option.label) }}
                  </button>
                </div>
              </div>
            </div>
            <strong>{{ formatMoney(totalAmount) }}</strong>
          </div>
          <template v-if="records.length > 0">
            <article v-for="record in records" :key="record.id" class="transfer-record">
              <div class="transfer-record__header">
                <time>{{ record.createdAt }}</time>
                <span>{{ t(record.typeLabel) }}</span>
              </div>
              <dl>
                <div>
                  <dt>{{ t('金额') }}</dt>
                  <dd>{{ record.amount }} CNY</dd>
                </div>
                <div>
                  <dt>{{ t(record.direction === 'in' ? '会员转入' : '会员转出') }}</dt>
                  <dd>{{ record.account }}</dd>
                </div>
              </dl>
            </article>
          </template>
          <EmptyState v-else :text="t('暂无记录')" />

          <button v-if="hasMore" type="button" class="vip-transfer-records__more" :disabled="loadingMore"
            @click="loadMore">
            {{ loadingMore ? t('加载中') : t('加载更多') }}
          </button>
        </template>
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.vip-transfer {
  width: 100%;
  color: var(--theme-text);
}

.vip-transfer__panel {
  box-sizing: border-box;

  @include web-only {
    min-height: min(2590px, calc(100dvh - 20px));
    padding: 24px;
    border: 1px solid var(--auxiliary-1);
    border-radius: 32px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
  }
}

.vip-transfer-form {
  display: flex;
  flex-direction: column;

  @include web-only {
    align-items: stretch;
    gap: 20px;
  }

  @include mobile-only {
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    background: var(--auxiliary-1);
  }
}

.vip-transfer-notice {
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  background: rgba(251, 92, 13, 0.1);
  color: rgba(11, 52, 98, 0.5);

  .vip-transfer-notice__content {
    margin-top: 3px;
    margin-left: 4px;

    strong {
      display: block;
      margin-bottom: 5px;
      color: #fb5c0d;
      font-size: 12px;
      font-weight: 400;
    }

    p {
      font-size: 12px;
      line-height: 20px;
      color: #0B346280;
    }
  }

  @include web-only {
    min-height: 83px;
    padding: 9px 12px;
    border-radius: 16px;
  }

  @include mobile-only {
    min-height: 81px;
    padding: 8px 12px;
    border-radius: 12px;
  }

}

.vip-transfer-field {
  position: relative;
  display: flex;
  flex-direction: column;
  color: #0B346280;
  
  @include web-only {
    gap: 10px;
    font-size: 16px;
  }

  @include mobile-only {
    gap: 6px;
    font-size: 14px;
  }

  small {
    color: rgba(11, 52, 98, 0.5);
    font-size: 12px;
    font-weight: 400;

    b {
      color: var(--theme-primary);
      font-weight: 500;
    }
  }
}

.vip-transfer-form__submit {
  align-self: center;
  width: 300px;
  height: 48px;
  margin-top: 4px;
  font-size: 18px;

  @include mobile-only {
    width: 100%;
    height: 44px;
    margin-top: -4px;
  }
}

.vip-transfer-records {
  display: flex;
  flex-direction: column;
  gap: 16px;

  @include web-only {
    margin-top: 40px;
  }

  @include mobile-only {
    margin-top: 8px;
  }
}

.vip-transfer-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 120px;
  color: #7b92ad;
  font-size: 14px;
}

.vip-transfer-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: vip-transfer-spin 0.8s linear infinite;
}

@keyframes vip-transfer-spin {
  to { transform: rotate(360deg); }
}

.vip-transfer-records__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;

  @include mobile-only {
    display: none;
  }
}

.vip-transfer-summary {
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
  }
  .vip-transfer-summary__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.vip-transfer-filter__trigger {
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

.vip-transfer-filter__menu {
  position: absolute;
  top: 47px;
  right: 16px;
  display: flex;
  flex-direction: column;
  width: 120px;
  overflow: hidden;
  border: 1px solid var(--auxiliary-1);
  border-radius: 16px;
  background: var(--auxiliary-1);
  box-shadow: 0 4px 14px rgba(21, 58, 119, 0.18);

  button {
    height: 48px;
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

.transfer-record {
  box-sizing: border-box;
  padding: 16px;
  border-radius: 16px;
  background: rgba(28, 123, 255, 0.1);

  @include mobile-only {
    background: var(--auxiliary-1);
  }
}

.transfer-record__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  time {
    color: var(--theme-text);
    font-size: 14px;
    font-weight: 300;
  }

  span {
    min-width: 56px;
    padding: 4px 12px;
    border-radius: 6px;
    background: rgba(11, 52, 98, 0.1);
    font-size: 14px;
    text-align: center;
  }
}

.transfer-record dl {
  margin: 0;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--auxiliary-1);

  div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;

    &+div {
      border-top: 1px solid var(--theme-divider);
    }
  }

  dt,
  dd {
    margin: 0;
  }

  dt {
    color: rgba(11, 52, 98, 0.5);
    font-size: 14px;
  }

  dd {
    color: var(--theme-text);
    font-size: 16px;
    font-weight: 500;
  }
}
.vip-transfer-records__more {
  align-self: center;
  padding: 8px 20px;
  border: 0;
  background: transparent;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
  cursor: pointer;
}
</style>
