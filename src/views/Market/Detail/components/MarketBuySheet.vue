<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useToast } from '@/hooks/useToast';
import { submitBuyOrder, fetchPendingQuota } from '@/api/order';
import { fetchBalance } from '@/api/finance';
import { fetchPoolYields } from '@/api/match';

import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';
import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import iconTradeSuccessUrl from '@/assets/images/common/icon_trade_success.svg?url';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

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

const buyType = ref('standard');
const buyAmount = ref('');
const profitMin = ref('5.34');
const profitMax = ref('7.34');
const phase = ref('form');

const walletBalance = ref(null);
const walletLoading = ref(false);
const pendingQuota = ref(null);
const refreshedYield = ref(null);

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

const feeRateDisplay = computed(() => {
  const rate = props.row?.feeRate ?? props.match?.feeRate;
  if (rate == null) return '';
  const pct = Number(rate) * 100;
  const display = pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, '');
  return `-${display}%`;
});

const scoreLabel = computed(() => {
  const s = props.row?.score ?? '0-0';
  return s.replace('-', ' - ');
});

const marketScopeKey = computed(() => (props.marketTab === 'halftime' ? '半场' : '全场'));

const matchDateDisplay = computed(() => {
  const raw = props.match.date ?? '';
  if (/^\d{4}-/.test(raw)) return raw;
  return `2026-${raw}`;
});

const estimatedProfit = computed(() => {
  const amt = Number(buyAmount.value);
  if (!Number.isFinite(amt) || amt <= 0) return '0.00';
  return (amt * Number(profitPercent.value) / 100).toFixed(2);
});

const estimatedProfitRange = computed(() => {
  const amt = Number(buyAmount.value);
  if (!Number.isFinite(amt) || amt <= 0) return '--';
  const min = Number(profitMin.value);
  const max = Number(profitMax.value);
  if (min <= 0 && max <= 0) return '--';
  return `${(amt * min / 100).toFixed(2)} ~ ${(amt * max / 100).toFixed(2)}`;
});

const successOrderNo = ref('NO.B01774853483511738');
const successAmount = ref('100.00');
const successYield = ref('2.1');
const successProfit = ref('2.00');

const lockScroll = (locked) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
};

async function refreshWalletBalance() {
  walletLoading.value = true;
  try {
    const res = await fetchBalance();
    walletBalance.value = res.data?.available ?? res.data?.balance ?? null;
    userStore.updateUserProfile({ balance: walletBalance.value });
  } catch { /* non-critical */ }
  finally { walletLoading.value = false; }
}

async function loadPendingQuota() {
  try {
    const res = await fetchPendingQuota();
    pendingQuota.value = res.data?.remaining ?? res.data?.remainingCount ?? null;
  } catch { /* non-critical */ }
}

watch(
  () => props.visible,
  (open) => {
    lockScroll(open);
    if (open) {
      phase.value = 'form';
      buyType.value = 'standard';
      buyAmount.value = '';
      const yield_ = Number(profitPercent.value);
      profitMin.value = yield_ ? yield_.toFixed(2) : '5.34';
      profitMax.value = yield_ ? yield_.toFixed(2) : '7.34';
      refreshedYield.value = null;
      refreshWalletBalance();
      loadPendingQuota();
    }
  },
);

onBeforeUnmount(() => {
  lockScroll(false);
});

function formatScoreOption(score) {
  return score.replace('-', ' - ');
}

