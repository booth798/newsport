<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useToast } from '@/hooks/useToast';
import { submitBuyOrder, fetchPendingQuota } from '@/api/order';
import { fetchBalance } from '@/api/finance';
import { fetchPoolYields } from '@/api/match';

import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import iconTradeSuccessUrl from '@/assets/images/common/icon_trade_success.svg?url';
import iconBuySettingsUrl from '@/assets/images/common/icon_buy_settings.svg?url';
import iconInvestingUrl from '@/assets/images/common/icon_investing.svg?url';
import iconBuySettingsGrayUrl from '@/assets/images/common/icon_buy_settings_gray.svg?url';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  match: {
    type: Object,
    required: true,
  },
  row: {
    type: Object,
    default: null,
  },
  marketTab: {
    type: String,
    default: 'fulltime',
  },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const toast = useToast();
const { isMobile } = storeToRefs(appStore);
const { loggedInUserId, loggedInAssetsFormatted } = storeToRefs(userStore);

// 买入弹层打开时锁定背后滚动，并用滚动条补偿避免页面其它元素横向跳动。
useBodyScrollLock(() => props.visible);

const buyType = ref('standard');
const buyAmount = ref('');
const profitMin = ref('5.34');
const profitMax = ref('7.34');
const phase = ref('form');

const walletBalance = ref(null);
const walletLoading = ref(false);
const pendingQuota = ref(null);
/** 下单前拉取的最新收益率（对齐安卓 currentYield / MarketYieldStore.latest） */
const refreshedYield = ref(null);

const QUICK_AMOUNTS_KEY = 'mysport:buy_quick_amounts';
const DEFAULT_QUICK_AMOUNTS = [100, 500, 1000];

function loadQuickAmounts() {
  try {
    const raw = localStorage.getItem(QUICK_AMOUNTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === DEFAULT_QUICK_AMOUNTS.length) {
        return arr.map((n) => Number(n) || 0);
      }
    }
  } catch { /* ignore */ }
  return [...DEFAULT_QUICK_AMOUNTS];
}

const quickAmounts = ref(loadQuickAmounts());
const editingAmounts = ref(false);
const editAmounts = ref([]);

const LEAGUE_ICON_BY_NAME = {
  欧冠: iconChampionUrl,
  英超: iconUkUrl,
  意甲: iconItalyUrl,
  西甲: iconSpainUrl,
  德甲: iconGermaryUrl,
  法甲: iconFranceUrl,
};

const leagueIconUrl = computed(() => {
  if (props.match.leagueIcon) return props.match.leagueIcon;
  return LEAGUE_ICON_BY_NAME[props.match.league] ?? iconEventsUrl;
});
const homeLogoUrl = computed(() => resolveTeamLogoUrl(props.match.homeTeam, props.match.homeTeamLogo));
const awayLogoUrl = computed(() => resolveTeamLogoUrl(props.match.awayTeam, props.match.awayTeamLogo));

const profitPercent = computed(() => {
  if (refreshedYield.value != null) return String(refreshedYield.value);
  if (props.row?.yieldPct != null) return String(props.row.yieldPct);
  const raw = props.row?.probability ?? '6.99%';
  return String(raw).replace(/%$/, '') || '6.99';
});

/** 弹窗公式区展示用收益率：对齐安卓 OddsFormatter.format，HALF_UP 两位 */
const profitPercentDisplay = computed(() => {
  const numeric = Number(profitPercent.value);
  if (!Number.isFinite(numeric)) return '--';
  return numeric.toFixed(2);
});

// 与安卓 BuyDialog 一致：结果页本地回退预估收益时手续费固定 5%。
const TRANSACTION_FEE_RATE = 0.05;

const feeRateDisplay = computed(() => {
  const rate = props.row?.feeRate ?? props.match?.feeRate;
  if (rate == null) return '';
  const pct = Number(rate) * 100;
  const display = pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, '');
  return `-${display}%`;
});

const scoreLabel = computed(() => formatScoreOption(props.row?.score ?? '0-0'));

const marketScopeKey = computed(() => (props.marketTab === 'halftime' ? '半场' : '全场'));

const matchDateDisplay = computed(() => formatKickoffDisplay(
  props.match.kickoffAt || props.match.date || '',
));

/** 金额：en-US 千分位 + 两位小数，对齐安卓 AppTools.formatAmount */
function formatMoneyAmount(value) {
  const amount = Number(String(value ?? '').replace(/,/g, '').replace(/[¥+\s]/g, ''));
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 收益率：HALF_UP 两位后加 %，对齐安卓 OddsFormatter.formatPercentText */
function formatYieldPercent(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  return text.split('~').map((part) => {
    const numeric = Number(String(part).trim().replace(/%$/, ''));
    if (!Number.isFinite(numeric)) return String(part).trim();
    return `${numeric.toFixed(2)}%`;
  }).join(' ~ ');
}

/** 开赛时间：ISO 转 `yyyy-MM-dd HH:mm`，对齐安卓 toDisplayTime */
function formatKickoffDisplay(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text)) {
    return text
      .replace('T', ' ')
      .replace(/\.\d+/, '')
      .replace(/([+-]\d{2}:\d{2}|Z)$/, '')
      .slice(0, 16);
  }
  if (/^\d{4}-/.test(text)) return text.slice(0, 16);
  return text;
}

