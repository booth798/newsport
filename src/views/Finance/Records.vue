<script setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useUserStore } from '@/store/modules/user';
import { fetchLedgerSummary } from '@/api/finance';
import { fetchOrderList, cancelOrder } from '@/api/order';
import { useToast } from '@/hooks/useToast';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

const { t, locale } = useI18n();
const router = useRouter();
const toast = useToast();
const userStore = useUserStore();

const PAGE_SIZE = 20;

const orders = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const pageNum = ref(1);
const hasMore = ref(false);

const summary = ref({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
const expandedId = ref(null);
const cancelingId = ref(null);

function formatMoney(val) {
  if (val == null || val === '') return '0.00';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 汇总头金额：带正负号，过万用「万」缩写（对齐设计稿）
 * @param val 数值
 * @param {'auto'|'plus'|'minus'} signMode auto 按正负；plus/minus 强制符号（支出列固定用减号）
 */
function formatSummaryAmount(val, signMode = 'auto') {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0.00';
  const abs = Math.abs(n);
  let sign = '';
  if (signMode === 'plus') sign = '+ ';
  else if (signMode === 'minus') sign = '- ';
  else if (n > 0) sign = '+ ';
  else if (n < 0) sign = '- ';

  if (abs >= 10000) {
    // 中文：3.2万；英文：32k
    if (String(locale.value).startsWith('zh')) {
      const wan = abs / 10000;
      const text = wan % 1 === 0 ? String(wan) : wan.toFixed(1);
      return `${sign}${text}${t('万')}`;
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
  const amount = Number(o.amount || o.orderAmount || 0);
  // estimatedPayout / payout 为预计到账总额，盈利 = 总额 - 本金
  const totalReturn = state === 'completed' && o.payout != null
    ? Number(o.payout)
    : Number(o.estimatedPayout ?? o.payout ?? 0);
  const profit = Number.isFinite(totalReturn) ? totalReturn - amount : 0;

  const league = o.leagueName || o.marketName || '';
  const leagueShort = o.leagueShortName || league;
  const leagueLogo = o.leagueLogo || o.leagueLogoUrl || '';
  const homeTeam = o.homeTeamShortName || o.homeTeamName || '';
  const awayTeam = o.awayTeamShortName || o.awayTeamName || '';
  const homeLogo = o.homeTeamLogoUrl || o.homeTeamLogo || o.homeLogoUrl || '';
  const awayLogo = o.awayTeamLogoUrl || o.awayTeamLogo || o.awayLogoUrl || '';
  const kickoff = o.matchKickoffAt || o.kickoffAt || o.matchTime || '';
  const placedAt = o.placedAt || o.createdAt || '';
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
    statusText: o.statusLabel || status,
    amount,
    amountFormatted: formatMoney(amount),
    profit,
    profitFormatted: `¥${formatMoney(profit)}`,
    league: leagueShort,
    leagueLogo,
    homeTeam,
    awayTeam,
    homeLogo: resolveTeamLogoUrl(homeTeam, homeLogo),
    awayLogo: resolveTeamLogoUrl(awayTeam, awayLogo),
    kickoffFormatted: formatKickoff(kickoff),
    placedAtFormatted: formatFullDateTime(placedAt),
    matchScore,
    parsedScore,
    marketLabel,
    orderNo: orderNo ? (String(orderNo).startsWith('NO.') ? orderNo : `NO.${orderNo}`) : '',
    cancelable: state === 'processing',
    profitLabel: state === 'completed' ? '盈利' : '预估盈利',
    _raw: o,
  };
}

async function loadPage(page, append = false) {
  try {
    if (page === 1) loading.value = true;
    else loadingMore.value = true;
    error.value = false;

    const promises = [fetchOrderList({ pageNum: page, pageSize: PAGE_SIZE })];
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

    const page_ = orderRes.data || {};
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

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
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
  if (userStore.isLoggedIn) loadPage(1);
});

watch(() => userStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadPage(1);
  } else {
    orders.value = [];
    summary.value = { totalIncome: 0, totalExpense: 0, netProfit: 0 };
  }
});
</script>

<template>
  <div class="records-page">
    <!-- 汇总头：收入加号、支出减号、净收益按正负；过万缩写为「万」 -->
    <section class="fin-summary">
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
    <div v-else-if="!orders.length" class="fin-empty">
      <div class="fin-empty__icon" aria-hidden="true"><span /></div>
      <p>{{ t('暂无记录') }}</p>
      <button type="button" class="fin-empty__btn" @click="goToMarket">{{ t('前往比赛') }}</button>
    </div>

    <!-- 订单列表 -->
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
            v-if="order.statusText"
            class="ord__badge"
            :class="`ord__badge--${order.state}`"
          >{{ order.statusText }}</span>
        </div>

        <div class="ord__divider" />

        <!-- 联赛 -->
        <div class="ord__league">
          <img
            class="ord__league-logo"
            :src="order.leagueLogo || '/favicon.ico'"
            alt=""
            width="24"
            height="24"
            @error="(e) => e.target.src = '/favicon.ico'"
          />
          <span class="ord__league-name">{{ order.league }}</span>
        </div>

        <!-- 对阵区：无比分时显示 VS -->
        <div class="ord__arena">
          <div class="ord__arena-inner">
            <div class="ord__team">
              <img v-if="order.homeLogo" class="ord__team-logo" :src="order.homeLogo" alt="" width="44" height="44" @error="(e) => e.target.style.display='none'" />
              <div class="ord__team-name">
                {{ order.homeTeam }}
                <span class="ord__host-tag">{{ t('主') }}</span>
              </div>
            </div>
            <div class="ord__score-area">
              <template v-if="order.parsedScore">
                <span class="ord__score ord__score--home">{{ order.parsedScore.home }}</span>
                <span class="ord__vs">:</span>
                <span class="ord__score ord__score--away">{{ order.parsedScore.away }}</span>
              </template>
              <span v-else class="ord__vs">VS</span>
            </div>
            <div class="ord__team">
              <img v-if="order.awayLogo" class="ord__team-logo" :src="order.awayLogo" alt="" width="44" height="44" @error="(e) => e.target.style.display='none'" />
              <span class="ord__team-name">{{ order.awayTeam }}</span>
            </div>
          </div>
        </div>

        <!-- 金额摘要：盈利 = estimatedPayout/payout − amount -->
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
            <span class="ord__detail-val ord__detail-val--copy" @click.stop="copyOrderNo(order.orderNo)">
              {{ order.orderNo }}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M10 3V2.5A1.5 1.5 0 008.5 1h-6A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H3" stroke="currentColor" stroke-width="1.2"/></svg>
            </span>
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
            <span class="ord__detail-val">{{ order.amountFormatted }}</span>
          </div>

          <button
            v-if="order.cancelable"
            type="button"
            class="ord__cancel"
            :disabled="cancelingId === order.id"
            @click.stop="handleCancel(order)"
          >
            {{ cancelingId === order.id ? t('取消中...') : t('取消订单') }}
          </button>
        </div>

        <!-- 展开/收起：圆形箭头按钮 -->
        <div class="ord__toggle" @click="toggleExpand(order.id)">
          <span class="ord__chevron-btn" :aria-label="expandedId === order.id ? t('收起') : t('展开')">
            <span class="ord__chevron" :class="{ 'ord__chevron--up': expandedId === order.id }" />
          </span>
        </div>
      </article>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="fin-state" style="min-height: 60px">
        <button v-if="!loadingMore" type="button" class="fin-load-more" @click="loadMore">{{ t('加载更多') }}</button>
        <div v-else class="fin-spinner" />
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
}

.fin-summary__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 10px;
  background: #eaf1f9;
  min-width: 0;
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

.fin-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 8px;
  color: rgba(11, 52, 98, 0.5);

  p { margin: 0 0 12px; font-size: 14px; }
}

