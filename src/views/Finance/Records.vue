<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import AppSideNav from '@/components/AppSideNav.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { fetchLedgerSummary } from '@/api/finance';
import { fetchOrderList, cancelOrder } from '@/api/order';
import { useToast } from '@/hooks/useToast';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

import leagueUclUrl from '@/assets/images/common/league_ucl.svg?url';
import orderCopyIconUrl from '@/assets/images/finance/icon_order_copy.svg?url';
import orderToggleIconUrl from '@/assets/images/finance/icon_order_toggle.svg?url';

const { t, locale } = useI18n();
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();
const { isMobile } = storeToRefs(useAppStore());

const PAGE_SIZE = 20;
/** 对齐安卓 FinanceOverviewAdapter：下单后 5 分钟内才显示取消按钮 */
const CANCEL_WINDOW_MS = 5 * 60 * 1000;

/** PC 侧栏 → OrderListReq.status 枚举（文档：PENDING_MATCH/PLACED/WON/LOST/REFUNDED/CANCELLED） */
const STATUS_FILTER_MAP = {
  all: undefined,
  // 成功：已结算
  completed: ['WON', 'LOST', 'REFUNDED'],
  // 处理中：预约中 / 已成交待结算
  processing: ['PENDING_MATCH', 'PLACED'],
  // 已取消
  cancelled: ['CANCELLED'],
};

const orders = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const pageNum = ref(1);
const hasMore = ref(false);

const summary = ref({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
const expandedId = ref(null);
const cancelingId = ref(null);
/** PC 侧栏：全部 / 成功 / 处理中 / 已取消（H5 不展示侧栏，始终按「全部」拉取） */
const statusFilter = ref('all');

const statusNavItems = computed(() => [
  { key: 'all', label: t('全部') },
  { key: 'completed', label: t('成功') },
  { key: 'processing', label: t('处理中') },
  { key: 'cancelled', label: t('已取消') },
]);

/** PC 无订单也展示汇总三卡；H5 仍仅在有列表时展示 */
const showSummary = computed(() => {
  if (loading.value || error.value) return false;
  if (!isMobile.value) return true;
  return orders.value.length > 0;
});

function formatMoney(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return Math.abs(n).toFixed(2);
}

/**
 * 汇总头金额：带正负号，过万用「万」缩写（对齐设计稿）
 * @param val 数值
 * @param {'auto'|'plus'|'minus'} signMode auto 按正负；plus/minus 强制符号（支出列固定用减号；为 0 时不带符号）
 */
function formatSummaryAmount(val, signMode = 'auto') {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0.00';
  const abs = Math.abs(n);
  let sign = '';
  // 支出/收入为 0 时不显示正负号，避免出现「- 0.00」
  if (abs !== 0) {
    if (signMode === 'plus') sign = '+ ';
    else if (signMode === 'minus') sign = '- ';
    else if (n > 0) sign = '+ ';
    else if (n < 0) sign = '- ';
  }

  if (abs >= 10000) {
    // 中文：3.2万；英文：32k
    if (String(locale.value).startsWith('zh')) {
      const wan = abs / 10000;
      return `${sign}${wan.toFixed(1)}${t('万')}`;
    }
    const k = abs / 1000;
    const kText = k % 1 === 0 ? String(k) : k.toFixed(1);
    return `${sign}${kText}k`;
  }
  return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatKickoff(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch { return ''; }
}

function formatFullDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  } catch { return ''; }
}

function mapOrderState(status) {
  if (!status) return 'unknown';
  const s = status.toUpperCase();
  if (['PENDING_MATCH', 'PLACED', 'PENDING', 'CREATED'].includes(s)) return 'processing';
  if (['WON', 'LOST', 'REFUNDED', 'SETTLED', 'SETTLED_WON', 'SETTLED_LOST'].includes(s)) return 'completed';
  if (['CANCELLED', 'CANCELED', 'FAILED', 'REJECTED', 'EXPIRED'].includes(s)) return 'cancelled';
  return 'unknown';
}

function statusLabelKey(state) {
  if (state === 'processing') return '处理中';
  if (state === 'completed') return '成功';
  if (state === 'cancelled') return '已取消';
  return '';
}

function resolveProfit(order, amount) {
  const explicitProfit = order.profit
    ?? order.netProfit
    ?? order.estimatedProfit
    ?? order.realizedProfit;
  if (explicitProfit != null && Number.isFinite(Number(explicitProfit))) {
    return Number(explicitProfit);
  }

  const payout = order.estimatedPayout ?? order.payout;
  if (payout == null || !Number.isFinite(Number(payout))) return 0;

  const payoutAmount = Number(payout);
  // 后端历史字段同时存在“盈利额”和“含本金到账额”两种语义。
  return amount > 0 && payoutAmount >= amount ? payoutAmount - amount : payoutAmount;
}

function resolveLeagueLogo(league, overrideUrl) {
  if (overrideUrl) return overrideUrl;
  return String(league).includes('欧冠') ? leagueUclUrl : '';
}

function parseMatchScore(scoreStr) {
  if (!scoreStr) return null;
  const parts = scoreStr.split(/[:\-]/);
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return { home: parts[0].trim(), away: parts[1].trim() };
  }
  return null;
}