function setQuickAmount(val) {
  if (val === 'all') {
    buyAmount.value = loggedInAssetsFormatted.value.replace(/,/g, '');
    return;
  }
  buyAmount.value = String(val);
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
    const score = props.row?.scoreRaw ?? (props.row?.score ?? '0-0').replace(/-/g, ':');
    const payload = {
      marketId,
      score,
      amount: amt,
      expectedYield: Number(profitPercent.value),
    };

    const res = await submitBuyOrder(payload);

    if (res.walletBalance != null) {
      userStore.updateUserProfile({ balance: res.walletBalance });
      walletBalance.value = res.walletBalance;
    }

    const order = res.data || {};
    successAmount.value = amt.toFixed(2);
    successYield.value = profitPercent.value;
    successProfit.value = order.estimatedPayout ?? order.payout ?? (amt * Number(profitPercent.value) / 100).toFixed(2);
    successOrderNo.value = order.orderNo || order.id || '';
    phase.value = 'success';
  } catch (e) {
    const errCode = e?.code || e?.response?.data?.code;
    const errMsg = e?.message || '';
    if (errCode === 'YIELD_CHANGED' || errMsg.includes('YIELD_CHANGED')) {
      toast.error(errMsg || t('赔率已变化，请确认最新赔率后重新提交'));
      try {
        const marketId = props.row?._marketId;
        if (marketId) {
          const yieldRes = await fetchPoolYields(marketId);
          const pools = yieldRes.data || [];
          const scoreKey = props.row?.scoreRaw ?? (props.row?.score ?? '0-0').replace(/-/g, ':');
          const found = pools.find((p) => p.score === scoreKey);
          if (found?.yieldPct != null) {
            refreshedYield.value = Number(found.yieldPct);
          }
        }
      } catch { /* non-critical */ }
    } else {
      toast.error(errMsg || t('提交失败，请重试'));
    }
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
            width="64"
            height="56"
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
            <span class="buy-sheet__success-val">{{ match.league }}</span>
          </div>
          <div class="buy-sheet__success-field">
            <span class="buy-sheet__success-label">{{ t('开赛时间') }}</span>
            <span class="buy-sheet__success-val">{{ matchDateDisplay }}</span>
          </div>
          <div class="buy-sheet__success-field buy-sheet__success-field--teams">
            <span class="buy-sheet__success-label">{{ t('赛事') }}</span>
            <div class="buy-sheet__success-teams">
              <span class="buy-sheet__success-team">
                <img v-if="homeLogoUrl" :src="homeLogoUrl" alt="" width="20" height="20" />
                <span class="buy-sheet__success-team-name">
                  {{ match.homeTeam }}
                  <span class="buy-sheet__home-tag buy-sheet__home-tag--after">{{ t('主') }}</span>
                </span>
              </span>
              <span class="buy-sheet__success-team">
                <img v-if="awayLogoUrl" :src="awayLogoUrl" alt="" width="20" height="20" />
                <span class="buy-sheet__success-team-name">{{ match.awayTeam }}</span>
              </span>
            </div>
          </div>
          <div class="buy-sheet__success-field">
            <span class="buy-sheet__success-label">{{ t('选项') }}</span>
            <span class="buy-sheet__success-val">{{ t('选项') }} {{ scoreLabel }}</span>
          </div>

          <div class="buy-sheet__success-summary">
            <div class="buy-sheet__success-summary-row">
              <span>{{ t('金额') }}</span>
              <span class="buy-sheet__success-summary-val">¥ {{ successAmount }}</span>
            </div>
            <div class="buy-sheet__success-summary-row">
              <span>{{ t('收益率') }}</span>
              <span class="buy-sheet__success-summary-val buy-sheet__success-summary-val--rate">x {{ successYield }}%</span>
            </div>
            <div class="buy-sheet__success-summary-row">
              <span>{{ t('预估收益') }}</span>
              <span class="buy-sheet__success-summary-val buy-sheet__success-summary-val--profit">+ ¥ {{ successProfit }}</span>
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
          <span class="buy-sheet__invest-icon" aria-hidden="true">◎</span>
          <span class="buy-sheet__invest-text">
            {{ t('您正在投资') }}:
            <strong class="buy-sheet__invest-option">{{ formatScoreOption(row?.score ?? '0-0') }}</strong>
            <span class="buy-sheet__invest-tag">{{ t(marketScopeKey) }}</span>
          </span>
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
                    <span class="buy-sheet__home-tag">{{ t('主') }}</span>
                    {{ match.homeTeam }}
                  </span>
                </div>
                <span class="buy-sheet__match-vs">VS</span>
                <div class="buy-sheet__match-team">
                  <img v-if="awayLogoUrl" class="buy-sheet__match-logo" :src="awayLogoUrl" :alt="match.awayTeam" width="40" height="40" />
                  <span class="buy-sheet__match-name">{{ match.awayTeam }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="buy-sheet__panel card-default">
          <div class="buy-sheet__panel-head">
            <span class="buy-sheet__panel-title">{{ t('交易金额') }}</span>
          </div>
          <div class="buy-sheet__formula">
            <input
              v-model="buyAmount"
              type="text"
              inputmode="decimal"
              class="buy-sheet__amount-input"
              :placeholder="t('输入金额')"
            />
            <span class="buy-sheet__formula-suffix">x {{ profitPercent }}% = {{ estimatedProfit }}</span>
          </div>
          <p v-if="feeRateDisplay" class="buy-sheet__fee">{{ t('手续费') }}{{ feeRateDisplay }}</p>
          <div class="buy-sheet__chips">
            <button type="button" class="buy-sheet__chip buy-sheet__chip--icon" :aria-label="t('设置')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" stroke-width="1.2" />
                <path d="M12.5 8.8 12 10l1 .6 1.2-.7.8 1.4-1 .6.2 1.2h-1.6l-.2 1.2-1.4-.8-.7 1.2-1-.6-.6 1-.8-1.4 1-.6-.2-1.2h1.6l.2-1.2 1.4.8.7-1.2 1 .6.6-1 .8 1.4Z" stroke="currentColor" stroke-width="0.9" />
              </svg>
            </button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount(100)">100</button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount(500)">500</button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount(1000)">1000</button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount('all')">{{ t('全部') }}</button>
          </div>
        </div>
        </div>

        <div class="buy-sheet__wallet card-primary norem">
          <img class="buy-sheet__wallet-avatar" :src="avatarDefaultUrl" alt="" width="32" height="32" />
          <span class="buy-sheet__wallet-id">{{ loggedInUserId || '' }}</span>
          <span class="buy-sheet__wallet-balance">
            {{ t('当前余额') }}
            <strong v-if="walletLoading">{{ t('正在获取余额请稍候') }}</strong>
            <strong v-else>¥ {{ walletBalance != null ? Number(walletBalance).toFixed(2) : '--' }}</strong>
          </span>
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
    overflow: hidden;

    @include web-only {
      max-width: 440px;
      max-height: min(90vh, 820px);
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
      max-height: min(90vh, 820px);
      overflow-y: auto;
    }
  }

  /* H5：仅弹框内可滚动；PC：整块表单区滚动 */
  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @include mobile-only {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
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
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.9);
    font-size: 12px;
    color: rgba(11, 52, 98, 0.75);
    flex-shrink: 0;
  }

  &__invest-icon {
    color: #1c7bff;
    font-size: 14px;
    flex-shrink: 0;
  }

  &__invest-option {
    color: #ff2d2d;
    font-weight: 600;
  }

  &__invest-tag {
    display: inline-flex;
    margin-left: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 45, 45, 0.12);
    color: #ff2d2d;
    font-size: 11px;
    font-weight: 500;
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

  &__home-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 2px;
    min-width: 14px;
    height: 14px;
    padding: 0 2px;
    border-radius: 3px;
    background: #1c7bff;
    font-size: 9px;
    color: #fff;
    vertical-align: middle;
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
    font-weight: 600;
    color: #0b3462;
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
    font-size: 13px;
    color: rgba(11, 52, 98, 0.55);
    white-space: nowrap;
  }

  &__amount-input {
    flex: 1;
    min-width: 0;
    max-width: 100%;
    border: none;
    background: transparent;
    font-family: $font-family-num;
    font-size: 16px;
    font-weight: 600;
    color: #0b3462;
    text-align: right;
    outline: none;
    box-sizing: border-box;

    &--full {
      text-align: left;
    }

    &::placeholder {
      color: rgba(11, 52, 98, 0.35);
      font-weight: 400;
    }
  }

  &__fee {
    margin: 0 0 8px;
    font-size: 11px;
    color: #ff2d2d;
  }

  &__fee-inline {
    margin-left: 8px;
    font-size: 11px;
    color: #ff2d2d;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__chip {
    min-width: 44px;
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid rgba(214, 224, 235, 0.9);
    background: rgba(240, 247, 255, 0.9);
    color: #0b3462;
    font-family: $font-family-num;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;

    &--icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      padding: 0;
      color: #1c7bff;
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
    gap: 8px;
    padding: 8px 10px;
    border-radius: 999px;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }

  &__wallet-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__wallet-id {
    font-size: 13px;
    font-weight: 500;
    color: rgba(11, 52, 98, 0.58);
    flex-shrink: 0;
  }

  &__wallet-balance {
    margin-left: auto;
    font-size: 12px;
    color: rgba(11, 52, 98, 0.55);

    strong {
      margin-left: 4px;
      font-family: $font-family-num;
      font-size: 13px;
      font-weight: 700;
      color: #1c7bff;
    }
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

  /* H5：红边红字胶囊按钮（设计稿，在弹框外部） */
  @include mobile-only {
    &__actions--outer.norem &__cancel-btn,
    &__actions--outer.norem &__confirm-btn {
      padding: 10px 16px;
      border-radius: 999px;
      font-size: 15px;
      line-height: 1.2;
    }

    &__actions--outer.norem &__cancel-btn {
      border: 1.5px solid var(--auxiliary-2);
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
    padding: 0;
    overflow: hidden;
    border: none;
    background: transparent;
    box-shadow: none;
    gap: 0;
  }

  &__success-head {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 20px 16px 24px;
    background: linear-gradient(180deg, #1c7bff 0%, #3d94ff 100%);
    border-radius: 16px 16px 0 0;
    position: relative;
    overflow: hidden;

    &::before {
      content: 'UNIBET';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.08);
      pointer-events: none;
    }
  }

  &__success-icon {
    display: block;
    width: 64px;
    height: 56px;
    flex-shrink: 0;
    z-index: 1;
    object-fit: contain;
  }

  &__success-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    z-index: 1;
  }

  &__success-body {
    margin: 0;
    padding: 16px 14px 14px;
    border-radius: 0 0 16px 16px;
    border: 3px solid #1c7bff;
    border-top: none;
    display: flex;
    flex-direction: column;
  }

  &__success-field {
    margin-bottom: 12px;

    &--teams {
      margin-bottom: 14px;
    }
  }

  &__success-label {
    display: block;
    font-size: 11px;
    color: rgba(11, 52, 98, 0.45);
    margin-bottom: 4px;
  }

  &__success-val {
    font-size: 14px;
    font-weight: 600;
    color: #0b3462;
    word-break: break-all;
  }

  &__success-teams {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__success-team {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 8px;
    background: rgba(228, 240, 254, 0.6);
    font-size: 13px;
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

  &__home-tag--after {
    margin-right: 0;
    margin-left: 0;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    font-size: 10px;
    line-height: 1;
    vertical-align: unset;
  }

  &__success-summary {
    padding: 12px;
    border-radius: 10px;
    background: rgba(228, 240, 254, 0.55);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__success-summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: rgba(11, 52, 98, 0.65);
  }

  &__success-summary-val {
    font-family: $font-family-num;
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
