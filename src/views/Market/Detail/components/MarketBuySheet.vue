<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import avatarDefaultUrl from '@/assets/images/common/avatar_default.png?url';
import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import { useAppStore } from '@/store/modules/app';
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
const { loggedInUserId, loggedInAssetsFormatted } = storeToRefs(appStore);

const buyType = ref('standard');
const buyAmount = ref('');
const profitMin = ref('5.34');
const profitMax = ref('7.34');
const phase = ref('form');

const LEAGUE_ICON_BY_NAME = {
  欧冠: iconChampionUrl,
  英超: iconUkUrl,
  意甲: iconItalyUrl,
  西甲: iconSpainUrl,
  德甲: iconGermaryUrl,
  法甲: iconFranceUrl,
};

const leagueIconUrl = computed(() => LEAGUE_ICON_BY_NAME[props.match.league] ?? iconEventsUrl);
const homeLogoUrl = computed(() => resolveTeamLogoUrl(props.match.homeTeam, props.match.homeTeamLogo));
const awayLogoUrl = computed(() => resolveTeamLogoUrl(props.match.awayTeam, props.match.awayTeamLogo));

const profitPercent = computed(() => {
  const raw = props.row?.probability ?? '6.99%';
  return String(raw).replace(/%$/, '') || '6.99';
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

const estimatedProfitRange = computed(() => {
  const amt = Number(buyAmount.value);
  if (!Number.isFinite(amt) || amt <= 0) return '0.00~0.00';
  const p = Number(profitPercent.value) / 100;
  const min = (amt * p * 0.8).toFixed(2);
  const max = (amt * p * 1.2).toFixed(2);
  return `${min}~${max}`;
});

const successOrderNo = ref('NO.B01774853483511738');
const successAmount = ref('100.00');
const successYield = ref('2.1');
const successProfit = ref('2.00');

watch(
  () => props.visible,
  (open) => {
    if (open) {
      phase.value = 'form';
      buyType.value = 'standard';
      buyAmount.value = '';
      profitMin.value = '5.34';
      profitMax.value = '7.34';
    }
  },
);

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

function confirmBuy() {
  const amt = Number(buyAmount.value);
  successAmount.value = Number.isFinite(amt) && amt > 0 ? amt.toFixed(2) : '100.00';
  successYield.value = profitPercent.value;
  successProfit.value = (Number(successAmount.value) * (Number(successYield.value) / 100)).toFixed(2);
  successOrderNo.value = `NO.B0177485348351173${Date.now() % 1000}`;
  phase.value = 'success';
}

function goPurchaseDetails() {
  emit('close');
  router.push({
    name: 'trade-purchases',
    query: {
      tab: buyType.value === 'scheduled' ? 'scheduled' : 'ordered',
      marketId: String(props.match.id),
      score: props.row?.score ?? '0-0',
      probability: props.row?.probability,
      marketTab: props.marketTab,
      from: 'market',
    },
  });
}

function onBackdropKeydown(e) {
  if (e.key === 'Escape') closeSheet();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="buy-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="phase === 'success' ? t('交易成功') : t('买入金额')"
    >
      <div class="buy-sheet__backdrop" aria-hidden="true" @click="closeSheet" />

      <button type="button" class="buy-sheet__close" :aria-label="t('取消')" @click="closeSheet">
        <span aria-hidden="true">×</span>
      </button>

      <!-- 交易成功 -->
      <div v-if="phase === 'success'" class="buy-sheet__success">
        <div class="buy-sheet__success-head">
          <span class="buy-sheet__success-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#fff" stroke-width="2" />
              <path d="M8 14.5L12 18.5L20 10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
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
                <span class="buy-sheet__home-tag">{{ t('主') }}</span>
                {{ match.homeTeam }}
              </span>
              <span class="buy-sheet__success-team">
                <img v-if="awayLogoUrl" :src="awayLogoUrl" alt="" width="20" height="20" />
                {{ match.awayTeam }}
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
        </div>

        <button type="button" class="btn btn--default-1 buy-sheet__success-btn" @click="goPurchaseDetails">
          {{ t('前往买入明细') }}
        </button>
      </div>

      <!-- 买入表单 -->
      <div v-else class="buy-sheet__frame">
        <nav class="buy-sheet__tabs card-primary norem" :aria-label="t('买入金额')">
          <button
            type="button"
            class="buy-sheet__tab btn"
            :class="buyType === 'standard' ? 'btn--primary' : 'buy-sheet__tab--idle'"
            @click="buyType = 'standard'"
          >
            {{ t('一般买入') }}
          </button>
          <button
            type="button"
            class="buy-sheet__tab btn"
            :class="buyType === 'scheduled' ? 'btn--primary' : 'buy-sheet__tab--idle'"
            @click="buyType = 'scheduled'"
          >
            {{ t('预约买入') }}
          </button>
        </nav>

        <div class="buy-sheet__invest">
          <span class="buy-sheet__invest-icon" aria-hidden="true">◎</span>
          <span class="buy-sheet__invest-text">
            {{ t('您正在投资') }}:
            <strong class="buy-sheet__invest-option">{{ t('选项') }} {{ formatScoreOption(row?.score ?? '0-0') }}</strong>
            <span class="buy-sheet__invest-tag">{{ t(marketScopeKey) }}</span>
          </span>
        </div>

        <div class="buy-sheet__match card-default">
          <div class="buy-sheet__match-head">
            <img class="buy-sheet__match-league-icon" :src="leagueIconUrl" width="18" height="18" alt="" />
            <span class="buy-sheet__match-league">{{ match.league }}</span>
          </div>
          <p class="buy-sheet__match-date">{{ matchDateDisplay }}</p>
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

        <!-- 一般买入 -->
        <div v-if="buyType === 'standard'" class="buy-sheet__panel card-default">
          <div class="buy-sheet__panel-head">
            <span class="buy-sheet__panel-title">{{ t('交易金额') }}</span>
            <button type="button" class="buy-sheet__profit-link">{{ t('收益') }} %</button>
          </div>
          <div class="buy-sheet__formula">
            <span class="buy-sheet__formula-prefix">x {{ profitPercent }}% =</span>
            <input
              v-model="buyAmount"
              type="text"
              inputmode="decimal"
              class="buy-sheet__amount-input"
              :placeholder="t('输入金额')"
            />
          </div>
          <p class="buy-sheet__fee">{{ t('手续费') }} -5%</p>
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

        <!-- 预约买入 -->
        <div v-else class="buy-sheet__panel buy-sheet__panel--scheduled card-default">
          <div class="buy-sheet__scheduled-meta">
            <div class="buy-sheet__scheduled-row">
              <span>{{ t('尚可预约笔数') }}:</span>
              <strong>50</strong>
            </div>
            <div class="buy-sheet__scheduled-row">
              <span>{{ t('目前获利') }}%:</span>
              <strong class="buy-sheet__scheduled-profit">{{ profitPercent }}%</strong>
            </div>
            <div class="buy-sheet__scheduled-range">
              <span class="buy-sheet__scheduled-range-label">{{ t('收益区间') }}</span>
              <div class="buy-sheet__scheduled-range-inputs">
                <input v-model="profitMin" type="text" inputmode="decimal" class="buy-sheet__range-input" />
                <span class="buy-sheet__range-sep">~</span>
                <input v-model="profitMax" type="text" inputmode="decimal" class="buy-sheet__range-input" />
              </div>
            </div>
            <p class="buy-sheet__scheduled-tip">{{ t('赔率变动同意买入') }}</p>
          </div>

          <div class="buy-sheet__panel-head buy-sheet__panel-head--sub">
            <span class="buy-sheet__panel-title">{{ t('交易金额') }}</span>
          </div>
          <div class="buy-sheet__formula buy-sheet__formula--plain">
            <input
              v-model="buyAmount"
              type="text"
              inputmode="decimal"
              class="buy-sheet__amount-input buy-sheet__amount-input--full"
              :placeholder="t('输入金额')"
            />
          </div>
          <div class="buy-sheet__chips">
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount(100)">100</button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount(500)">500</button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount(1000)">1000</button>
            <button type="button" class="buy-sheet__chip" @click="setQuickAmount('all')">{{ t('全部') }}</button>
          </div>
          <p class="buy-sheet__est">
            {{ t('预估收益') }} {{ estimatedProfitRange }}
            <span class="buy-sheet__fee-inline">{{ t('手续费') }}-5%</span>
          </p>
        </div>

        <div class="buy-sheet__wallet card-primary norem">
          <img class="buy-sheet__wallet-avatar" :src="avatarDefaultUrl" alt="" width="32" height="32" />
          <span class="buy-sheet__wallet-id">{{ loggedInUserId || 'Y05741' }}</span>
          <span class="buy-sheet__wallet-balance">
            {{ t('主钱包') }}
            <strong>{{ loggedInAssetsFormatted }}</strong>
          </span>
        </div>

        <div class="buy-sheet__actions">
          <button type="button" class="btn btn--default-1 buy-sheet__cancel-btn" @click="closeSheet">
            {{ t('取消') }}
          </button>
          <button type="button" class="btn btn--primary buy-sheet__confirm-btn" @click="confirmBuy">
            {{ buyType === 'scheduled' ? t('确定预约') : t('确认') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.buy-sheet {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(11, 52, 98, 0.55);
    backdrop-filter: blur(4px);
  }

  &__close {
    position: absolute;
    top: max(12px, env(safe-area-inset-top, 0px));
    right: 16px;
    z-index: 3;
    width: 36px;
    height: 36px;
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__frame,
  &__success {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 420px;
    max-height: calc(100vh - 56px);
    overflow-y: auto;
    box-sizing: border-box;
    border-radius: 20px;
    border: 3px solid #1c7bff;
    background: linear-gradient(180deg, rgba(234, 241, 249, 0.98) 0%, rgba(227, 236, 251, 0.98) 100%);
    box-shadow: 0 12px 40px rgba(21, 58, 118, 0.28);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
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

  &__match-teams {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
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

  &__amount-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-family: $font-family-num;
    font-size: 16px;
    font-weight: 600;
    color: #0b3462;
    text-align: right;
    outline: none;

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
    font-size: 13px;
    text-align: center;
    color: #0b3462;
    outline: none;
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
    padding-top: 2px;
  }

  &__cancel-btn,
  &__confirm-btn {
    flex: 1;
    min-height: 44px;
    font-size: 15px;
    font-weight: 600;
  }

  &__cancel-btn {
    border: 1.5px solid #1c7bff;
    color: #1c7bff;
    background: #fff;
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
    display: flex;
    z-index: 1;
  }

  &__success-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    z-index: 1;
  }

  &__success-body {
    margin: 0;
    padding: 16px 14px;
    border-radius: 0 0 16px 16px;
    border: 3px solid #1c7bff;
    border-top: none;
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
      border-radius: 50%;
      object-fit: contain;
    }
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
    width: calc(100% - 24px);
    margin: 12px auto 14px;
    min-height: 44px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 600;
  }
}
</style>