/** 选项比分 0:0 / 0-0 → 0 - 0 */
function formatOptionScore(score) {
  if (!score) return '';
  return String(score).replace(/[:\-]/, ' - ').replace(/\s+/g, ' ').trim();
}

function periodLabel(period) {
  const p = String(period || '').toUpperCase();
  if (p === 'HT' || p === 'HALF' || p === 'HALFTIME') return t('半场');
  if (p === 'FT' || p === 'FULL' || p === 'FULLTIME') return t('全场');
  return period || '';
}

function normalizeOrder(o) {
  const status = o.status || o.orderStatus || '';
  const state = mapOrderState(status);
  const amount = Number(o.transactionAmount ?? o.tradeAmount ?? o.totalAmount ?? o.amount ?? o.orderAmount ?? 0);
  const detailAmount = Number(o.orderAmount ?? o.buyAmount ?? o.stakeAmount ?? o.principalAmount ?? o.amount ?? 0);
  const profit = resolveProfit(o, amount);

  const league = o.leagueName || o.marketName || '';
  const leagueShort = o.leagueShortName || league;
  const leagueLogo = o.leagueLogo || o.leagueLogoUrl || '';
  const homeTeam = o.homeTeamShortName || o.homeTeamName || '';
  const awayTeam = o.awayTeamShortName || o.awayTeamName || '';
  const homeLogo = o.homeTeamLogoUrl || o.homeTeamLogo || o.homeLogoUrl || '';
  const awayLogo = o.awayTeamLogoUrl || o.awayTeamLogo || o.awayLogoUrl || '';
  const kickoff = o.matchKickoffAt || o.kickoffAt || o.matchTime || '';
  // 交易时间字段对齐安卓 FinanceFragment：placedAt / createdAt / createTime
  const placedAt = o.placedAt || o.createdAt || o.createTime || '';
  const placedAtMillis = (() => {
    if (!placedAt) return null;
    const ms = Date.parse(placedAt);
    return Number.isFinite(ms) ? ms : null;
  })();
  const score = o.score || '';
  const yieldAtBuy = o.yieldAtBuy || o.yieldPct || o.yield || '';
  const matchScore = o.matchScore || '';
  const orderNo = o.orderNo || o.orderId || o.id || '';
  const parsedScore = parseMatchScore(matchScore);
  const periodText = periodLabel(o.period);

  let marketLabel = '';
  if (score && yieldAtBuy !== '' && yieldAtBuy != null) {
    const yieldFormatted = Number(String(yieldAtBuy).replace(/%$/, '')).toFixed(2);
    marketLabel = `${t('比分')} ${formatOptionScore(score)} @${yieldFormatted}%`;
    if (periodText) marketLabel += ` ${periodText}`;
  } else if (periodText) {
    marketLabel = periodText;
  }

  return {
    id: o.id,
    status,
    state,
    statusText: o.statusLabel || '',
    statusKey: statusLabelKey(state),
    amount,
    amountFormatted: formatMoney(amount),
    detailAmountFormatted: formatMoney(detailAmount),
    profit,
    profitFormatted: `¥${formatMoney(profit)}`,
    league: leagueShort,
    leagueLogo: resolveLeagueLogo(league, leagueLogo),
    homeTeam,
    awayTeam,
    homeLogo: resolveTeamLogoUrl(homeTeam, homeLogo),
    awayLogo: resolveTeamLogoUrl(awayTeam, awayLogo),
    kickoffFormatted: formatKickoff(kickoff),
    placedAtFormatted: formatFullDateTime(placedAt),
    placedAtMillis,
    matchScore,
    parsedScore,
    marketLabel,
    orderNo: orderNo ? (String(orderNo).startsWith('NO.') ? orderNo : `NO.${orderNo}`) : '',
    cancelable: state === 'processing',
    profitLabel: state === 'completed' ? '盈利' : '预估盈利',
    _raw: o,
  };
}