.fin-empty__icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(116, 174, 252, 0.24));
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    width: 44px;
    height: 54px;
    border-radius: 6px;
    background: linear-gradient(180deg, #c8def9, #8cbcff);
  }
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
  border: 1px solid #e4f0fe;
  border-radius: 18px;
  background: #fff;
  color: #1c7bff;
  font-size: 13px;
  cursor: pointer;
}

.fin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

// --- 订单卡片（设计稿：白底圆角卡） ---
.ord {
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  border: 0.8px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px rgba(21, 58, 118, 0.06);
  box-sizing: border-box;
}

.ord__top {
  display: flex;
  align-items: center;
  gap: 6px;
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
  margin: 10px 0;
  background: #eaf1f9;
}

.ord__league {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
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

// --- 对阵区 ---
.ord__arena {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ord__arena-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 80px;
  padding: 12px 10px;
  background: #fff;
  background-image: url('@/assets/images/events/bg_score.svg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  border-radius: 16px;
}

.ord__team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.ord__team-logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: contain;
}

.ord__team-name {
  font-size: 14px;
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
  gap: 4px;
}

.ord__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
  border-radius: 6px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;

  &--home { background: #1c7bff; }
  &--away { background: #ff5722; }
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
  padding: 8px 12px;
  border-radius: 12px;
  background: #eaf1f9;
}

.ord__money-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
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
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #eaf1f9;
}

.ord__detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  padding: 4px 0;
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
  text-align: right;
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
    gap: 4px;
    cursor: pointer;
    color: #1c7bff;
    justify-content: flex-end;
  }
}

.ord__cancel {
  display: block;
  width: 100%;
  max-width: 120px;
  height: 32px;
  margin: 12px 0 0 auto;
  border: 1px solid #fb5c0d;
  border-radius: 16px;
  background: transparent;
  color: #fb5c0d;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// --- 展开/收起 ---
.ord__toggle {
  display: flex;
  justify-content: center;
  padding-top: 10px;
  cursor: pointer;
}

.ord__chevron-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eaf1f9;
}

.ord__chevron {
  width: 8px;
  height: 8px;
  margin-top: -3px;
  border-right: 2px solid #94a8c4;
  border-bottom: 2px solid #94a8c4;
  transform: rotate(45deg);
  transition: transform 0.15s;

  &--up {
    margin-top: 3px;
    transform: rotate(-135deg);
  }
}
</style>
