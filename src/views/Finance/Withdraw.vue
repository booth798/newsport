<script setup>
/**
 * 银行卡提现页：与区块链提现页保持一致的表单、记录和筛选交互。
 * 银行卡展示字段来自 BindingVO 的 display1 / display2 / display3。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { getImageUrl } from '@/utils/common'
import BaseInput from '@/components/BaseInput.vue';
import EmptyState from '@/components/EmptyState.vue';
import MonthSelector from '@/components/MonthSelector.vue';
import ProfileBindingModal from '@/views/Profile/components/ProfileBindingModal.vue';
import WithdrawBankModal from './components/WithdrawBankModal.vue';
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

// 提现表单与银行卡绑定状态
const bankCards = ref([]);
const selectedBankId = ref('');
const bindingsLoading = ref(true);
const bindingsError = ref(false);
const amount = ref('');
const withdrawPassword = ref('');
const captchaToken = ref('');
const otpCode = ref('');
const submitting = ref(false);

// 页面弹窗
const bankModalOpen = ref(false);
const bindingModalOpen = ref(false);
const noticeModalOpen = ref(false);

// 提现记录
const recordsLoading = ref(true);
const recordsError = ref(false);
const loadingMore = ref(false);
const records = ref([]);
const pageNum = ref(1);
const reachedEnd = ref(false);
const filterOpen = ref(false);
const filterRef = ref(null);
const selectedFilter = ref('all');

const selectedBank = computed(
  () => bankCards.value.find((card) => card.id === selectedBankId.value) || null,
);
const hasMore = computed(() => !reachedEnd.value && records.value.length > 0);
const selectedFilterLabel = computed(
  () => FILTER_OPTIONS.find((option) => option.value === selectedFilter.value)?.label || '全部',
);
const visibleRecords = computed(() => {
  if (selectedFilter.value === 'all') return records.value;
  return records.value.filter((record) => record.statusTone === selectedFilter.value);
});
const completedTotal = computed(() =>
  records.value
    .filter((record) => record.statusTone === 'completed')
    .reduce((sum, record) => sum + (Number(record.rawAmount) || 0), 0),
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
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
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
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

function statusInfo(status) {
  const value = String(status || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'DONE', 'PAID', 'FINISHED', 'APPROVED'].includes(value)) {
    return { tone: 'completed', label: t('已提现') };
  }
  if (['CANCELLED', 'CANCELED', 'FAILED', 'REJECTED', 'EXPIRED'].includes(value)) {
    return { tone: 'cancelled', label: t('提现失败') };
  }
  return { tone: 'processing', label: t('审核中') };
}

function normalizeBankCard(binding) {
  return {
    id: String(binding.id ?? binding.bindingId ?? ''),
    bankName: binding.display1 || binding.bankName || '',
    cardNumber: binding.display2 || binding.cardNumber || binding.accountNo || '',
    holderName: binding.display3 || binding.holderName || binding.realName || '',
    branch: binding.branch || binding.branchName || '',
    enabled: binding.enabled !== false,
    isDefault: binding.isDefault === true,
  };
}

async function loadBankCards(preferredId = '') {
  bindingsLoading.value = true;
  bindingsError.value = false;
  try {
    const response = await fetchBindings();
    const list = Array.isArray(response?.data) ? response.data : (response?.data?.records || []);
    // 接口包含银行卡和区块链绑定，此页面只保留 bank_card。
    bankCards.value = list
      .filter((binding) => binding.type === 'bank_card')
      .map(normalizeBankCard);

    const currentId = String(preferredId || selectedBankId.value || '');
    const selected = bankCards.value.find((card) => card.id === currentId)
      || bankCards.value.find((card) => card.isDefault)
      || bankCards.value[0];
    selectedBankId.value = selected?.id || '';
  } catch {
    bindingsError.value = true;
    bankCards.value = [];
    selectedBankId.value = '';
  } finally {
    bindingsLoading.value = false;
  }
}

function normalizeRecord(record) {
  const info = statusInfo(record.status);
  return {
    id: record.id || record.orderNo,
    createdAt: formatDateTime(record.createdAt),
    rawAmount: Number(record.amount) || 0,
    amount: formatMoney(record.amount),
    currency: record.currency || 'CNY',
    account: record.payoutAccountMasked || '—',
    rejectReason: record.rejectReason || record.failedReason || '',
    statusLabel: info.label,
    statusTone: info.tone,
  };
}

function buildParams(page) {
  return { pageNum: page, pageSize: PAGE_SIZE, month: selectedMonth.value };
}

function applyResponse(response, append, requestedPage) {
  const list = Array.isArray(response?.data) ? response.data : (response?.data?.records || []);
  const nextRecords = list.map(normalizeRecord);
  records.value = append ? [...records.value, ...nextRecords] : nextRecords;
  pageNum.value = requestedPage;
  reachedEnd.value = list.length < PAGE_SIZE;
}

async function loadRecords() {
  recordsLoading.value = true;
  recordsError.value = false;
  reachedEnd.value = false;
  try {
    const response = await fetchWithdrawList(buildParams(1));
    applyResponse(response, false, 1);
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
    const response = await fetchWithdrawList(buildParams(nextPage));
    applyResponse(response, true, nextPage);
  } catch {
    toast.error(t('加载失败'));
  } finally {
    loadingMore.value = false;
  }
}

function openBankModal() {
  if (!bankCards.value.length) {
    bindingModalOpen.value = true;
    return;
  }
  bankModalOpen.value = true;
}

function openAddBankCard() {
  bankModalOpen.value = false;
  bindingModalOpen.value = true;
}

async function handleBankSaved(binding) {
  // 新增银行卡后刷新接口列表，并优先选中新绑定项。
  await loadBankCards(binding?.id);
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
  if (!selectedBank.value) {
    toast.error(t('请先绑定银行卡'));
    return;
  }

  const value = Number(amount.value);
  if (!String(amount.value).trim()) {
    toast.error(t('请输入金额'));
    return;
  }
  if (!Number.isFinite(value) || value <= 0) {
    toast.error(t('金额必须大于零'));
    return;
  }
  if (value < 100) {
    toast.error(t('提款金额最低为100'));
    return;
  }
  if (!withdrawPassword.value.trim()) {
    toast.error(t('请输入提款密码'));
    return;
  }

  try {
    submitting.value = true;
    // 按提现接口契约提交绑定类型与绑定 ID，验证码字段当前为空时仍保留参数。
    await submitWithdraw({
      bindingType: 'bank_card',
      bindingId: selectedBank.value.id,
      amount: value,
      withdrawPassword: withdrawPassword.value,
      captchaToken: captchaToken.value,
      otpCode: otpCode.value,
    });
    toast.success(t('操作成功'));
    amount.value = '';
    withdrawPassword.value = '';
    // 提交已成功时，后续刷新失败不应被误报为提现失败。
    await Promise.allSettled([loadRecords(), userStore.refreshUserBalance()]);
  } catch (error) {
    toast.error(error?.message || t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}

watch(selectedMonth, loadRecords);

onMounted(() => {
  loadBankCards();
  loadRecords();
  document.addEventListener('click', handleFilterOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleFilterOutsideClick);
});
</script>

<template>
  <div class="withdraw-page">
    <!-- 银行卡信息 -->
    <section class="bank-card" :aria-label="t('银行卡提现')">
      <img class="bank-card__bg" :src="getImageUrl(`profile/${isMobile ? 'h5' : 'pc'}_bank_bg.png`)" alt="">
      <div v-if="bindingsLoading" class="bank-card__state">{{ t('加载中') }}</div>
      <div v-else-if="bindingsError" class="bank-card__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" @click="loadBankCards()">{{ t('重试') }}</button>
      </div>
      <template v-else>
        <div class="bank-card__header">
          <span class="bank-card__badge">中</span>
          <span class="bank-card__name">
            {{ selectedBank?.bankName || t('请先绑定银行卡') }}
          </span>
          <button type="button" class="bank-card__switch" @click="openBankModal">
            {{ t('切换') }}
            <i aria-hidden="true" />
          </button>
        </div>
        <div class="bank-card__number">{{ selectedBank?.cardNumber || '—' }}</div>
      </template>
    </section>
    <main class="withdraw-panel">


      <!-- 银行卡资料与提现表单 -->
      <form class="withdraw-form" @submit.prevent="handleSubmit">
        <button type="button" class="withdraw-notice" @click="noticeModalOpen = true">
          <span class="withdraw-notice__icon" aria-hidden="true">i</span>
          <span>{{ t('注意事项') }}</span>
          <i class="withdraw-notice__arrow" aria-hidden="true" />
        </button>

        <div class="withdraw-field">
          <span>{{ t('银行户名') }}</span>
          <button type="button" class="withdraw-bank-account"
            :class="{ 'withdraw-bank-account--placeholder': !selectedBank }" :disabled="bindingsLoading"
            @click="bindingsError ? loadBankCards() : openBankModal()">
            <template v-if="bindingsLoading">{{ t('加载中') }}</template>
            <template v-else-if="bindingsError">{{ t('加载失败') }}</template>
            <template v-else>{{ selectedBank?.holderName || t('请先绑定银行卡') }}</template>
          </button>
        </div>

        <label class="withdraw-field">
          <span>{{ t('提款金额') }}</span>
          <BaseInput v-model="amount" inputmode="decimal" autocomplete="off" :placeholder="t('最低提款金额为100')" />
          <small>{{ t('余额') }}：<b>{{ displayBalance }} CNY</b></small>
        </label>

        <label class="withdraw-field">
          <span>{{ t('提款密码') }}</span>
          <BaseInput v-model="withdrawPassword" type="password" autocomplete="current-password"
            :placeholder="t('请输入密码')" />
        </label>

        <button class="withdraw-form__submit btn btn--primary" type="submit" :disabled="submitting">
          {{ submitting ? t('提交中...') : t('送出提款申请') }}
        </button>
      </form>

      <!-- 提现记录 -->
      <section class="withdraw-records" :aria-label="t('提现')">
        <div class="withdraw-records__toolbar">
          <MonthSelector v-model="selectedMonth" :aria-label="t('选择月份')" />
        </div>

        <div v-if="recordsLoading" class="withdraw-state">
          <div class="withdraw-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>
        <div v-else-if="recordsError" class="withdraw-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="withdraw-retry" @click="loadRecords">{{ t('重试') }}</button>
        </div>
        <template v-else>
          <div class="withdraw-summary">
            <div class="withdraw-summary__header">
              <span>{{ t('已完成总合计') }}</span>
              <div ref="filterRef" class="withdraw-filter">
                <button type="button" class="withdraw-filter__trigger" :aria-expanded="filterOpen"
                  @click.stop="filterOpen = !filterOpen">
                  {{ t(selectedFilterLabel) }}
                  <i aria-hidden="true" />
                </button>
                <div v-if="filterOpen" class="withdraw-filter__menu">
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

          <article v-for="record in visibleRecords" :key="record.id" class="withdraw-record">
            <div class="withdraw-record__header">
              <time>{{ record.createdAt }}</time>
              <span class="withdraw-record__badge" :class="`withdraw-record__badge--${record.statusTone}`">
                {{ record.statusLabel }}
              </span>
            </div>
            <dl class="withdraw-record__body">
              <div>
                <dt>{{ t('金额') }}</dt>
                <dd>{{ record.amount }} {{ record.currency }}</dd>
              </div>
              <div>
                <dt>{{ t('银行账号') }}</dt>
                <dd>{{ record.account }}</dd>
              </div>
              <div v-if="record.statusTone === 'cancelled' && record.rejectReason">
                <dt>{{ t('备注') }}</dt>
                <dd class="withdraw-record__reason">{{ record.rejectReason }}</dd>
              </div>
            </dl>
          </article>

          <button v-if="hasMore" type="button" class="withdraw-more" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? t('加载中') : t('加载更多') }}
          </button>
        </template>
      </section>
    </main>

    <WithdrawBankModal v-model="bankModalOpen" :bank-cards="bankCards" :selected-id="selectedBankId"
      @confirm="selectedBankId = String($event)" @add="openAddBankCard" />
    <ProfileBindingModal v-model="bindingModalOpen" initial-tab="bank" @saved="handleBankSaved" />
    <WithdrawNoticeModal v-model="noticeModalOpen" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.withdraw-page {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  color: var(--theme-text);
}

.withdraw-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @include web-only {
    padding: $spacing-2xl;
    border: 1px solid var(--auxiliary-1);
    border-radius: 32px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
  }

  @include mobile-only {
    gap: 12px;
  }
}

.bank-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  color: var(--auxiliary-1);
  box-shadow: 0 3px 10px rgba(13, 37, 78, 0.2);
  .bank-card__bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  @include web-only {
    margin-bottom: 20px;

  }

  @include mobile-only {
    margin-bottom: 8px;
  }
}

.bank-card {
  @include web-only {
    height: 200px;
    padding: $spacing-2xl $spacing-2xl 28px;
  }

  @include mobile-only {
    height: 166px;
    padding: 28px 22px 24px;
  }
}

.bank-card__header,
.bank-card__number {
  position: relative;
  z-index: 1;
}

.bank-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bank-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 3px solid var(--auxiliary-1);
  border-radius: 50%;
  background: #d8232a;
  color: var(--auxiliary-1);
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.bank-card__name {
  font-size: 22px;
  font-weight: 500;
}

.bank-card__switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  margin-left: auto;
  padding: 0 12px;
  border: 0;
  border-radius: $radius-pill;
  background: rgba(28, 123, 255, 0.9);
  color: var(--auxiliary-1);
  font-size: $font-size-sm;
  cursor: pointer;

  i {
    width: 5px;
    height: 5px;
    border-top: 1.5px solid currentColor;
    border-right: 1.5px solid currentColor;
    transform: rotate(45deg);
  }
}

.bank-card__state {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  color: rgba(255, 255, 255, 0.8);

  button {
    border: 0;
    background: transparent;
    color: var(--auxiliary-1);
    text-decoration: underline;
    cursor: pointer;
  }
}

.bank-card__number {
  font-family: $font-family-num, $font-family-base;
  font-weight: 700;
  letter-spacing: 1px;

  @include web-only {
    margin-top: 84px;
    font-size: 24px;
  }

  @include mobile-only {
    margin-top: 66px;
    font-size: $font-size-lg;
  }
}

.withdraw-form {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 100%;
  background: var(--auxiliary-1);

  @include web-only {
    border-radius: $radius-xl;
  }

  @include mobile-only {
    gap: 14px;
    padding: $spacing-lg;
    border-radius: $radius-lg;
  }
}

.withdraw-form__submit {
  width: 100%;
  height: 44px;
  font-size: $font-size-lg;

  @include web-only {
    width: 300px;
    height: 48px;
    font-size: $font-size-lg;
    margin: 0 auto;
  }
}

/* ---------- 注意事项与银行卡资料 ---------- */
.withdraw-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: rgba(251, 92, 13, 0.1);
  color: #fb5c0d;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.withdraw-notice__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: $font-family-num, $font-family-base;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.withdraw-notice__arrow {
  width: 7px;
  height: 7px;
  margin-left: auto;
  border-top: 1.5px solid currentColor;
  border-right: 1.5px solid currentColor;
  transform: rotate(45deg);
}