/** 对齐安卓 isWithinCancelWindow：展开 + 处理中 + 下单 5 分钟内才显示取消 */
function canShowCancel(order) {
  if (!order?.cancelable || expandedId.value !== order.id) return false;
  if (order.placedAtMillis == null) return false;
  return Math.abs(Date.now() - order.placedAtMillis) <= CANCEL_WINDOW_MS;
}

async function loadPage(page, append = false) {
  try {
    if (page === 1) loading.value = true;
    else loadingMore.value = true;
    error.value = false;

    // 对齐文档：?status=WON&status=LOST（数组一次传入，request 层展开为重复 query）
    const status = STATUS_FILTER_MAP[statusFilter.value];
    const promises = [fetchOrderList({ pageNum: page, pageSize: PAGE_SIZE, status })];
    if (page === 1) promises.push(fetchLedgerSummary().catch(() => null));

    const [orderRes, summaryRes] = await Promise.all(promises);

    if (summaryRes?.data) {
      const d = summaryRes.data;
      summary.value = {
        totalIncome: d.totalIncome ?? d.income ?? d.totalIn ?? d.depositTotal ?? 0,
        totalExpense: d.totalExpense ?? d.expense ?? d.totalOut ?? d.withdrawTotal ?? 0,
        netProfit: d.netProfit ?? d.netIncome ?? d.profit ?? d.profitLoss ?? 0,
      };
    }

    const page_ = orderRes?.data || {};
    const records = (page_.records || []).map(normalizeOrder);
    const total = page_.total;
    const pages = page_.pages;
    const current = page_.current || page;
    const size = page_.size || PAGE_SIZE;

    if (append) {
      orders.value = [...orders.value, ...records];
    } else {
      orders.value = records;
    }

    pageNum.value = page;
    hasMore.value = pages != null
      ? current < pages
      : total != null
        ? current * size < total
        : records.length >= PAGE_SIZE;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadPage(pageNum.value + 1, true);
}

/** PC 侧栏切换状态筛选并重新拉列表 */
function onStatusSelect(key) {
  if (statusFilter.value === key) return;
  statusFilter.value = key;
  expandedId.value = null;
  loadPage(1);
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function isWinningSide(order, side) {
  if (!order.parsedScore) return false;
  const home = Number(order.parsedScore.home);
  const away = Number(order.parsedScore.away);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return false;
  return side === 'home' ? home > away : away > home;
}

async function handleCancel(order) {
  if (cancelingId.value) return;
  cancelingId.value = order.id;
  try {
    await cancelOrder(order.id);
    toast.success(t('订单已取消'));
    loadPage(1);
  } catch (e) {
    toast.error(e.message || t('取消失败'));
  } finally {
    cancelingId.value = null;
  }
}

function copyOrderNo(orderNo) {
  navigator.clipboard?.writeText(orderNo).then(() => {
    toast.success(t('已复制'));
  }).catch(() => {});
}

function goToMarket() {
  router.push('/market');
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadPage(1);
  } else {
    loading.value = false;
  }
});

watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadPage(1);
  } else {
    orders.value = [];
    summary.value = { totalIncome: 0, totalExpense: 0, netProfit: 0 };
    loading.value = false;
  }
});
</script>

<template>
  <div class="records-page">
    <!-- PC：状态筛选侧栏（AppSideNav 在 mobile 下自隐藏，H5 布局不变） -->
    <AppSideNav
      :items="statusNavItems"
      :active-key="statusFilter"
      aria-label="order-status"
      @select="onStatusSelect"
    />

    <div class="records-page__main">
      <!-- 汇总头：收入加号、支出减号、净收益按正负；过万缩写为「万」；PC 无数据也展示 -->
      <section v-if="showSummary" class="fin-summary">
        <div class="fin-summary__item">
          <span class="fin-summary__label">{{ t('总收入') }}</span>
          <span class="fin-summary__value fin-summary__value--income">{{ formatSummaryAmount(summary.totalIncome, 'plus') }}</span>
        </div>
        <div class="fin-summary__item">
          <span class="fin-summary__label">{{ t('总支出') }}</span>
          <span class="fin-summary__value fin-summary__value--expense">{{ formatSummaryAmount(summary.totalExpense, 'minus') }}</span>
        </div>
        <div class="fin-summary__item">
          <span class="fin-summary__label">{{ t('净收益') }}</span>
          <span class="fin-summary__value fin-summary__value--profit">{{ formatSummaryAmount(summary.netProfit) }}</span>
        </div>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="fin-state">
        <div class="fin-spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="fin-state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="fin-retry" @click="loadPage(1)">{{ t('重试') }}</button>
      </div>

      <!-- Empty -->
      <EmptyState v-else-if="!orders.length" class="records-page__empty" :text="t('暂无记录')">
        <button type="button" class="fin-empty__btn" @click="goToMarket">{{ t('前往比赛') }}</button>
      </EmptyState>

      <!-- 订单列表：PC 两列网格，H5 单列 -->
      <div v-else class="fin-list">
        <article
          v-for="order in orders"
          :key="order.id"
          class="ord"
          :class="{ 'ord--expanded': expandedId === order.id }"
        >
          <!-- 顶栏：平台 + 开赛时间 + 状态 -->
          <div class="ord__top">
            <span class="ord__platform">{{ t('UNI BET平台') }}</span>
            <span v-if="order.kickoffFormatted" class="ord__kickoff">{{ order.kickoffFormatted }}</span>
            <span
              v-if="order.statusKey || order.statusText"
              class="ord__badge"
              :class="`ord__badge--${order.state}`"
            >{{ order.statusKey ? t(order.statusKey) : order.statusText }}</span>
          </div>

          <div class="ord__divider" />

          <!-- 联赛 -->
          <div class="ord__league">
            <img
              v-if="order.leagueLogo"
              class="ord__league-logo"
              :src="order.leagueLogo"
              alt=""
              width="24"
              height="24"
              @error="(e) => e.target.style.display = 'none'"
            />
            <span class="ord__league-name">{{ order.league }}</span>
          </div>

          <div class="ord__panel">
            <!-- 对阵区：无比分时显示 VS -->
            <div class="ord__arena" :class="{ 'ord__arena--scored': order.parsedScore }">
              <div class="ord__arena-inner">
                <div class="ord__team">
                  <img v-if="order.homeLogo" class="ord__team-logo" :src="order.homeLogo" alt="" width="44" height="44" @error="(e) => e.target.style.display='none'" />
                  <div class="ord__team-name">
                    {{ order.homeTeam }}
                    <span class="ord__host-tag">{{ t('主') }}</span>
                  </div>
                  <span
                    v-if="order.parsedScore"
                    class="ord__score"
                    :class="isWinningSide(order, 'home') ? 'ord__score--high' : 'ord__score--default'"
                  >{{ order.parsedScore.home }}</span>
                </div>
                <div class="ord__score-area">
                  <span class="ord__vs">VS</span>
                </div>
                <div class="ord__team">
                  <img v-if="order.awayLogo" class="ord__team-logo" :src="order.awayLogo" alt="" width="44" height="44" @error="(e) => e.target.style.display='none'" />
                  <span class="ord__team-name">{{ order.awayTeam }}</span>
                  <span
                    v-if="order.parsedScore"
                    class="ord__score"
                    :class="isWinningSide(order, 'away') ? 'ord__score--high' : 'ord__score--default'"
                  >{{ order.parsedScore.away }}</span>
                </div>
              </div>

            </div>

            <div class="ord__money">
              <div class="ord__money-row">
                <span class="ord__money-label">{{ t('交易金额') }}</span>
                <span class="ord__money-val">{{ order.amountFormatted }}</span>
              </div>
              <div class="ord__money-row">
                <span class="ord__money-label">{{ t(order.profitLabel) }}</span>
                <span class="ord__money-val ord__money-val--profit">{{ order.profitFormatted }}</span>
              </div>
            </div>

            <!-- 展开详情 -->
            <div v-if="expandedId === order.id" class="ord__detail">
              <div class="ord__detail-row">
                <span class="ord__detail-label">{{ t('订单号码') }}</span>
                <button type="button" class="ord__detail-val ord__detail-val--copy" @click.stop="copyOrderNo(order.orderNo)">
                  <span>{{ order.orderNo }}</span>
                  <img class="ord__copy-icon" :src="orderCopyIconUrl" width="24" height="20" alt="" aria-hidden="true" />
                </button>
              </div>
              <div class="ord__detail-row">
                <span class="ord__detail-label">{{ t('交易时间') }}</span>
                <span class="ord__detail-val">{{ order.placedAtFormatted }}</span>
              </div>
              <div v-if="order.marketLabel" class="ord__detail-row">
                <span class="ord__detail-label">{{ t('市场') }}</span>
                <span class="ord__detail-val">{{ order.marketLabel }}</span>
              </div>
              <div class="ord__detail-row">
                <span class="ord__detail-label">{{ t('金额') }}</span>
                <span class="ord__detail-val">{{ order.detailAmountFormatted }}</span>
              </div>

            </div>

            <div
              class="ord__actions"
              :class="{ 'ord__actions--cancelable': canShowCancel(order) }"
            >
              <button
                v-if="canShowCancel(order)"
                type="button"
                class="ord__cancel"
                :disabled="cancelingId === order.id"
                @click.stop="handleCancel(order)"
              >
                {{ cancelingId === order.id ? t('取消中...') : t('取消订单') }}
              </button>

              <button
                type="button"
                class="ord__toggle"
                :aria-label="expandedId === order.id ? t('收起') : t('展开')"
                :aria-expanded="expandedId === order.id"
                @click="toggleExpand(order.id)"
              >
                <img
                  class="ord__toggle-icon"
                  :class="{ 'ord__toggle-icon--up': expandedId === order.id }"
                  :src="orderToggleIconUrl"
                  width="20"
                  height="20"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </article>

        <!-- 加载更多：PC 网格中占满整行 -->
        <div v-if="hasMore" class="fin-list__more fin-state" style="min-height: 60px">
          <button v-if="!loadingMore" type="button" class="fin-load-more" @click="loadMore">{{ t('加载更多') }}</button>
          <div v-else class="fin-spinner" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.records-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 100%;

  // PC：左侧状态筛选 + 右侧汇总/两列订单（对齐设计稿 157:6418）
  @include web-only {
    flex-direction: row;
    align-items: flex-start;
    gap: $spacing-xl;
  }
}