function pickOrderText(order, ...keys) {
  for (const key of keys) {
    const value = order?.[key];
    if (value != null && String(value).trim() !== '') return String(value);
  }
  return '';
}

/**
 * 本地预估收益对齐安卓 recalculateProfit：
 * profit = amount * yield%(两位) / 100 * (1 - 0.05)
 */
function calcNetProfit(amount, yieldPct) {
  const amt = Number(amount);
  const yieldRate = Number(Number(yieldPct).toFixed(2));
  if (!Number.isFinite(amt) || amt <= 0 || !Number.isFinite(yieldRate)) return '0.00';
  const gross = amt * yieldRate / 100;
  const profit = gross - gross * TRANSACTION_FEE_RATE;
  return formatMoneyAmount(profit);
}

const estimatedProfit = computed(() => {
  const amt = Number(buyAmount.value);
  if (!Number.isFinite(amt) || amt <= 0) return '0.00';
  return calcNetProfit(amt, profitPercent.value);
});

const estimatedProfitRange = computed(() => {
  const amt = Number(buyAmount.value);
  if (!Number.isFinite(amt) || amt <= 0) return '--';
  const min = Number(profitMin.value);
  const max = Number(profitMax.value);
  if (min <= 0 && max <= 0) return '--';
  // 预约区间对齐安卓：不扣手续费
  return `${formatMoneyAmount(amt * min / 100)} ~ ${formatMoneyAmount(amt * max / 100)}`;
});

const successOrderNo = ref('');
const successLeague = ref('');
const successKickoff = ref('');
const successScore = ref('');
const successPeriodLabel = ref('');
const successAmount = ref('0.00');
const successYield = ref('0.00%');
const successProfit = ref('0.00');

/**
 * 成功页「预估收益」：只展示净收益，不含本金。
 * estimatedPayout / payout 可能是含本金到账额（如 539.76 = 500 + 39.76），需扣本金；
 * 对齐账务列表 resolveProfit。
 */
function resolveSuccessProfit(order, amount, yieldRaw) {
  const amt = Number(amount);
  const explicit = pickOrderText(
    order,
    'expectedProfit',
    'profit',
    'netProfit',
    'realizedProfit',
  );
  if (explicit !== '') {
    const n = Number(explicit);
    if (Number.isFinite(n)) {
      // 若字段实际仍是含本金金额，同样扣本金
      if (Number.isFinite(amt) && amt > 0 && n >= amt) return formatMoneyAmount(n - amt);
      return formatMoneyAmount(n);
    }
  }

  const payoutRaw = pickOrderText(order, 'estimatedPayout', 'payout', 'returnAmount');
  if (payoutRaw !== '') {
    const payoutAmount = Number(payoutRaw);
    if (Number.isFinite(payoutAmount)) {
      const profit = Number.isFinite(amt) && amt > 0 && payoutAmount >= amt
        ? payoutAmount - amt
        : payoutAmount;
      return formatMoneyAmount(profit);
    }
  }

  return calcNetProfit(amount, String(yieldRaw).split('~')[0]);
}

function buildSuccessPayload(order, amount) {
  // 字段优先级对齐安卓 BuyDialog.buildResultPayload
  const yieldRaw = pickOrderText(
    order,
    'yieldAtBuy',
    'yieldPct',
    'expectedYield',
    'yield',
    'profitRate',
  ) || (
    [pickOrderText(order, 'yieldMin'), pickOrderText(order, 'yieldMax')]
      .filter(Boolean)
      .join(' ~ ')
  ) || profitPercent.value;

  const scoreRaw = pickOrderText(order, 'score', 'selectedScore')
    || props.row?.scoreRaw
    || props.row?.score
    || '0-0';

  successOrderNo.value = pickOrderText(order, 'orderNo', 'orderId', 'id');
  successLeague.value = pickOrderText(order, 'leagueName', 'leagueShortName', 'matchName')
    || props.match.league
    || '';
  successKickoff.value = formatKickoffDisplay(
    pickOrderText(order, 'matchKickoffAt', 'kickoffAt', 'matchTime', 'startTime')
    || props.match.kickoffAt
    || props.match.date
    || '',
  );
  successScore.value = formatScoreOption(scoreRaw.replace(/:/g, '-'));
  successPeriodLabel.value = t(marketScopeKey.value);
  successAmount.value = formatMoneyAmount(
    pickOrderText(order, 'amount', 'orderAmount') || amount,
  );
  successYield.value = formatYieldPercent(yieldRaw);
  // 预估收益不含本金（如 500×8.37%×0.95 ≈ 39.76，而非 539.76）
  successProfit.value = resolveSuccessProfit(order, amount, yieldRaw);
}

async function refreshWalletBalance() {
  walletLoading.value = true;
  try {
    const res = await fetchBalance();
    // 买入可用额度取账户余额 available（与个人中心一致）；并同步 WalletVO 三字段到 store
    const wallet = res.data || {};
    walletBalance.value = wallet.available ?? wallet.balance ?? null;
    userStore.updateUserProfile({
      balance: wallet.balance,
      available: wallet.available,
      frozen: wallet.frozen,
    });
  } catch { /* non-critical */ }
  finally { walletLoading.value = false; }
}

async function loadPendingQuota() {
  try {
    const res = await fetchPendingQuota();
    pendingQuota.value = res.data?.remaining ?? res.data?.remainingCount ?? null;
  } catch { /* non-critical */ }
}