.withdraw-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;

  small {
    font-size: 12px;
  }

  b {
    color: var(--theme-primary);
    font-weight: 500;
  }
}

.withdraw-bank-account {
  box-sizing: border-box;
  width: 100%;
  min-height: 52px;
  padding: 0 20px;
  overflow: hidden;
  border: 1px solid var(--theme-divider);
  border-radius: 16px;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-size: 16px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  @include mobile-only {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    font-size: 14px;
  }
}

.withdraw-bank-account--placeholder {
  color: rgba(11, 52, 98, 0.5);
}

.withdraw-bank-account:disabled {
  cursor: wait;
}

/* ---------- 提现记录 ---------- */
.withdraw-records {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
}

.withdraw-records__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @include mobile-only {
    display: none;
  }
}

.withdraw-summary {
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

  >strong {
    box-sizing: border-box;
    height: 38px;
    padding: 7px 10px;
    border-radius: 6px;
    background: rgba(28, 123, 255, 0.1);
    color: var(--theme-primary);
    font-family: $font-family-num, $font-family-base;
    font-size: 20px;
    font-weight: 500;
  }
}

.withdraw-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.withdraw-filter {
  position: relative;
}

.withdraw-filter__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: $radius-pill;
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

.withdraw-filter__menu {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 5;
  display: flex;
  width: 120px;
  overflow: hidden;
  flex-direction: column;
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

.withdraw-state {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #7b92ad;
  font-size: 14px;
}

.withdraw-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: withdraw-spin 0.8s linear infinite;
}

@keyframes withdraw-spin {
  to {
    transform: rotate(360deg);
  }
}

.withdraw-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid var(--theme-primary);
  border-radius: $radius-pill;
  background: transparent;
  color: var(--theme-primary);
  font-size: 14px;
  cursor: pointer;
}

.withdraw-record {
  box-sizing: border-box;
  padding: 16px;
  border-radius: 16px;
  background: rgba(28, 123, 255, 0.1);

  @include mobile-only {
    background: var(--auxiliary-1);
    box-shadow: 0 2px 12px rgba(21, 58, 118, 0.06);
  }
}

.withdraw-record__header {
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

.withdraw-record__badge {
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
    color: var(--theme-primary);
  }

  &--cancelled {
    background: rgba(255, 45, 45, 0.12);
    color: #ff2d2d;
  }
}

.withdraw-record__body {
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

.withdraw-record__reason {
  color: #ff2d2d !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  line-height: 1.4;
}

.withdraw-more {
  align-self: center;
  padding: 8px 20px;
  border: 0;
  background: transparent;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
  cursor: pointer;
}
</style>