.records-page__main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;

  @include web-only {
    flex: 1 1 auto;
    gap: 12px;
  }
}

.records-page__empty {
  min-height: calc(100dvh - 64px - #{$mobile-tab-bar-offset} - 32px);

  @include mobile-only {
    :deep(.empty-state__icon) {
      transform: translateY(24px) scale(1.8);
    }

    :deep(.empty-state__text),
    :deep(.empty-state__action) {
      transform: translateY(24px);
    }
  }
}

// --- 汇总头（设计稿：白底容器 + 三块浅蓝卡） ---
.fin-summary {
  display: flex;
  gap: 6px;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  border: 0.8px solid #fff;
  box-shadow: 0 4px 16px rgba(21, 58, 118, 0.08);
  box-sizing: border-box;

  @include web-only {
    gap: 10px;
    padding: 14px 16px;
    border-radius: 20px;
  }

  @include mobile-only {
    min-height: 90px;
    background:
      linear-gradient(180deg, rgba(28, 123, 255, 0.2) 0%, rgba(28, 123, 255, 0) 100%),
      #fff;
  }
}

.fin-summary__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 10px;
  background: #dbe9fb;
  min-width: 0;

  @include web-only {
    padding: 12px 8px;
    border-radius: 12px;
    gap: 6px;
  }
}