/** 比分 key：接口 / WS 使用 `主:客` */
function getScoreKey() {
  return props.row?.scoreRaw ?? String(props.row?.score ?? '0-0').replace(/-/g, ':');
}

function extractYieldValue(item) {
  if (item == null) return null;
  if (typeof item === 'number' || typeof item === 'string') {
    const n = Number(item);
    return Number.isFinite(n) ? n : null;
  }
  if (item.yieldPct != null) {
    const n = Number(item.yieldPct);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 从 yields 接口响应中按比分取最新收益率 */
function matchPoolYield(data, scoreKey) {
  if (!data) return null;
  if (Array.isArray(data)) {
    const alt = scoreKey.replace(/:/g, '-');
    const found = data.find((p) => p?.score === scoreKey || p?.score === alt);
    return extractYieldValue(found);
  }
  if (typeof data === 'object') {
    return extractYieldValue(data[scoreKey] ?? data[scoreKey.replace(/:/g, '-')]);
  }
  return null;
}

/**
 * 对齐安卓 BuyDialog：下单用 MarketYieldStore.latest(marketId, score) ?: currentYield
 * 先拉当前赔率列表，失败则回退弹窗内已展示值。
 */
async function resolveLatestYield() {
  const marketId = props.row?._marketId;
  const fallback = Number(profitPercent.value);
  if (!marketId) {
    return Number.isFinite(fallback) ? fallback : null;
  }
  try {
    const yieldRes = await fetchPoolYields(marketId);
    const latest = matchPoolYield(yieldRes.data, getScoreKey());
    if (latest != null) {
      refreshedYield.value = latest;
      return latest;
    }
  } catch { /* 回退展示值 */ }
  return Number.isFinite(fallback) ? fallback : null;
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      phase.value = 'form';
      buyType.value = 'standard';
      buyAmount.value = '';
      editingAmounts.value = false;
      refreshedYield.value = null;
      const yield_ = Number(profitPercent.value);
      profitMin.value = yield_ ? yield_.toFixed(2) : '5.34';
      profitMax.value = yield_ ? yield_.toFixed(2) : '7.34';
      refreshWalletBalance();
      loadPendingQuota();
    }
  },
);

// 详情页 WS 同步 selectedRow 后，清空本地刷新值，展示跟随实时赔率
watch(
  () => props.row?.yieldPct,
  (next, prev) => {
    if (!props.visible || next == null || next === prev) return;
    refreshedYield.value = null;
  },
);

function formatScoreOption(score) {
  const raw = String(score ?? '');
  // 后端「OTHER」聚合比分展示为「其他」，对齐安卓端。
  if (raw.toUpperCase() === 'OTHER') return t('其他');
  return raw.replace('-', ' - ');
}

function setQuickAmount(val) {
  if (val === 'all') {
    // 「全部」填入账户余额（available），与展示口径一致
    const raw = walletBalance.value != null
      ? String(walletBalance.value)
      : loggedInAssetsFormatted.value.replace(/,/g, '');
    buyAmount.value = raw.replace(/,/g, '');
    return;
  }
  buyAmount.value = String(val);
}

function toggleEditAmounts() {
  if (editingAmounts.value) {
    finishEditAmounts();
    return;
  }
  editAmounts.value = quickAmounts.value.map((n) => String(n));
  editingAmounts.value = true;
}

function finishEditAmounts() {
  quickAmounts.value = editAmounts.value.map((v, i) => {
    const n = Math.floor(Number(String(v).trim()));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_QUICK_AMOUNTS[i];
  });
  try {
    localStorage.setItem(QUICK_AMOUNTS_KEY, JSON.stringify(quickAmounts.value));
  } catch { /* ignore */ }
  editingAmounts.value = false;
}

function closeSheet() {
  emit('close');
}

const submitting = ref(false);

