<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';

import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import iconChevronDownUrl from '@/assets/images/common/icon_drawer_section_chevron_down.svg?url';
import iconChevronUpUrl from '@/assets/images/common/icon_drawer_section_chevron_up.svg?url';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
  expanded: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle']);

const { t } = useI18n();
const toast = useToast();

const LEAGUE_ICON_BY_NAME = {
  欧冠: iconChampionUrl,
  英超: iconUkUrl,
  意甲: iconItalyUrl,
  西甲: iconSpainUrl,
  德甲: iconGermaryUrl,
  法甲: iconFranceUrl,
};

const leagueIconUrl = computed(() => LEAGUE_ICON_BY_NAME[props.order.league] ?? iconEventsUrl);
const homeLogoUrl = computed(() => resolveTeamLogoUrl(props.order.homeTeam));
const awayLogoUrl = computed(() => resolveTeamLogoUrl(props.order.awayTeam));
const chevronSrc = computed(() => (props.expanded ? iconChevronUpUrl : iconChevronDownUrl));

const statusClass = computed(() => `purchase-card__status--${props.order.statusTone}`);

const summaryProfitLabelKey = computed(() => {
  const key = props.order.statusKey;
  if (key === '待开奖' || key === '预约中') return '预估盈利';
  return '盈利';
});

const showCancelAction = computed(() => props.order.canCancel);

async function copyOrderNo() {
  try {
    await navigator.clipboard.writeText(props.order.orderNo);
    toast.success(t('复制成功'));
  } catch {
    toast.error(t('复制失败'));
  }
}
</script>