.fin-summary__label {
  font-size: 13px;
  color: #7b92ad;
  line-height: 1.2;
}

.fin-summary__value {
  font-family: $font-family-num, $font-family-base;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;

  &--income { color: #1c7bff; }
  &--expense { color: #ff2d2d; }
  &--profit { color: #1c7bff; }
}

// --- 状态 ---
.fin-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 12px;
  color: #7b92ad;
  font-size: 14px;
}

.fin-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: fin-spin 0.8s linear infinite;
}

@keyframes fin-spin {
  to { transform: rotate(360deg); }
}

.fin-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid #1c7bff;
  border-radius: 16px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  cursor: pointer;
}

.fin-empty__btn {
  width: 166px;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #1c7bff;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
}

.fin-load-more {
  height: 36px;
  padding: 0 24px;
  border: 0;
  background: transparent;
  color: #7b92ad;
  font-size: 13px;
  cursor: pointer;
}

.fin-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  // PC：订单卡两列网格
  @include web-only {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
  }
}

.fin-list__more {
  @include web-only {
    grid-column: 1 / -1;
  }
}

// --- 订单卡片（设计稿：白底圆角卡） ---
.ord {
  padding: 14px 16px 16px;
  border-radius: 16px;
  background: #eaf1f9;
  border: 0.8px solid #fff;
  box-sizing: border-box;
}

.ord__top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.ord__platform {
  font-size: 15px;
  font-weight: 700;
  color: #0b3462;
  flex-shrink: 0;
}

.ord__kickoff {
  flex: 1;
  font-size: 13px;
  color: #0b3462;
  min-width: 0;
}

.ord__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;

  &--processing {
    background: rgba(28, 123, 255, 0.15);
    color: #1c7bff;
  }

  &--completed {
    background: rgba(11, 52, 98, 0.1);
    color: #5d7899;
  }

  &--cancelled {
    background: rgba(255, 45, 45, 0.12);
    color: #ff2d2d;
  }

  &--unknown {
    background: rgba(11, 52, 98, 0.1);
    color: #0b3462;
  }
}

.ord__divider {
  height: 1px;
  margin: 6px 0 8px;
  background: rgba(255, 255, 255, 0.9);
}

.ord__league {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 24px;
}

