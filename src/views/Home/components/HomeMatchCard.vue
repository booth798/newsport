<script setup>
import { computed, toRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import { useCountdown } from '@/hooks/useCountdown';

import bgGridPatternUrl from '@/assets/images/events/bg_grid_pattern.svg?url';
import bgScoreDefaultUrl from '@/assets/images/events/bg_score_default.svg?url';
import bgScoreHighUrl from '@/assets/images/events/bg_score_high.svg?url';
import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const props = defineProps({
  match: {
    type: Object,
    required: true,
  },
  /** 详情模式：卡片不作为链接，而是展示用并通过 emit 交互 */
  detailMode: {
    type: Boolean,
    default: false,
  },
  /** 从联赛市场页进入详情时带上，供顶栏返回联赛列表 */
  fromLeague: {
    type: String,
    default: '',
  },
});

const router = useRouter();

const rootComponent = computed(() => (props.detailMode ? 'div' : RouterLink));
const rootBind = computed(() => {
  if (props.detailMode) return {};
  const to = { name: 'market-detail', params: { id: String(props.match.id) } };
  if (props.fromLeague) {
    to.query = { fromLeague: props.fromLeague };
  }
  return { to };
});

function onOddsPillClick(pool, e) {
  if (props.detailMode) return;
  e.preventDefault();
  e.stopPropagation();
  router.push({
    name: 'market-detail',
    params: { id: String(props.match.id) },
    query: { autoBuy: '1', score: pool.score },
  });
}

const homeScoreBg = computed(() =>
  props.match.homeScore > props.match.awayScore ? bgScoreHighUrl : bgScoreDefaultUrl,
);
const awayScoreBg = computed(() =>
  props.match.awayScore > props.match.homeScore ? bgScoreHighUrl : bgScoreDefaultUrl,
);

const LEAGUE_ICON_BY_NAME = {
  欧冠: iconChampionUrl,
  英超: iconUkUrl,
  意甲: iconItalyUrl,
  西甲: iconSpainUrl,
  德甲: iconGermaryUrl,
  法甲: iconFranceUrl,
  赛事: iconEventsUrl,
};

const leagueIconUrl = computed(() => {
  if (props.match.leagueIcon) return props.match.leagueIcon;
  return LEAGUE_ICON_BY_NAME[props.match.league] ?? iconEventsUrl;
});

const homeTeamLogoUrl = computed(() =>
  resolveTeamLogoUrl(props.match.homeTeam, props.match.homeTeamLogo),
);
const awayTeamLogoUrl = computed(() =>
  resolveTeamLogoUrl(props.match.awayTeam, props.match.awayTeamLogo),
);

const isDetailH5 = computed(() => props.detailMode && isMobile.value);

const kickoffAt = computed(() => props.match.kickoffAt);
const { text: liveCountdown, minutes: liveCountdownMinutes, isOver: countdownOver } = useCountdown(kickoffAt);

const detailCountdownLabel = computed(() => {
  if (liveCountdown.value) return liveCountdown.value;
  return '';
});

const detailMatchDate = computed(() => {
  const raw = props.match.date ?? '';
  if (/^\d{4}-/.test(raw)) return raw;
  return `2026-${raw}`;
});

const DEFAULT_POOLS = [
  { score: '1-0', probability: '--' },
  { score: '0-1', probability: '--' },
  { score: '1-1', probability: '--' },
];

const topPools = computed(() => {
  const pools = props.match.topPools;
  if (Array.isArray(pools) && pools.length) return pools.slice(0, 3);
  return DEFAULT_POOLS;
});
</script>

<template>
  <component
    :is="rootComponent"
    v-bind="rootBind"
    class="match-card"
    :class="{ 'match-card--detail': props.detailMode, 'match-card--detail-h5': isDetailH5 }"
  >
    <!-- H5: 移动端布局 -->
    <div v-if="isMobile" class="match-card__inner match-card__inner--m">
      <div v-if="isDetailH5" class="match-card__m-top match-card__m-top--detail">
        <div class="match-card__m-league-row match-card__m-league-row--detail">
          <div class="match-card__league match-card__league--detail">
            <img
              class="match-card__league-icon match-card__league-icon--detail"
              :src="leagueIconUrl"
              alt=""
              width="24"
              height="24"
              draggable="false"
            />
            <span class="match-card__league-name match-card__league-name--detail">{{ match.league }}</span>
          </div>
        </div>
        <div class="match-card__divider match-card__divider--detail" aria-hidden="true" />
        <div class="match-card__m-time-row match-card__m-time-row--detail">
          <span class="match-card__date match-card__date--detail">{{ detailMatchDate }}</span>
          <div class="match-card__pill match-card__pill--detail">
            <span class="match-card__pill-lab">
              <span class="match-card__pill-lab-keyword">{{ t('倒计时') }}</span><span class="match-card__pill-lab-sep">:</span>
            </span>
            <span class="match-card__pill-time">{{ detailCountdownLabel }}</span>
          </div>
        </div>
      </div>

      <div v-else class="match-card__m-top">
        <div class="match-card__m-league-row">
          <div class="match-card__league">
            <img
              class="match-card__league-icon"
              :src="leagueIconUrl"
              alt=""
              width="24"
              height="24"
              draggable="false"
            />
            <span class="match-card__league-name">{{ match.league }}</span>
          </div>
          <span class="match-card__enter-pill">
            <span class="match-card__enter-pill-text">{{ t('进入比赛') }}</span>
            <svg class="match-card__enter-pill-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 2.5L8 6L4.5 9.5" stroke="#1C7BFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
        <div class="match-card__divider match-card__divider--m" aria-hidden="true" />
        <div class="match-card__m-time-row">
          <span class="match-card__date">{{ match.date }}</span>
          <div class="match-card__pill match-card__pill--m">
            <span class="match-card__pill-lab">{{ t('开赛倒数') }}</span>
            <span class="match-card__pill-time">{{ liveCountdown || match.countdown }}</span>
          </div>
        </div>
      </div>

      <div class="match-card__body">
        <div class="match-card__surface match-card__surface--m">
          <div class="match-card__arena-grid">
            <img
              class="match-card__arena-bg"
              :src="bgGridPatternUrl"
              alt=""
              width="311"
              height="126"
              decoding="async"
              draggable="false"
            />
            <div class="match-card__arena-grid-inner">
              <div class="match-card__mg match-card__mg--m">
                <div class="match-card__mg-home-logo">
                  <div class="match-card__team-logo">
                    <img
                      v-if="homeTeamLogoUrl"
                      class="match-card__team-badge-img"
                      :src="homeTeamLogoUrl"
                      :alt="match.homeTeam"
                      width="72"
                      height="72"
                      decoding="async"
                      draggable="false"
                    />
                    <svg
                      v-else
                      class="match-card__team-badge-fallback"
                      viewBox="0 0 34 34"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                      <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                        {{ match.homeTeam.charAt(0) }}
                      </text>
                    </svg>
                  </div>
                </div>
                <div class="match-card__mg-away-logo">
                  <div class="match-card__team-logo">
                    <img
                      v-if="awayTeamLogoUrl"
                      class="match-card__team-badge-img"
                      :src="awayTeamLogoUrl"
                      :alt="match.awayTeam"
                      width="72"
                      height="72"
                      decoding="async"
                      draggable="false"
                    />
                    <svg
                      v-else
                      class="match-card__team-badge-fallback"
                      viewBox="0 0 34 34"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                      <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                        {{ match.awayTeam.charAt(0) }}
                      </text>
                    </svg>
                  </div>
                </div>

                <span class="match-card__team-name match-card__team-name--home"><span v-if="isDetailH5" class="match-card__home-tag">{{ t('主') }}</span>{{ match.homeTeam }}</span>
                <span class="match-card__vs">VS</span>
                <span class="match-card__team-name match-card__team-name--away">{{ match.awayTeam }}</span>
              </div>

              <div v-if="!isDetailH5" class="match-card__odds-pills">
                <div
                  v-for="pool in topPools"
                  :key="pool.score"
                  class="match-card__odds-pill"
                  role="button"
                  tabindex="0"
                  @click="onOddsPillClick(pool, $event)"
                  @keydown.enter.prevent="onOddsPillClick(pool, $event)"
                >
                  <span class="match-card__odds-pill-score">{{ pool.score }}</span>
                  <span class="match-card__odds-pill-prob">{{ pool.probability }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- PC: 桌面端布局（与移动端结构一致） -->
    <div v-else class="match-card__inner match-card__inner--w">
      <div class="match-card__m-top">
        <div class="match-card__m-league-row">
          <div class="match-card__league">
            <img
              class="match-card__league-icon"
              :src="leagueIconUrl"
              alt=""
              width="24"
              height="24"
              draggable="false"
            />
            <span class="match-card__league-name">{{ match.league }}</span>
          </div>
          <span v-if="!detailMode" class="match-card__enter-pill">
            <span class="match-card__enter-pill-text">{{ t('进入比赛') }}</span>
            <svg class="match-card__enter-pill-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 2.5L8 6L4.5 9.5" stroke="#1C7BFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
        <div class="match-card__divider" aria-hidden="true" />
        <div class="match-card__m-time-row">
          <span class="match-card__date">{{ match.date }}</span>
          <div
            class="match-card__pill match-card__pill--w"
            :class="{ 'match-card__pill--detail-w': detailMode }"
          >
            <template v-if="detailMode">
              <span class="match-card__pill-lab">
                <span class="match-card__pill-lab-keyword">{{ t('倒计时') }}</span><span class="match-card__pill-lab-sep">:</span>
              </span>
              <span class="match-card__pill-time">{{ detailCountdownLabel }}</span>
            </template>
            <template v-else>
              <span class="match-card__pill-lab">{{ t('开赛倒数') }}</span>
              <span class="match-card__pill-time">{{ liveCountdown || match.countdown }}</span>
            </template>
          </div>
        </div>
      </div>

      <div class="match-card__body">
        <div class="match-card__surface match-card__surface--w">
          <div class="match-card__arena-grid">
            <img
              class="match-card__arena-bg"
              :src="bgGridPatternUrl"
              alt=""
              width="760"
              height="340"
              decoding="async"
              draggable="false"
            />
            <div class="match-card__arena-grid-inner">
              <div class="match-card__mg match-card__mg--w">
                <div class="match-card__mg-home-logo">
                  <div class="match-card__team-logo">
                    <img
                      v-if="homeTeamLogoUrl"
                      class="match-card__team-badge-img"
                      :src="homeTeamLogoUrl"
                      :alt="match.homeTeam"
                      width="88"
                      height="88"
                      decoding="async"
                      draggable="false"
                    />
                    <svg
                      v-else
                      class="match-card__team-badge-fallback"
                      viewBox="0 0 34 34"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                      <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                        {{ match.homeTeam.charAt(0) }}
                      </text>
                    </svg>
                  </div>
                </div>
                <div class="match-card__mg-away-logo">
                  <div class="match-card__team-logo">
                    <img
                      v-if="awayTeamLogoUrl"
                      class="match-card__team-badge-img"
                      :src="awayTeamLogoUrl"
                      :alt="match.awayTeam"
                      width="88"
                      height="88"
                      decoding="async"
                      draggable="false"
                    />
                    <svg
                      v-else
                      class="match-card__team-badge-fallback"
                      viewBox="0 0 34 34"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
                      <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">
                        {{ match.awayTeam.charAt(0) }}
                      </text>
                    </svg>
                  </div>
                </div>

                <span class="match-card__team-name match-card__team-name--home">{{ match.homeTeam }}</span>
                <span class="match-card__vs">VS</span>
                <span class="match-card__team-name match-card__team-name--away">{{ match.awayTeam }}</span>
              </div>

              <div v-if="!detailMode" class="match-card__odds-pills">
                <div
                  v-for="pool in topPools"
                  :key="pool.score"
                  class="match-card__odds-pill"
                  role="button"
                  tabindex="0"
                  @click="onOddsPillClick(pool, $event)"
                  @keydown.enter.prevent="onOddsPillClick(pool, $event)"
                >
                  <span class="match-card__odds-pill-score">{{ pool.score }}</span>
                  <span class="match-card__odds-pill-prob">{{ pool.probability }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </component>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.match-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--auxiliary-1);
  border-radius: 32px;
  border: 1.5px solid rgba(255, 255, 255, 1);
  box-shadow: 0 8px 20px 0 rgba(21, 58, 118, 0.18);
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 12px 28px rgba(21, 58, 118, 0.22);
  }

  @include web-only {
    padding: 16px;
    min-height: 0;
    border-radius: 16px;
    background: #fff;
    border: 1.5px solid #fff;
    box-shadow: 0 4px 16px rgba(21, 58, 118, 0.1);

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(21, 58, 118, 0.16);
    }
  }

  @include mobile-only {
    padding: 12px;
    border-radius: 16px;
    border: 1.5px solid #fff;
    background: #fff;
    box-shadow: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  &--detail {
    cursor: default;

    @include web-only {
      .match-card__foot {
        display: flex;
        justify-content: center;
      }

      .match-card__btn {
        width: min(100%, 300px);
        max-width: 300px;
      }

      .match-card__pill--detail-w {
        gap: 4px;
        padding: 6px 12px;
        border-radius: 8px;
        background: rgba(228, 240, 254, 0.95);

        .match-card__pill-lab-keyword,
        .match-card__pill-lab-sep,
        .match-card__pill-time {
          font-size: 14px;
          font-weight: 500;
          line-height: 1;
        }

        .match-card__pill-lab-keyword {
          color: rgba(11, 52, 98, 1);
        }

        .match-card__pill-lab-sep,
        .match-card__pill-time {
          color: #1f7cff;
        }

        .match-card__pill-time {
          font-family: $font-family-num;
          font-weight: 600;
        }
      }

      &:hover {
        transform: none;
        box-shadow: 0 8px 20px 0 rgba(21, 58, 118, 0.18);
      }
    }

    @include mobile-only {
      &:hover {
        transform: none;
        box-shadow: 0 8px 20px 0 rgba(21, 58, 118, 0.18);
      }
    }
  }

  &--detail-h5 {
    @include mobile-only {
      padding: 14px 12px 12px;
      border-radius: 16px;
      background: #eaf1f9;
      border: 0.8px solid #fff;
      box-shadow: none;

      &:hover {
        transform: none;
        box-shadow: none;
      }

      .match-card__foot {
        display: flex;
        justify-content: center;
        margin-top: 10px;
        padding-top: 4px;
      }

      .match-card__btn {
        max-width: 280px;
      }

      .match-card__mg-score-slot {
        display: none;
      }

      .match-card__arena-grid-inner {
        padding: 16px 8px 12px;
      }

      .match-card__mg--m {
        row-gap: 8px;
      }

      .match-card__vs {
        font-size: 24px;
        font-weight: 700;
        color: #1c7bff;
      }

      .match-card__team-logo {
        width: 44px;
        height: 44px;
        border: 0.43px solid #e1e9f3;
      }

      .match-card__team-name {
        font-size: 14px;
        font-weight: 500;
      }

      .match-card__surface--m {
        border-radius: 16px;
        border: 0.8px solid #fff;
        background: #fff;
      }
    }
  }

  &__m-top--detail {
    @include mobile-only {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-bottom: 10px;
    }
  }

  &__m-league-row--detail {
    @include mobile-only {
      padding-bottom: 0;
    }
  }

  &__league--detail {
    @include mobile-only {
      gap: 6px;
    }
  }

  &__league-icon--detail {
    @include mobile-only {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 0.43px solid #e1e9f3;
    }
  }

  &__league-name--detail {
    @include mobile-only {
      font-size: 16px;
      font-weight: 500;
      color: #0b3462;
    }
  }

  &__divider--detail {
    @include mobile-only {
      height: 0.8px;
      margin: 10px -12px;
      background: #fff;
      border-radius: 10px;
    }
  }

  &__m-time-row--detail {
    @include mobile-only {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  &__pill--detail {
    @include mobile-only {
      flex-shrink: 0;
      width: auto;
      height: 24px;
      min-height: 24px;
      padding: 0 8px;
      gap: 2px;
      border-radius: 6px;
      background: rgba(31, 124, 255, 0.15);
      justify-content: center;
      box-sizing: border-box;

      .match-card__pill-lab-keyword {
        font-size: 12px;
        font-weight: 400;
        line-height: 1;
        color: rgba(11, 52, 98, 0.5);
      }

      .match-card__pill-lab-sep {
        font-size: 12px;
        font-weight: 400;
        line-height: 1;
        color: rgba(11, 52, 98, 0.5);
      }

      .match-card__pill-time {
        font-family: $font-family-base;
        font-size: 16px;
        font-weight: 600;
        line-height: 1;
        color: #1c7bff;
      }
    }
  }

  &__date--detail {
    @include mobile-only {
      display: block;
      font-family: $font-family-num;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
      color: #0b3462;
    }
  }

  &__enter-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: auto;
    max-width: 100%;
    border: 0.5px solid #1c7bff;
    border-radius: 16px;
    background: transparent;
    gap: 0;
    box-sizing: border-box;
    white-space: nowrap;

    @include mobile-only {
      height: 24px;
      padding: 0 8px;
    }

    @include web-only {
      height: 26px;
      padding: 0 10px;
    }
  }

  &__enter-pill-text {
    font-family: $font-family-base;
    font-weight: 400;
    line-height: 1;
    color: #1c7bff;
    white-space: nowrap;

    @include mobile-only {
      font-size: 10px;
    }

    @include web-only {
      font-size: 12px;
    }
  }

  &__enter-pill-arrow {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  &__home-tag {
    @include mobile-only {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      padding: 0;
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: #1c7bff;
      font-family: $font-family-base;
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
      color: #fff;
      vertical-align: middle;
    }
  }

  &__inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__m-top {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 0;
  }

  &__m-league-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 0;
  }

  &__m-league-row &__league {
    flex: 1;
    min-width: 0;
  }

  &__vol-header {
    display: flex;
    flex-shrink: 0;
    align-items: baseline;
    justify-content: flex-end;
    gap: 4px;
    min-width: 0;
    max-width: 55%;
  }

  &__vol-header &__vol-label {
    font-size: 12px;
    font-weight: 400;
    line-height: 1;
    color: rgba(11, 52, 98, 0.5);
    white-space: nowrap;
  }

  &__vol-header &__vol-val {
    font-family: $font-family-base;
    font-size: $font-size-md;
    font-weight: 700;
    line-height: 1;
    color: #1c7bff;
    white-space: nowrap;
  }

  &__divider {
    display: block;
    height: 1px;
    background: #e4f0fe;
    flex-shrink: 0;

    @include mobile-only {
      margin: 0;
    }

    @include web-only {
      margin-left: -16px;
      margin-right: -16px;
    }
  }

  &__m-time-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding-top: 0;
    box-sizing: border-box;
  }

  &__league {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &__league-icon {
    flex-shrink: 0;
    display: block;
    object-fit: contain;

    @include mobile-only {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 0.43px solid #e1e9f3;
    }

    @include web-only {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 0.43px solid #e1e9f3;
    }
  }

  &__league-name {
    font-family: $font-family-base;
    font-weight: 500;
    color: #0b3462;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include mobile-only {
      font-size: 16px;
    }

    @include web-only {
      font-size: $font-size-md;
      font-weight: 500;
    }
  }

  &__date {
    font-family: $font-family-num;
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    color: #0b3462;
    letter-spacing: 0;
    min-width: 0;

    @include mobile-only {
      font-size: 16px;
    }

    @include web-only {
      font-size: $font-size-md;
    }
  }

  &__pill {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(31, 124, 255, 0.2);
    box-sizing: border-box;
    min-height: 38px;

    &--m {
      width: auto;
      height: 24px;
      min-height: 24px;
      padding: 0 8px;
      gap: 4px;
      border-radius: 6px;
      background: rgba(31, 124, 255, 0.15);
      justify-content: center;
      white-space: nowrap;
    }

    &--w {
      width: auto;
      height: 26px;
      min-height: 26px;
      padding: 0 10px;
      gap: 6px;
      border-radius: 6px;
      background: rgba(31, 124, 255, 0.15);
      justify-content: center;
      white-space: nowrap;
    }
  }

  &__pill--m &__pill-lab {
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    color: #1f7cff;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__pill--m &__pill-time {
    flex-shrink: 0;
    font-family: $font-family-num;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    color: #1f7cff;
  }

  &__pill--w &__pill-lab {
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    color: #1f7cff;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__pill--w &__pill-time {
    flex-shrink: 0;
    font-family: $font-family-num;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    color: #1f7cff;
  }

  &__pill-lab {
    font-family: $font-family-base;
    font-size: 12px;
    font-weight: 500;
    font-style: normal;
    line-height: 1;
    color: #1f7cff;
  }

  &__pill-time {
    font-family: $font-family-num;
    font-size: 12px;
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    color: #1f7cff;
  }

  &__body {
    flex: 1;
    min-height: 0;

    @include mobile-only {
      margin-top: 6px;
    }

    @include web-only {
      margin-top: 6px;
    }
  }

  &__surface {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    background: #fff;

    @include mobile-only {
      border-radius: 16px;
      border: 0.8px solid #fff;
    }

    &--w {
      border-radius: 16px;
      border: 0.8px solid #fff;
    }
  }

  &__surface--m &__arena-grid-inner {
    padding: 12px 8px 8px;
  }

  &__arena-grid {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;

    @include mobile-only {
      background: #fff;
    }

    @include web-only {
      background: #fff;
    }
  }

  &__arena-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    pointer-events: none;
    max-width: none;
  }

  &__arena-grid-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding: 20px 12px 16px;

    @include web-only {
      padding: 16px 12px 12px;
    }
  }

  &__mg {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    grid-template-areas:
      'hlogo . alogo'
      'hname vs aname'
      'hscore . ascore';
    justify-items: stretch;
    align-items: center;
    column-gap: 6px;

    &--m {
      row-gap: 10px;
    }

    &--w {
      column-gap: 8px;
      row-gap: 10px;
    }
  }

  &__mg-home-logo {
    grid-area: hlogo;
    justify-self: center;
  }

  &__mg-away-logo {
    grid-area: alogo;
    justify-self: center;
  }

  &__mg-score-slot {
    display: flex;
    justify-content: center;

    &--home {
      grid-area: hscore;
    }

    &--away {
      grid-area: ascore;
    }
  }

  &__team-logo {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    margin-bottom: 0;
    overflow: hidden;
    border-radius: 50%;
    background: #fff;
    border: 0.5px solid rgb(228, 240, 254);
    box-sizing: border-box;

    @include web-only {
      width: 40px;
      height: 40px;
    }
  }

  &__team-badge-img {
    display: block;
    width: 72%;
    height: 72%;
    max-width: none;
    object-fit: contain;
    object-position: center;
  }

  &__team-badge-fallback {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__team-name {
    margin: 0;
    font-family: $font-family-base;
    font-size: $font-size-md;
    font-weight: 500;
    font-style: normal;
    line-height: 1;
    letter-spacing: 0;
    color: #0b3462;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include web-only {
      font-size: $font-size-md;
    }

    &--home {
      grid-area: hname;
    }

    &--away {
      grid-area: aname;
    }
  }

  &__vs {
    grid-area: vs;
    display: inline-block;
    justify-self: center;
    font-family: $font-family-num;
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    color: #1c7bff;
    font-size: $font-size-lg;
    transform: translateY(-100%);

    @include web-only {
      font-size: $font-size-lg;
    }
  }

  &__score {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-sizing: border-box;
    border: none;
    padding: 0;
    justify-self: center;

    &--leading .match-card__score-txt {
      color: #fff;
    }

    &--m {
      width: 32px;
      height: 26px;

      .match-card__score-txt {
        font-size: 18px;
      }
    }

  }

  &__score-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
    object-position: center;
    pointer-events: none;
    max-width: none;
  }

  &__score-txt {
    position: relative;
    z-index: 1;
    font-family: $font-family-num;
    font-weight: 600;
    font-style: normal;
    line-height: 1;
    color: #0b3462;
    letter-spacing: 0;
  }

  &__odds-pills {
    display: flex;
    justify-content: center;
    gap: 5px;
    margin-top: 8px;
    padding: 0 4px;
  }

  &__odds-pill {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 36px;
    border-radius: 8px;
    background: #e4f0fe;
    gap: 2px;
    cursor: pointer;
    transition: background 0.15s ease;

    @include mobile-only {
      max-width: 95px;
    }

    &:hover {
      background: rgba(28, 123, 255, 0.14);
    }

    &:active {
      background: rgba(28, 123, 255, 0.18);
    }
  }

  &__odds-pill-score {
    font-family: $font-family-num;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    line-height: 1;
    color: rgba(11, 52, 98, 0.5);
  }

  &__odds-pill-prob {
    font-family: $font-family-num;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    color: #0b3462;
  }

  &__foot {
    margin-top: 10px;
  }

  &__btn {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    font-size: $font-size-md;
    font-weight: 500;
    border: none;
    cursor: pointer;
    font-family: inherit;

    @include web-only {
      height: 40px;
      font-size: $font-size-md;
    }

    @include mobile-only {
      height: 36px;
    }
  }
}
</style>