async function confirmBuy() {
  const raw = buyAmount.value.trim();
  if (!raw) {
    toast.error(t('请输入金额'));
    return;
  }
  const amt = Number(raw);
  if (!Number.isFinite(amt) || amt <= 0) {
    toast.error(t('金额必须大于零'));
    return;
  }

  if (walletLoading.value) {
    toast.error(t('正在获取余额请稍候'));
    return;
  }
  if (walletBalance.value == null) {
    toast.error(t('余额获取失败请重试'));
    refreshWalletBalance();
    return;
  }
  if (amt > Number(walletBalance.value)) {
    const formatted = Number(walletBalance.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    toast.error(`${t('余额不足')}，${t('当前余额')}：${formatted}`);
    return;
  }

  try {
    submitting.value = true;
    const marketId = props.row?._marketId;
    const score = getScoreKey();

    // 直接用最新赔率下单；若仍 YIELD_CHANGED 则静默刷新后再试一次（不弹提示）
    let latestYield = await resolveLatestYield();
    if (latestYield == null) {
      toast.error(t('提交失败，请重试'));
      return;
    }

    let res;
    try {
      res = await submitBuyOrder({
        marketId,
        score,
        amount: amt,
        expectedYield: latestYield,
      });
    } catch (firstErr) {
      const errCode = firstErr?.code || firstErr?.response?.data?.code;
      const errMsg = String(firstErr?.message || '');
      const yieldChanged = errCode === 'YIELD_CHANGED' || errMsg.includes('YIELD_CHANGED');
      if (!yieldChanged) throw firstErr;

      latestYield = await resolveLatestYield();
      if (latestYield == null) throw firstErr;
      res = await submitBuyOrder({
        marketId,
        score,
        amount: amt,
        expectedYield: latestYield,
      });
    }

    if (res.walletBalance != null) {
      userStore.updateUserProfile({ balance: res.walletBalance });
    }
    // 下单成功后重拉 WalletVO，展示仍用账户余额 available
    await refreshWalletBalance();

    const order = res.data || {};
    // 成功弹窗字段组装对齐安卓 BuyResultDialog / buildResultPayload
    buildSuccessPayload(order, amt);
    phase.value = 'success';
  } catch (e) {
    toast.error(e?.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}

function goPurchaseDetails() {
  emit('close');
  router.push('/finance/records');
}

function onBackdropKeydown(e) {
  if (e.key === 'Escape') closeSheet();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="buy-sheet-fade">
    <div
      v-if="visible"
      class="buy-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="phase === 'success' ? t('交易成功') : t('买入金额')"
    >
      <div class="buy-sheet__backdrop" aria-hidden="true" @click="closeSheet" />

      <div class="buy-sheet__panel-wrap">
        <button type="button" class="buy-sheet__close norem" :aria-label="t('关闭')" @click="closeSheet">
          <span aria-hidden="true">×</span>
        </button>

        <!-- 交易成功 -->
        <div v-if="phase === 'success'" class="buy-sheet__success-stack">
        <div class="buy-sheet__success">
        <div class="buy-sheet__success-head">
          <img
            class="buy-sheet__success-icon"
            :src="iconTradeSuccessUrl"
            alt=""
            width="44"
            height="44"
            decoding="async"
            draggable="false"
          />
          <span class="buy-sheet__success-title">{{ t('交易成功') }}!</span>
        </div>

        <div class="buy-sheet__success-body card-default">
          <div class="buy-sheet__success-field">
            <span class="buy-sheet__success-label">{{ t('单号') }}</span>
            <span class="buy-sheet__success-val">{{ successOrderNo }}</span>
          </div>
          <div class="buy-sheet__success-field">
            <span class="buy-sheet__success-label">{{ t('联盟') }}</span>
            <span class="buy-sheet__success-val">{{ successLeague }}</span>
          </div>
          <div class="buy-sheet__success-field">
            <span class="buy-sheet__success-label">{{ t('开赛时间') }}</span>
            <span class="buy-sheet__success-val">{{ successKickoff }}</span>
          </div>
          <div class="buy-sheet__success-field buy-sheet__success-field--teams">
            <span class="buy-sheet__success-label">{{ t('赛事') }}</span>
            <div class="buy-sheet__success-teams">
              <span class="buy-sheet__success-team">
                <img v-if="homeLogoUrl" :src="homeLogoUrl" alt="" width="20" height="20" />
                <span class="buy-sheet__success-team-name">
                  {{ match.homeTeam }}
                  <span class="buy-sheet__side-tag buy-sheet__side-tag--home buy-sheet__side-tag--after">{{ t('主') }}</span>
                </span>
              </span>
              <span class="buy-sheet__success-team">
                <img v-if="awayLogoUrl" :src="awayLogoUrl" alt="" width="20" height="20" />
                <span class="buy-sheet__success-team-name">
                  {{ match.awayTeam }}
                  <span class="buy-sheet__side-tag buy-sheet__side-tag--away buy-sheet__side-tag--after">{{ t('客') }}</span>
                </span>
              </span>
            </div>
          </div>
          <div class="buy-sheet__success-field">
            <span class="buy-sheet__success-label">{{ t('选项') }}</span>
            <!-- 对齐安卓：选项 0-1 （全场） -->
            <span class="buy-sheet__success-val">{{ t('选项') }} {{ successScore }} （{{ successPeriodLabel }}）</span>
          </div>

          <div class="buy-sheet__success-summary">
            <div class="buy-sheet__success-summary-row">
              <span class="buy-sheet__success-summary-label">{{ t('金额') }}</span>
              <span class="buy-sheet__success-summary-val buy-sheet__success-summary-val--profit">{{ successAmount }}</span>
            </div>
            <div class="buy-sheet__success-summary-row">
              <!-- i18n「收益率」已含 %，勿再追加，避免出现「收益率%%」 -->
              <span class="buy-sheet__success-summary-label">{{ t('收益率') }}</span>
              <span class="buy-sheet__success-summary-val buy-sheet__success-summary-val--rate">x {{ successYield }}</span>
            </div>
            <div class="buy-sheet__success-summary-row">
              <span class="buy-sheet__success-summary-label">{{ t('预估收益') }}</span>
              <!-- 对齐安卓前缀「+ 金额」，数值本身不再叠 ¥ -->
              <span class="buy-sheet__success-summary-val buy-sheet__success-summary-val--profit">+ {{ successProfit }}</span>
            </div>
          </div>

          <button
            v-if="!isMobile"
            type="button"
            class="btn btn--default-1 buy-sheet__success-btn"
            @click="goPurchaseDetails"
          >
            {{ t('前往财务查看') }}
          </button>
        </div>

        </div>

        <button
          v-if="isMobile"
          type="button"
          class="btn btn--primary buy-sheet__success-btn buy-sheet__success-btn--outer norem"
          @click="goPurchaseDetails"
        >
          {{ t('前往财务查看') }}
        </button>
        </div>

        <!-- 买入表单 -->
        <div v-else class="buy-sheet__form-stack">
        <div class="buy-sheet__frame">
        <div class="buy-sheet__body">
        <div class="buy-sheet__invest">
          <span class="buy-sheet__invest-icon" aria-hidden="true">
            <img :src="iconInvestingUrl" width="30" height="30" alt="" />
          </span>
          <span class="buy-sheet__invest-text">{{ t('您正在投资') }}:</span>
          <strong class="buy-sheet__invest-option">{{ t('选项') }} {{ formatScoreOption(row?.score ?? '0-0') }}</strong>
          <span class="buy-sheet__invest-tag">{{ t(marketScopeKey) }}</span>
        </div>

        <div class="buy-sheet__match card-default">
          <div class="buy-sheet__match-head">
            <img class="buy-sheet__match-league-icon" :src="leagueIconUrl" width="18" height="18" alt="" />
            <span class="buy-sheet__match-league">{{ match.league }}</span>
          </div>
          <p class="buy-sheet__match-date">{{ matchDateDisplay }}</p>
          <div class="buy-sheet__match-arena">
            <div class="buy-sheet__match-arena-grid">
              <div class="buy-sheet__match-teams">
                <div class="buy-sheet__match-team">
                  <img v-if="homeLogoUrl" class="buy-sheet__match-logo" :src="homeLogoUrl" :alt="match.homeTeam" width="40" height="40" />
                  <span class="buy-sheet__match-name">
                    {{ match.homeTeam }}
                    <span class="buy-sheet__side-tag buy-sheet__side-tag--home">{{ t('主') }}</span>
                  </span>
                </div>
                <span class="buy-sheet__match-vs">VS</span>
                <div class="buy-sheet__match-team">
                  <img v-if="awayLogoUrl" class="buy-sheet__match-logo" :src="awayLogoUrl" :alt="match.awayTeam" width="40" height="40" />
                  <span class="buy-sheet__match-name">
                    {{ match.awayTeam }}
                    <span class="buy-sheet__side-tag buy-sheet__side-tag--away">{{ t('客') }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="buy-sheet__panel card-default">
          <div class="buy-sheet__panel-head">
            <span class="buy-sheet__panel-title">{{ t('交易金额') }}</span>
            <span class="buy-sheet__panel-yield">{{ t('收益') }} %</span>
          </div>
          <div class="buy-sheet__formula">
            <input
              v-model="buyAmount"
              type="text"
              inputmode="decimal"
              class="buy-sheet__amount-input buy-sheet__amount-input--full"
              :placeholder="t('输入金额')"
            />
            <span class="buy-sheet__formula-suffix">x {{ profitPercentDisplay }}% =</span>
            <span class="buy-sheet__formula-result">{{ estimatedProfit }}</span>
          </div>
          <p v-if="feeRateDisplay" class="buy-sheet__fee">{{ t('手续费') }}{{ feeRateDisplay }}</p>
          <div class="buy-sheet__chips">
            <button
              type="button"
              class="buy-sheet__chip buy-sheet__chip--icon"
              :class="{ 'buy-sheet__chip--icon-editing': editingAmounts }"
              :aria-label="t('设置')"
              @click="toggleEditAmounts"
            >
              <img v-if="!editingAmounts" :src="iconBuySettingsUrl" width="36" height="36" alt="" aria-hidden="true" />
              <img v-else :src="iconBuySettingsGrayUrl" width="22" height="22" alt="" aria-hidden="true" />
            </button>
            <template v-if="editingAmounts">
              <input
                v-for="(_, i) in editAmounts"
                :key="i"
                v-model="editAmounts[i]"
                type="text"
                inputmode="numeric"
                class="buy-sheet__chip buy-sheet__chip--edit"
                @keyup.enter="finishEditAmounts"
              />
              <button type="button" class="buy-sheet__chip buy-sheet__chip--done" @click="finishEditAmounts">
                {{ t('完成') }}
              </button>
            </template>
            <template v-else>
              <button
                v-for="(amt, i) in quickAmounts"
                :key="i"
                type="button"
                class="buy-sheet__chip"
                @click="setQuickAmount(amt)"
              >
                {{ amt }}
              </button>
              <button type="button" class="buy-sheet__chip" @click="setQuickAmount('all')">{{ t('全部') }}</button>
            </template>
          </div>
          <div class="buy-sheet__wallet">
            <span class="buy-sheet__wallet-account">
              <svg class="buy-sheet__wallet-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="7" r="3.2" fill="#8AA0BC" />
                <path d="M4 16.2c0-3 2.7-5.2 6-5.2s6 2.2 6 5.2" fill="#8AA0BC" />
              </svg>
              <span class="buy-sheet__wallet-id">{{ loggedInUserId || '' }}</span>
            </span>
            <span class="buy-sheet__wallet-pill">
              <span class="buy-sheet__wallet-name">{{ t('账户余额') }}</span>
              <strong class="buy-sheet__wallet-balance" v-if="walletLoading">--</strong>
              <strong class="buy-sheet__wallet-balance" v-else>{{ walletBalance != null ? Number(walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--' }}</strong>
            </span>
          </div>
        </div>
        </div>

        <div v-if="!isMobile" class="buy-sheet__actions">
          <button type="button" class="btn btn--default-1 buy-sheet__cancel-btn" @click="closeSheet">
            {{ t('取消') }}
          </button>
          <button type="button" class="btn btn--primary buy-sheet__confirm-btn" :disabled="submitting" @click="confirmBuy">
            {{ submitting ? t('提交中...') : t('确定') }}
          </button>
        </div>
        </div>

        <div v-if="isMobile" class="buy-sheet__actions buy-sheet__actions--outer norem">
          <button type="button" class="btn buy-sheet__cancel-btn" @click="closeSheet">
            {{ t('取消') }}
          </button>
          <button type="button" class="btn btn--primary buy-sheet__confirm-btn" :disabled="submitting" @click="confirmBuy">
            {{ submitting ? t('提交中...') : t('确定') }}
          </button>
        </div>
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.buy-sheet {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(44px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow: hidden;

  @include web-only {
    padding: 24px;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(11, 52, 98, 0.55);
    backdrop-filter: blur(4px);
  }

  &__panel-wrap {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 420px;
    max-height: calc(100dvh - 56px);
    flex-shrink: 0;
    overflow: visible;

    @include web-only {
      max-width: 440px;
      // 预留关闭按钮上浮 + 外边距，避免整页裁切弹窗底部
      max-height: calc(100dvh - 72px);
      min-height: 0;
      // 保持 visible，避免裁掉上浮的关闭按钮
      overflow: visible;
    }
  }

  /* H5：弹框主体 + 外部按钮纵向排列 */
  &__form-stack,
  &__success-stack {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 0;

    @include mobile-only {
      flex: 1;
      gap: 12px;
      max-height: 100%;
    }

    @include web-only {
      flex: 1 1 auto;
      // 与 panel-wrap 同高上限，自身裁剪并由内层滚动
      max-height: calc(100dvh - 72px);
      overflow: hidden;
    }
  }

  @include mobile-only {
    &__success-stack {
      align-items: center;
    }

    &__success-stack &__success {
      width: 100%;
      align-self: stretch;
    }
  }

  &__close {
    position: absolute;
    top: 0;
    right: 12px;
    z-index: 3;
    width: 32px;
    height: 32px;
    border: 1.5px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(calc(-100% - 10px));
    padding: 0;
    backdrop-filter: blur(4px);
    transition:
      background 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.35);
      border-color: #fff;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.6);
      outline-offset: 2px;
    }

    @include mobile-only {
      &.norem {
        width: 28px;
        height: 28px;
        right: 10px;
        border-width: 1px;
        font-size: 17px;
        transform: translateY(calc(-100% - 8px));
      }
    }

    @include web-only {
      right: 8px;
      transform: translateY(calc(-100% - 12px));
    }
  }

  &__frame,
  &__success {
    position: relative;
    z-index: 1;
    width: 100%;
    max-height: calc(100dvh - 56px);
    box-sizing: border-box;
    border-radius: 24px;
    border: 0.8px solid rgba(214, 224, 235, 1);
    background:
      radial-gradient(100% 100% at 50% 100%, #68b3fd 0%, #0d6cfb 100%);
    box-shadow: 0 12px 40px rgba(21, 58, 118, 0.28);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @include mobile-only {
      flex: 1;
      min-height: 0;
      max-height: none;
      overflow: hidden;
    }

    @include web-only {
      flex: 1 1 auto;
      min-height: 0;
      max-height: 100%;
      // 外层不滚动，由 body / success-body 滚动，底部按钮保持可见
      overflow: hidden;
    }
  }

  /* H5 / PC：内容区可滚动，避免矮屏裁切 */
  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;

    @include mobile-only {
      flex: 1;
      overflow-y: auto;
    }

    @include web-only {
      flex: 1 1 auto;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
  }

  &__tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  &__tab {
    flex: 1;
    min-height: 36px;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;

    &--idle {
      background: rgba(255, 255, 255, 0.55);
      color: var(--theme-primary);
      border: none;
      box-shadow: none;

      &::after {
        display: none;
      }
    }
  }

  &__invest {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 7px 10px;
    border-radius: 30px;
    background: #eaf1f9;
    border: 0.8px solid #fff;
    box-shadow: 0 4px 10px rgba(21, 58, 119, 0.18);
    font-size: 14px;
    color: #0b3462;
    flex-shrink: 0;
  }

  &__invest-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;

    img {
      display: block;
      width: 30px;
      height: 30px;
    }
  }

  &__invest-text {
    flex-shrink: 0;
  }

  &__invest-option {
    color: #ff2d2d;
    font-weight: 500;
    white-space: nowrap;
  }

  &__invest-tag {
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255, 45, 45, 0.15);
    color: #ff2d2d;
    font-size: 12px;
    font-weight: 400;
    flex-shrink: 0;
  }

  &__match {
    padding: 10px 12px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  &__match-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  &__match-league {
    font-size: 14px;
    font-weight: 600;
    color: #0b3462;
  }

  &__match-date {
    margin: 0 0 8px;
    font-family: $font-family-num;
    font-size: 12px;
    color: rgba(11, 52, 98, 0.55);
  }

  &__match-arena {
    border-radius: 12px;
    overflow: hidden;
  }

  &__match-arena-grid {
    position: relative;
    overflow: hidden;
    min-height: 100px;
    background-color: #f3f8ff;
    background-image: url('@/assets/images/events/bg_score.svg');
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;

    @include web-only {
      min-height: 118px;
    }
  }

  &__match-teams {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-height: 100px;
    padding: 12px 10px;
    box-sizing: border-box;

    @include web-only {
      min-height: 118px;
      padding: 14px 12px;
    }
  }

  &__match-team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__match-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 50%;
  }

  &__match-name {
    font-size: 11px;
    font-weight: 500;
    color: #0b3462;
    text-align: center;
    line-height: 1.2;
  }

  &__match-vs {
    font-size: 18px;
    font-weight: 700;
    color: #1c7bff;
  }

  &__side-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 2px;
    min-width: 14px;
    height: 14px;
    padding: 0 2px;
    border-radius: 3px;
    font-size: 9px;
    color: #fff;
    vertical-align: middle;

    &--home {
      background: #1c7bff;
    }

    &--away {
      background: rgba(11, 52, 98, 0.5);
    }

    &--after {
      margin-right: 0;
      margin-left: 0;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      font-size: 10px;
      line-height: 1;
      vertical-align: unset;
    }
  }

  &__panel {
    padding: 12px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  &__panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    &--sub {
      margin-top: 4px;
    }
  }

  &__panel-title {
    font-size: 14px;
    font-weight: 400;
    color: rgba(11, 52, 98, 0.5);
  }

  &__panel-yield {
    font-size: 14px;
    font-weight: 500;
    color: #1c7bff;
  }

  &__profit-link {
    border: none;
    background: transparent;
    color: #1c7bff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
  }

  &__formula {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1.5px solid #1c7bff;
    background: #fff;
    margin-bottom: 6px;
    overflow: hidden;
    box-sizing: border-box;
    max-width: 100%;

    &--plain {
      border-color: rgba(228, 240, 254, 0.95);
    }
  }

  &__formula-prefix {
    flex-shrink: 0;
    font-family: $font-family-num;
    font-size: 13px;
    color: rgba(11, 52, 98, 0.55);
  }

  &__formula-suffix {
    flex-shrink: 0;
    font-family: $font-family-num;
    font-size: 12px;
    color: rgba(11, 52, 98, 0.5);
    white-space: nowrap;
  }

  &__formula-result {
    flex-shrink: 0;
    font-family: $font-family-num;
    font-size: 14px;
    font-weight: 500;
    color: #1c7bff;
    white-space: nowrap;
  }

  &__amount-input {
    flex: 1;
    min-width: 0;
    max-width: 100%;
    border: none;
    background: transparent;
    font-family: $font-family-base;
    font-size: 14px;
    font-weight: 400;
    color: #0b3462;
    text-align: left;
    outline: none;
    box-sizing: border-box;

    &--full {
      text-align: left;
    }

    &::placeholder {
      color: rgba(11, 52, 98, 0.5);
      font-weight: 400;
    }
  }

  &__fee {
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 300;
    color: #ff2d2d;
    text-align: right;
  }

  &__fee-inline {
    margin-left: 8px;
    font-size: 11px;
    color: #ff2d2d;
  }

  &__chips {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  &__chip {
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 6px;
    border-radius: 12px;
    border: none;
    background: #eaf1f9;
    color: rgba(11, 52, 98, 0.5);
    font-family: $font-family-base;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;

    &:last-child {
      color: #0b3462;
    }

    &--icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 36px;
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 50%;
      background: transparent;
      border: none;

      img {
        display: block;
        width: 36px;
        height: 36px;
      }
    }

    &--icon-editing {
      border-radius: 12px;
      background: #eaf1f9;

      img {
        width: 22px;
        height: 22px;
      }
    }

    &--edit {
      flex: 1;
      min-width: 0;
      height: 36px;
      padding: 0 6px;
      border-radius: 12px;
      border: 0.8px solid #d6e0eb;
      background: #fff;
      color: #0b3462;
      font-family: $font-family-base;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      outline: none;
      box-sizing: border-box;

      &:focus {
        border-color: #1c7bff;
      }
    }

    &--done,
    &--done:last-child {
      background: #1c7bff;
      color: #fff;
    }
  }

  &__scheduled-meta {
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(11, 52, 98, 0.08);
  }

  &__scheduled-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: rgba(11, 52, 98, 0.65);
    margin-bottom: 6px;

    strong {
      color: #0b3462;
      font-weight: 600;
    }
  }

  &__scheduled-profit {
    color: #1c7bff !important;
  }

  &__scheduled-range {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }

  &__scheduled-range-label {
    font-size: 13px;
    color: rgba(11, 52, 98, 0.65);
    flex-shrink: 0;
  }

  &__scheduled-range-inputs {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    justify-content: flex-end;
  }

  &__range-input {
    width: 72px;
    height: 32px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid rgba(228, 240, 254, 0.95);
    background: #fff;
    font-family: $font-family-num;
    font-size: 16px;
    text-align: center;
    color: #0b3462;
    outline: none;
    box-sizing: border-box;
  }

  &__range-sep {
    color: rgba(11, 52, 98, 0.45);
  }

  &__scheduled-tip {
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
    color: #ff2d2d;
  }

  &__est {
    margin: 8px 0 0;
    font-size: 12px;
    color: #1c7bff;
    font-weight: 500;
  }

  &__wallet {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 36px;
    padding: 4px 8px;
    border-radius: 22px;
    background: #eaf1f9;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }

  &__wallet-account {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  &__wallet-icon {
    flex-shrink: 0;
  }

  &__wallet-id {
    font-size: 12px;
    font-weight: 500;
    color: rgba(11, 52, 98, 0.5);
    white-space: nowrap;
  }

  &__wallet-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    padding: 2px 10px;
    border-radius: 38px;
    background: #fff;
  }

  &__wallet-name {
    font-size: 14px;
    color: rgba(11, 52, 98, 0.5);
    white-space: nowrap;
  }

  &__wallet-balance {
    font-family: $font-family-num;
    font-size: 14px;
    font-weight: 500;
    color: #1c7bff;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }

  /* H5：取消/确定在蓝色弹框外、蒙层上 */
  &__actions--outer {
    width: 100%;
    flex-shrink: 0;
  }

  &__cancel-btn,
  &__confirm-btn {
    flex: 1;
    min-height: 44px;
    font-weight: 600;

    @include web-only {
      font-size: 15px;
    }
  }

  /* PC：蓝边蓝字取消钮（沿用原样式） */
  @include web-only {
    &__cancel-btn {
      border: 1.5px solid #1c7bff;
      color: #1c7bff;
      background: #fff;
    }
  }

  /* H5：白底红字取消 + 蓝底白字确定（设计稿，在弹框外部） */
  @include mobile-only {
    &__actions--outer.norem {
      gap: 11px;
    }

    &__actions--outer.norem &__cancel-btn,
    &__actions--outer.norem &__confirm-btn {
      height: 44px;
      min-height: 44px;
      padding: 0 16px;
      border-radius: 32px;
      font-size: 18px;
      font-weight: 400;
      line-height: 1.2;
    }

    &__actions--outer.norem &__cancel-btn {
      border: none;
      color: var(--auxiliary-2);
      background: #fff;
      box-shadow: none;

      &::after {
        display: none;
      }
    }

    &__actions--outer.norem &__confirm-btn {
      border: none;
    }
  }

  /* 交易成功 */
  &__success {
    position: relative;
    padding: 12px;
    overflow: hidden;
    border: 0.8px solid rgba(214, 224, 235, 1);
    border-radius: 24px;
    background: radial-gradient(100% 100% at 50% 100%, #68b3fd 0%, #0d6cfb 100%);
    box-shadow: 0 12px 40px rgba(21, 58, 118, 0.28);
    gap: 0;

    @include web-only {
      display: flex;
      flex-direction: column;
      min-height: 0;
      max-height: 100%;
    }

    &::before {
      content: 'UNIBET';
      position: absolute;
      top: 6px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 52px;
      font-weight: 800;
      letter-spacing: 2px;
      color: rgba(255, 255, 255, 0.1);
      pointer-events: none;
      z-index: 0;
    }
  }

  &__success-head {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 16px 18px;
    flex-shrink: 0;
  }

  &__success-icon {
    display: block;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &__success-title {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
  }

  &__success-body {
    position: relative;
    z-index: 1;
    margin: 0;
    padding: 4px 14px 14px;
    border-radius: 16px;
    border: none;
    background: #fff;
    display: flex;
    flex-direction: column;
    min-height: 0;

    @include mobile-only {
      flex: 1;
      overflow-y: auto;
    }

    @include web-only {
      flex: 1 1 auto;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
  }

  &__success-field {
    padding: 12px 0 10px;
    border-bottom: 0.8px solid #eaf1f9;
  }

  &__success-label {
    display: block;
    font-size: 12px;
    color: rgba(11, 52, 98, 0.5);
    margin-bottom: 6px;
  }

  &__success-val {
    font-size: 15px;
    font-weight: 600;
    color: #0b3462;
    word-break: break-all;
  }

  &__success-teams {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 2px;
  }

  &__success-team {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    background: #eaf1f9;
    font-size: 14px;
    font-weight: 500;
    color: #0b3462;

    img {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: contain;
      flex-shrink: 0;
    }
  }

  &__success-team-name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    line-height: 1.3;
    min-width: 0;
  }

  &__success-summary {
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    background: #eaf1f9;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__success-summary-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__success-summary-label {
    font-size: 12px;
    color: rgba(11, 52, 98, 0.5);
  }

  &__success-summary-val {
    font-family: $font-family-num;
    font-size: 15px;
    font-weight: 600;
    color: #0b3462;

    &--rate {
      color: #ff2d2d;
    }

    &--profit {
      color: #1c7bff;
    }
  }

  &__success-btn {
    min-height: 44px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 600;
    flex-shrink: 0;

    @include web-only {
      width: 100%;
      margin: 14px 0 0;
      border: none;
      box-shadow: var(--shadow-card);
    }
  }

  /* H5：前往买入明细在弹框外，稿图 166×44 居中主按钮 */
  @include mobile-only {
    &__success-btn--outer.norem {
      width: 166px;
      height: 44px;
      min-height: 44px;
      flex-shrink: 0;
      align-self: center;
      padding: 0 16px;
      font-size: 15px;
      border-radius: 999px;
      border: none;
      white-space: nowrap;
    }
  }
}

.buy-sheet-fade-enter-active,
.buy-sheet-fade-leave-active {
  transition: opacity 0.25s ease;

  .buy-sheet__panel-wrap {
    transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
  }
}

.buy-sheet-fade-enter-from,
.buy-sheet-fade-leave-to {
  opacity: 0;

  .buy-sheet__panel-wrap {
    transform: scale(0.95) translateY(16px);
  }
}
</style>