.ord__league-logo {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.ord__league-name {
  font-size: 16px;
  font-weight: 700;
  color: #0b3462;
}

.ord__panel {
  overflow: hidden;
  border-radius: 18px;
  background-color: #fff;
  background-image: url('@/assets/images/finance/bg_order_arena.svg');
  background-position: top center;
  background-repeat: no-repeat;
  background-size: 100% auto;
}

// --- 对阵区 ---
.ord__arena {
  position: relative;
  border-radius: 18px 18px 0 0;
  overflow: hidden;
  background: transparent;
}

.ord__arena-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  min-height: 100px;
  padding: 12px 27px 10px;
  background: transparent;
  border-radius: 18px 18px 0 0;
  box-sizing: border-box;
}

.ord__arena--scored .ord__arena-inner {
  min-height: 126px;
}

.ord__team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.ord__team-logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: contain;
  box-sizing: border-box;
  padding: 4px;
  background: #fff;
}

.ord__team-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #0b3462;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.ord__host-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 2px;
  border-radius: 3px;
  background: #1c7bff;
  font-size: 10px;
  color: #fff;
  margin-left: 4px;
  vertical-align: middle;
  flex-shrink: 0;
}

.ord__score-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 22px;
}

.ord__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 29px;
  padding: 0 5px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  font-family: $font-family-num, $font-family-base;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;

  &--default {
    background-image: url('@/assets/images/events/bg_score_default.svg');
    color: #0b3462;
  }

  &--high {
    background-image: url('@/assets/images/events/bg_score_high.svg');
    color: #fff;
  }
}

.ord__vs {
  font-size: 24px;
  font-weight: 700;
  color: #1c7bff;
}

// --- 金额摘要 ---
.ord__money {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0 12px;
  padding: 0 12px;
  border-radius: 12px;
  background: #eaf1f9;
}

.ord__money-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.9);
  }
}

.ord__money-label {
  font-size: 12px;
  color: rgba(11, 52, 98, 0.5);
}

.ord__money-val {
  font-family: $font-family-num, $font-family-base;
  font-size: 14px;
  font-weight: 600;
  color: #0b3462;

  &--profit { color: #1c7bff; }
}

// --- 展开详情 ---
.ord__detail {
  margin: 8px 12px 0;
  padding: 0 12px;
}

.ord__detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  padding: 0;
  font-size: 12px;

  &:not(:last-of-type) {
    border-bottom: 1px solid rgba(11, 52, 98, 0.06);
  }
}

.ord__detail-label {
  width: 56px;
  flex-shrink: 0;
  color: rgba(11, 52, 98, 0.5);
}

.ord__detail-val {
  flex: 1;
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: #0b3462;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;

  &--copy {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    justify-content: space-between;
    padding: 0;
    border: 0;
    background: transparent;
  }
}

.ord__copy-icon {
  display: block;
  width: 24px;
  height: 20px;
  flex: 0 0 24px;
}

.ord__cancel {
  display: block;
  width: 100%;
  max-width: 88px;
  height: 32px;
  margin: 0;
  border: 1px solid #ff2d2d;
  border-radius: 32px;
  background: transparent;
  color: #ff2d2d;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// --- 展开/收起 ---
.ord__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 32px;
  margin: 8px 10px 10px 12px;

  &--cancelable {
    justify-content: space-between;
  }
}

.ord__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.ord__toggle-icon {
  display: block;
  width: 20px;
  height: 20px;
  transition: transform 0.15s ease;

  &--up {
    transform: rotate(180deg);
  }
}

@include web-only {
  .fin-summary__item {
    background: #eaf1f9;
  }

  .fin-load-more {
    border: 1px solid #e4f0fe;
    border-radius: 18px;
    background: #fff;
    color: #1c7bff;
  }

  .fin-list {
    display: block;
    column-count: 2;
    column-gap: 20px;
  }

  .ord {
    display: inline-block;
    width: 100%;
    margin-bottom: 20px;
    break-inside: avoid;
    vertical-align: top;
  }

  .fin-list > .fin-state {
    column-span: all;
  }
}
</style>
