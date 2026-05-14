<script setup>
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

defineProps({
  match: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <RouterLink :to="`/market/${match.id}`" class="match-card">
    <!-- H5：联赛+成交量一行；日期+倒数一行；对阵区；按钮 -->
    <div v-if="isMobile" class="match-card__inner match-card__inner--m">
      <div class="match-card__m-r1">
        <div class="match-card__league">
          <span class="match-card__league-dot" aria-hidden="true" />
          <span class="match-card__league-name">{{ match.league }}</span>
        </div>
        <div class="match-card__vol-line">
          <span class="match-card__vol-line-label">{{ t('总成交量') }}:</span>
          <span class="match-card__vol-line-val">{{ match.volume }}</span>
        </div>
      </div>
      <div class="match-card__m-r2">
        <span class="match-card__date">{{ match.date }}</span>
        <div class="match-card__pill">
          <span class="match-card__pill-lab">{{ t('开赛倒数') }}</span>
          <span class="match-card__pill-time">{{ match.countdown }}</span>
        </div>
      </div>

      <div class="match-card__arena">
        <div class="match-card__versus">
          <div class="match-card__team">
            <div class="match-card__team-logo">
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
                <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                  {{ match.homeTeam.charAt(0) }}
                </text>
              </svg>
            </div>
            <span class="match-card__team-name">{{ match.homeTeam }}</span>
            <span class="match-card__score match-card__score--skew match-card__score--home">{{ match.homeScore }}</span>
          </div>

          <div class="match-card__vs-col">
            <span class="match-card__vs">VS</span>
          </div>

          <div class="match-card__team">
            <div class="match-card__team-logo">
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
                <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                  {{ match.awayTeam.charAt(0) }}
                </text>
              </svg>
            </div>
            <span class="match-card__team-name">{{ match.awayTeam }}</span>
            <span class="match-card__score match-card__score--skew match-card__score--away">{{ match.awayScore }}</span>
          </div>
        </div>
      </div>

      <div class="match-card__foot">
        <span class="btn btn--primary match-card__btn">{{ t('进入市场') }}</span>
      </div>
    </div>

    <!-- PC：左联赛+日期 / 右倒数；居中成交量；对阵；按钮 -->
    <div v-else class="match-card__inner match-card__inner--w">
      <div class="match-card__w-top">
        <div class="match-card__w-left">
          <div class="match-card__league">
            <span class="match-card__league-dot" aria-hidden="true" />
            <span class="match-card__league-name">{{ match.league }}</span>
          </div>
          <div class="match-card__date match-card__date--w">{{ match.date }}</div>
        </div>
        <div class="match-card__count-pill">
          <span class="match-card__count-pill-lab">{{ t('开赛倒计时') }}</span>
          <span class="match-card__count-pill-time">{{ match.countdown }}</span>
        </div>
      </div>

      <div class="match-card__w-volume">
        <span class="match-card__vol-label">{{ t('总成交量') }}:</span>
        <span class="match-card__vol-val">{{ match.volume }}</span>
      </div>

      <div class="match-card__arena match-card__arena--w">
        <div class="match-card__versus match-card__versus--w">
          <div class="match-card__team">
            <div class="match-card__team-logo">
              <svg width="44" height="44" viewBox="0 0 34 34" fill="none">
                <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                  {{ match.homeTeam.charAt(0) }}
                </text>
              </svg>
            </div>
            <span class="match-card__team-name">{{ match.homeTeam }}</span>
            <span class="match-card__score match-card__score--home">{{ match.homeScore }}</span>
          </div>

          <div class="match-card__vs-col">
            <span class="match-card__vs">VS</span>
          </div>

          <div class="match-card__team">
            <div class="match-card__team-logo">
              <svg width="44" height="44" viewBox="0 0 34 34" fill="none">
                <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                  {{ match.awayTeam.charAt(0) }}
                </text>
              </svg>
            </div>
            <span class="match-card__team-name">{{ match.awayTeam }}</span>
            <span class="match-card__score match-card__score--away">{{ match.awayScore }}</span>
          </div>
        </div>
      </div>

      <div class="match-card__foot">
        <span class="btn btn--primary match-card__btn">{{ t('进入市场') }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.match-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--auxiliary-1);
  border-radius: 32px;
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(21, 58, 119, 0.16);
  }

  @include web-only {
    padding: 20px;
    min-height: 0;
  }

  @include mobile-only {
    padding: 12px;
    border-radius: 16px;
  }

  &__inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__m-r1,
  &__m-r2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__m-r1 {
    margin-bottom: 8px;
  }

  &__m-r2 {
    margin-bottom: 10px;
  }

  &__league {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &__league-dot {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #fff, #1c7bff 45%, #0d5fd6 100%);
    box-shadow: 0 0 0 1px rgba(228, 240, 254, 0.9);
  }

  &__league-name {
    font-size: $font-size-md;
    font-weight: 600;
    color: var(--theme-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include web-only {
      font-size: $font-size-lg;
    }
  }

  &__vol-line {
    flex-shrink: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    font-size: $font-size-sm;
  }

  &__vol-line-label {
    color: var(--theme-primary);
    font-weight: 500;
  }

  &__vol-line-val {
    color: var(--theme-primary);
    font-weight: 700;
    font-family: $font-family-num;
  }

  &__date {
    font-family: $font-family-num;
    font-size: $font-size-md;
    font-weight: 700;
    color: var(--theme-text);
  }

  &__pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(31, 124, 255, 0.12);
    flex-shrink: 0;
  }

  &__pill-lab,
  &__pill-time {
    font-size: $font-size-xs;
    font-weight: 600;
    color: #1f7cff;
  }

  &__w-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }

  &__w-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  &__date--w {
    font-size: $font-size-lg;
  }

  &__count-pill {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(31, 124, 255, 0.12);
  }

  &__count-pill-lab {
    font-size: $font-size-sm;
    font-weight: 500;
    color: #1f7cff;
  }

  &__count-pill-time {
    font-size: $font-size-sm;
    font-weight: 700;
    color: #1f7cff;
    font-family: $font-family-num;
  }

  &__w-volume {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    margin-bottom: 16px;
  }

  &__vol-label {
    font-size: $font-size-md;
    color: var(--theme-text);
    opacity: 0.5;
  }

  &__vol-val {
    font-size: 22px;
    font-weight: 700;
    color: var(--theme-primary);
    font-family: $font-family-num;
  }

  &__arena {
    flex: 1;
    border-radius: 12px;
    border: 1px solid var(--theme-divider);
    padding: 10px;
    background:
      linear-gradient(180deg, rgba(240, 247, 255, 0.65) 0%, rgba(255, 255, 255, 0.9) 100%),
      repeating-linear-gradient(
        -18deg,
        transparent,
        transparent 10px,
        rgba(228, 240, 254, 0.35) 10px,
        rgba(228, 240, 254, 0.35) 11px
      );

    @include web-only {
      &--w {
        border-radius: 24px;
        padding: 16px;
      }
    }
  }

  &__versus {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;

    &--w {
      gap: 12px;
    }
  }

  &__team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  &__team-logo {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__team-name {
    font-size: $font-size-sm;
    font-weight: 500;
    color: var(--theme-text);
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include web-only {
      font-size: $font-size-base;
    }
  }

  &__vs-col {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__vs {
    font-family: $font-family-num;
    font-weight: 800;
    color: var(--theme-primary);
    font-size: $font-size-lg;

    @include web-only {
      font-size: 24px;
    }
  }

  &__score {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 28px;
    padding: 0 8px;
    border-radius: 6px;
    font-family: $font-family-num;
    font-weight: 800;
    font-size: $font-size-lg;

    @include web-only {
      width: 50px;
      height: 36px;
      font-size: 26px;
      border-radius: 8px;
    }

    &--skew {
      transform: skewX(-8deg);
      border-radius: 4px;

      @include web-only {
        transform: none;
      }
    }

    &--home {
      background: #1f7cff;
      color: #fff;
    }

    &--away {
      background: rgba(228, 240, 254, 0.95);
      color: var(--theme-text);
    }
  }

  &__foot {
    margin-top: 10px;

    @include web-only {
      margin-top: 16px;
    }
  }

  &__btn {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: $font-size-md;
    font-weight: 500;

    @include web-only {
      height: 48px;
      font-size: $font-size-lg;
    }

    @include mobile-only {
      height: 36px;
    }
  }
}
</style>