<template>
  <article class="purchase-card" :class="{ 'purchase-card--expanded': expanded }">
    <header class="purchase-card__head">
      <div class="purchase-card__head-left">
        <span class="purchase-card__platform">{{ order.platform }}</span>
        <span class="purchase-card__date">{{ order.dateShort }}</span>
      </div>
      <span class="purchase-card__status" :class="statusClass">{{ t(order.statusKey) }}</span>
    </header>

    <div class="purchase-card__head-divider" aria-hidden="true" />

    <div class="purchase-card__panel">
      <div class="purchase-card__league">
      <img class="purchase-card__league-icon" :src="leagueIconUrl" width="18" height="18" alt="" />
      <span class="purchase-card__league-name">{{ order.league }}</span>
      </div>

      <div class="purchase-card__arena">
      <div class="purchase-card__arena-grid">
        <div class="purchase-card__arena-inner">
          <div class="purchase-card__team purchase-card__team--home">
          <img
            v-if="homeLogoUrl"
            class="purchase-card__team-logo"
            :src="homeLogoUrl"
            :alt="order.homeTeam"
            width="48"
            height="48"
            decoding="async"
            draggable="false"
          />
          <span v-else class="purchase-card__team-placeholder" aria-hidden="true" />
          <p class="purchase-card__team-name purchase-card__team-name--home">
            {{ order.homeTeam }}
            <span class="purchase-card__home-tag">{{ t('主') }}</span>
          </p>
        </div>
        <span class="purchase-card__vs">VS</span>
        <div class="purchase-card__team purchase-card__team--away">
          <img
            v-if="awayLogoUrl"
            class="purchase-card__team-logo"
            :src="awayLogoUrl"
            :alt="order.awayTeam"
            width="48"
            height="48"
            decoding="async"
            draggable="false"
          />
          <span v-else class="purchase-card__team-placeholder" aria-hidden="true" />
          <p class="purchase-card__team-name">{{ order.awayTeam }}</p>
          </div>
        </div>
        </div>
      </div>

      <div class="purchase-card__summary">
        <div class="purchase-card__summary-row">
          <span class="purchase-card__summary-label">{{ t('交易金额') }}</span>
          <span class="purchase-card__summary-val purchase-card__summary-val--amount">{{ order.tradeAmountFormatted }}</span>
        </div>
        <div class="purchase-card__summary-row">
          <span class="purchase-card__summary-label">{{ t(summaryProfitLabelKey) }}</span>
          <span class="purchase-card__summary-val purchase-card__summary-val--profit">{{ order.profitFormatted }}</span>
        </div>
      </div>

      <div v-if="!expanded" class="purchase-card__panel-foot">
        <button v-if="showCancelAction" type="button" class="purchase-card__cancel" @click.stop>
          {{ t('取消订单') }}
        </button>
        <button
          type="button"
          class="purchase-card__toggle purchase-card__toggle--circle"
          :class="{ 'purchase-card__toggle--solo': !showCancelAction }"
          :aria-expanded="expanded"
          @click="emit('toggle')"
        >
          <img class="purchase-card__chevron" :src="chevronSrc" width="20" height="20" alt="" />
        </button>
      </div>
    </div>

    <div v-if="expanded" class="purchase-card__detail">
      <div class="purchase-card__detail-rows">
        <div class="purchase-card__detail-row">
          <span class="purchase-card__detail-label">{{ t('订单号码') }}</span>
          <span class="purchase-card__detail-val purchase-card__detail-val--order">
            <span class="purchase-card__order-no">{{ order.orderNo }}</span>
            <button type="button" class="purchase-card__copy" :aria-label="t('复制')" @click.stop="copyOrderNo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="4.5" y="4.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2" />
              </svg>
            </button>
          </span>
        </div>
        <div class="purchase-card__detail-row">
          <span class="purchase-card__detail-label">{{ t('交易时间') }}</span>
          <span class="purchase-card__detail-val">{{ order.tradeTime }}</span>
        </div>
        <div class="purchase-card__detail-row">
          <span class="purchase-card__detail-label">{{ t('投注市场') }}</span>
          <span class="purchase-card__detail-val">{{ order.marketLabel }}</span>
        </div>
        <div class="purchase-card__detail-row">
          <span class="purchase-card__detail-label">{{ t('金额') }}</span>
          <span class="purchase-card__detail-val">{{ order.betAmountFormatted }}</span>
        </div>
        <div class="purchase-card__detail-row purchase-card__detail-row--last">
          <span class="purchase-card__detail-label">{{ t('预估回报') }}</span>
          <span class="purchase-card__detail-val purchase-card__detail-val--return">{{ order.estimatedProfitFormatted }}</span>
        </div>
      </div>

      <div class="purchase-card__detail-foot">
        <button v-if="showCancelAction" type="button" class="purchase-card__cancel" @click.stop>
          {{ t('取消订单') }}
        </button>
        <button
          type="button"
          class="purchase-card__toggle purchase-card__toggle--circle purchase-card__toggle--foot"
          :aria-expanded="expanded"
          @click="emit('toggle')"
        >
          <img class="purchase-card__chevron" :src="chevronSrc" width="20" height="20" alt="" />
        </button>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.purchase-card {
  position: relative;
  box-sizing: border-box;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  background: linear-gradient(180deg, #f8fbff 0%, #f0f7ff 100%);
  box-shadow: 0 6px 20px 0 rgba(21, 58, 118, 0.1);

  @include mobile-only {
    padding: 12px;
    border-radius: 16px;
    border: 0.8px solid var(--auxiliary-1);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 0;
  }

  &__head-divider {
    height: 1px;
    margin: 10px 0 12px;
    background: #fff;

    @include mobile-only {
      margin: 8px 0 10px;
      background: rgba(11, 52, 98, 0.08);
    }
  }

  &__panel {
    position: relative;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid #fff;
    border-radius: 16px;
    background: #fff;
    overflow: hidden;

    @include mobile-only {
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
    }
  }

  &__panel-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    min-height: 36px;

    @include mobile-only {
      margin-top: 8px;
    }
  }

  &__head-left {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  &__platform {
    font-family: $font-family-base;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    color: #0b3462;
    white-space: nowrap;
  }

  &__date {
    font-family: $font-family-num;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    color: rgba(11, 52, 98, 0.45);
    white-space: nowrap;
  }

  &__status {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;

    &--pending {
      color: #1c7bff;
      background: rgba(28, 123, 255, 0.12);
      border-radius: 6px;
    }

    &--completed {
      color: rgba(11, 52, 98, 0.55);
      background: rgba(11, 52, 98, 0.1);
    }

    &--lost {
      color: #ff2d2d;
      background: rgba(255, 45, 45, 0.12);
    }

    &--scheduled {
      color: #fb5c0d;
      background: rgba(251, 92, 13, 0.14);
    }
  }

  &__league {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }

  &__league-icon {
    display: block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  &__league-name {
    font-family: $font-family-base;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    color: #0b3462;
  }

  &__arena {
    margin-bottom: 12px;
    border-radius: 16px;
    overflow: hidden;
  }

  &__arena-grid {
    position: relative;
    overflow: hidden;
    min-height: 118px;
    background-color: #f3f8ff;
    background-image: url('@/assets/images/events/bg_score.svg');
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;

    @include mobile-only {
      min-height: 100px;
    }
  }

  &__arena-inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    min-height: 118px;
    padding: 14px 10px 12px;
    box-sizing: border-box;

    @include mobile-only {
      min-height: 100px;
      padding: 10px 8px;
    }
  }

  &__team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;

  }

  &__team-name--home {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__team-logo,
  &__team-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: contain;
    flex-shrink: 0;

    @include mobile-only {
      width: 40px;
      height: 40px;
    }
  }

  &__team-placeholder {
    display: block;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(228, 240, 254, 0.95);
  }

  &__team-name {
    margin: 0;
    font-family: $font-family-base;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    color: #0b3462;
    text-align: center;
    word-break: break-word;
  }

  &__home-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    border-radius: 3px;
    background: #1c7bff;
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
    color: #fff;
  }

  &__vs {
    font-family: $font-family-base;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    color: #1c7bff;
    flex-shrink: 0;
    align-self: center;
  }

  &__summary {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(228, 240, 254, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.85);

    @include mobile-only {
      padding: 10px 12px;
      border-radius: 10px;
      background: #ebf2f9;
      border: none;
    }
  }

  &__summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 0;

    &:first-child {
      padding-bottom: 10px;
      margin-bottom: 2px;
      border-bottom: 1px solid #fff;

      @include mobile-only {
        border-bottom-color: rgba(11, 52, 98, 0.08);
      }
    }
  }

  &__summary-label,
  &__detail-label {
    font-family: $font-family-base;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.2;
    color: rgba(11, 52, 98, 0.55);
  }

  &__summary-val {
    font-family: $font-family-num;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    color: #0b3462;

    &--profit {
      color: #1c7bff;
      font-size: 18px;
      font-weight: 700;
    }
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      opacity: 0.72;
    }

    &--circle {
      width: 32px;
      height: 32px;
      border: 1px solid rgba(28, 123, 255, 0.28);
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 4px rgba(21, 58, 118, 0.08);
    }

    &--foot,
    &--solo {
      margin-left: auto;
    }
  }

  &__chevron {
    display: block;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    pointer-events: none;
  }

  &__detail {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
    padding: 14px;
    border-radius: 14px;
    background: rgba(240, 247, 255, 0.6);
    border: 1px solid rgba(228, 240, 254, 0.9);

    @include mobile-only {
      gap: 0;
      margin-top: 8px;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
    }
  }

  &__detail-rows {
    @include mobile-only {
      display: flex;
      flex-direction: column;
    }
  }

  &__detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;

    @include mobile-only {
      min-height: 40px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(11, 52, 98, 0.1);

      &--last {
        border-bottom: none;
      }
    }
  }

  &__detail-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    padding-top: 2px;
  }

  &__detail-val {
    font-family: $font-family-num;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
    color: #0b3462;
    text-align: right;
    min-width: 0;
    word-break: break-all;

    &--order {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    &--profit,
    &--return {
      color: #1c7bff;
      font-weight: 600;
    }
  }

  &__order-no {
    font-size: 12px;
  }

  &__copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #1c7bff;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: rgba(28, 123, 255, 0.08);
    }
  }

  &__cancel {
    flex-shrink: 0;
    padding: 8px 16px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 45, 45, 0.1);
    color: #ff2d2d;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.2;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 45, 45, 0.16);
    }

    @include mobile-only {
      padding: 6px 14px;
      font-size: 13px;
    }
  }

}
</style>
