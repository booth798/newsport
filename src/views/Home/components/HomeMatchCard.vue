<script setup>
import { computed, toRef } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import { useCountdown } from '@/hooks/useCountdown';

import bgGridPatternUrl from '@/assets/images/events/bg_grid_pattern.svg?url';
import bgMatchDetailHeroH5Url from '@/assets/images/events/bg_match_detail_hero_h5.png';
import bgMatchDetailHeroPcUrl from '@/assets/images/events/bg_match_detail_hero_pc.png';
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

const emit = defineEmits(['open-purchase']);

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
  const query = {};
  if (props.fromLeague) query.fromLeague = props.fromLeague;
  // 首页/市场卡点赔率：只进比赛详情，不自动弹购买窗（PC / H5 一致）
  router.push({
    name: 'market-detail',
    params: { id: String(props.match.id) },
    ...(Object.keys(query).length ? { query } : {}),
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
  // Figma 详情英雄：完整「YYYY-MM-DD HH:mm」
  const raw = props.match.kickoffAt;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    }
  }
  const fallback = props.match.date ?? '';
  if (/^\d{4}-/.test(fallback)) return fallback;
  return fallback ? `2026-${fallback}` : '';
});

/** H5 列表开赛时间：对齐 Figma「03-19 02:30」 */
const listKickoffLabel = computed(() => {
  const raw = props.match.kickoffAt;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${mm}-${dd} ${hh}:${mi}`;
    }
  }
  return props.match.date || '';
});

const DEFAULT_POOLS = [
  { score: '0:0', probability: '--' },
  { score: '0:1', probability: '--' },
  { score: '0:2', probability: '--' },
];

const topPools = computed(() => {
  const pools = props.match.topPools;
  if (Array.isArray(pools) && pools.length) return pools.slice(0, 3);
  return DEFAULT_POOLS;
});

/** 比分展示：H5 列表跟 Figma 用连字符；其它场景跟安卓用冒号 */
function formatPoolScore(score) {
  const raw = String(score ?? '');
  if (isMobile.value && !props.detailMode) return raw.replace(':', '-');
  return raw.replace('-', ':');
}
</script>

<template>
  <component
    :is="rootComponent"
    v-bind="rootBind"
    class="match-card"
    :class="{ 'match-card--detail': props.detailMode, 'match-card--detail-h5': isDetailH5 }"
  >
    <!-- 比赛详情：H5 / PC 分别使用设计稿提供的原始头图。 -->
    <div v-if="props.detailMode" class="match-card__detail-hero">
      <picture>
        <source media="(min-width: 751px)" :srcset="bgMatchDetailHeroPcUrl" />
        <img
          class="match-card__detail-hero-bg"
          :src="bgMatchDetailHeroH5Url"
          alt=""
          width="1077"
          height="471"
          decoding="async"
          draggable="false"
        />
      </picture>
      <div class="match-card__detail-hero-body">
        <div class="match-card__detail-hero-top">
          <div class="match-card__detail-hero-league">
            <img
              class="match-card__detail-hero-league-icon"
              :src="leagueIconUrl"
              alt=""
              width="20"
              height="20"
              draggable="false"
            />
            <div class="match-card__detail-hero-league-meta">
              <span class="match-card__detail-hero-league-name">{{ match.league }}</span>
              <span class="match-card__detail-hero-date">
                {{ isMobile ? detailMatchDate : listKickoffLabel }}
              </span>
            </div>
          </div>
          <div class="match-card__detail-hero-countdown">
            <span class="match-card__detail-hero-countdown-lab">{{ t('倒计时') }}:</span>
            <span class="match-card__detail-hero-countdown-num">{{ detailCountdownLabel }}</span>
          </div>
        </div>

        <div class="match-card__detail-hero-teams">
          <div class="match-card__detail-hero-side match-card__detail-hero-side--home">
            <div class="match-card__detail-hero-logo">
              <img
                v-if="homeTeamLogoUrl"
                class="match-card__detail-hero-logo-img"
                :src="homeTeamLogoUrl"
                :alt="match.homeTeam"
                width="72"
                height="72"
                decoding="async"
                draggable="false"
              />
              <span v-else class="match-card__detail-hero-logo-fallback">{{ match.homeTeam.charAt(0) }}</span>
            </div>
            <div class="match-card__detail-hero-name-row">
              <span class="match-card__detail-hero-name">{{ match.homeTeam }}</span>
              <span class="match-card__detail-hero-home-tag">{{ t('主') }}</span>
            </div>
          </div>

          <span class="match-card__detail-hero-vs">VS</span>

          <div class="match-card__detail-hero-side match-card__detail-hero-side--away">
            <div class="match-card__detail-hero-logo">
              <img
                v-if="awayTeamLogoUrl"
                class="match-card__detail-hero-logo-img"
                :src="awayTeamLogoUrl"
                :alt="match.awayTeam"
                width="72"
                height="72"
                decoding="async"
                draggable="false"
              />
              <span v-else class="match-card__detail-hero-logo-fallback">{{ match.awayTeam.charAt(0) }}</span>
            </div>
            <div class="match-card__detail-hero-name-row">
              <span class="match-card__detail-hero-name">{{ match.awayTeam }}</span>
            </div>
          </div>
        </div>

        <button
          v-if="!isMobile"
          type="button"
          class="match-card__detail-hero-button btn btn--primary"
          @click="emit('open-purchase')"
        >
          {{ t('进入比赛') }}
        </button>
      </div>
    </div>

    <!-- H5: 移动端列表卡片布局 -->
    <div v-else-if="isMobile" class="match-card__inner match-card__inner--m">
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
            <span class="match-card__enter-pill">
              <span class="match-card__enter-pill-text">{{ t('进入比赛') }}</span>
              <svg class="match-card__enter-pill-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 2.5L8 6L4.5 9.5" stroke="#1C7BFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          <div class="match-card__divider match-card__divider--m" aria-hidden="true" />
          <div class="match-card__m-time-row">
            <span class="match-card__date">{{ listKickoffLabel }}</span>
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

                  <span class="match-card__team-name match-card__team-name--home">
                    <span class="match-card__team-name-text">{{ match.homeTeam }}</span>
                    <!-- 市场列表：主/客贴队名旁，避免占下方结算比分位 -->
                    <span class="match-card__side-tag match-card__side-tag--home">{{ t('主') }}</span>
                  </span>
                  <span class="match-card__vs">VS</span>
                  <span class="match-card__team-name match-card__team-name--away">
                    <span class="match-card__team-name-text">{{ match.awayTeam }}</span>
                    <span class="match-card__side-tag match-card__side-tag--away">{{ t('客') }}</span>
                  </span>
                </div>

                <div class="match-card__odds-pills">
                  <div
                    v-for="pool in topPools"
                    :key="pool.score"
                    class="match-card__odds-pill"
                    role="button"
                    tabindex="0"
                    @click="onOddsPillClick(pool, $event)"
                    @keydown.enter.prevent="onOddsPillClick(pool, $event)"
                  >
                    <span class="match-card__odds-pill-score">{{ formatPoolScore(pool.score) }}</span>
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

                <span class="match-card__team-name match-card__team-name--home">
                  <span class="match-card__team-name-text">{{ match.homeTeam }}</span>
                  <!-- PC 市场列表：主/客贴队名旁 -->
                  <span v-if="!detailMode" class="match-card__side-tag match-card__side-tag--home">{{ t('主') }}</span>
                </span>
                <span class="match-card__vs">VS</span>
                <span class="match-card__team-name match-card__team-name--away">
                  <span class="match-card__team-name-text">{{ match.awayTeam }}</span>
                  <span v-if="!detailMode" class="match-card__side-tag match-card__side-tag--away">{{ t('客') }}</span>
                </span>
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
                  <span class="match-card__odds-pill-score">{{ formatPoolScore(pool.score) }}</span>
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
      padding: 0;
      border: none;
      border-radius: 32px;
      background: transparent;
      box-shadow: 0 8px 20px rgba(21, 58, 118, 0.18);

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
      padding: 0;
      border-radius: 16px;
      background: transparent;
      border: none;
      box-shadow: none;
      overflow: hidden;

      &:hover {
        transform: none;
        box-shadow: none;
      }
    }
  }

  /* 比赛详情英雄卡：素材比例与 H5 / PC 设计槽位一一对应。 */
  &__detail-hero {
    position: relative;
    display: block;
    width: 100%;
    overflow: hidden;
    isolation: isolate;

    @include mobile-only {
      aspect-ratio: 1077 / 471;
      border-radius: 16px;
    }

    @include web-only {
      aspect-ratio: 2400 / 882;
      border-radius: 32px;
    }
  }

  &__detail-hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: block;
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
    object-position: center;
    pointer-events: none;
  }

  &__detail-hero-body {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    @include mobile-only {
      gap: 8px;
      padding: 12px 12px 10px;
    }

    @include web-only {
      gap: 8px;
      padding: 22px 28px 20px;
    }
  }

  &__detail-hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;

    @include web-only {
      justify-content: center;
      min-height: 40px;
    }
  }

  &__detail-hero-league {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;

    @include web-only {
      justify-content: center;
      text-align: center;
    }
  }

  &__detail-hero-league-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    border-radius: 50%;
    object-fit: contain;
    background: rgba(255, 255, 255, 0.92);

    @include web-only {
      display: none;
    }
  }

  &__detail-hero-league-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    @include web-only {
      gap: 8px;
    }
  }

  &__detail-hero-league-name {
    font-family: $font-family-base;
    font-weight: 600;
    line-height: 1.2;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include mobile-only {
      font-size: 14px;
    }

    @include web-only {
      font-size: 18px;
    }
  }

  &__detail-hero-date {
    font-family: $font-family-num;
    font-weight: 400;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.88);
    white-space: nowrap;

    @include mobile-only {
      font-size: 12px;
    }

    @include web-only {
      font-size: 16px;
    }
  }

  &__detail-hero-countdown {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    box-sizing: border-box;
    white-space: nowrap;
    color: #fff;

    @include mobile-only {
      position: absolute;
      top: 29px;
      right: 0;
      height: 24px;
      padding: 0 10px;
      border-radius: 10px 0 0 10px;
      background: rgba(255, 255, 255, 0.55);
    }

    @include web-only {
      position: absolute;
      top: 44px;
      right: 20px;
      height: 34px;
      padding: 0 14px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.25);
    }
  }

  &__detail-hero-countdown-lab,
  &__detail-hero-countdown-num {
    line-height: 1;
    color: #fff;
  }

  &__detail-hero-countdown-lab {
    font-family: $font-family-base;
    font-weight: 400;

    @include mobile-only {
      font-size: 12px;
    }

    @include web-only {
      font-size: 14px;
    }
  }

  &__detail-hero-countdown-num {
    font-family: $font-family-num;
    font-weight: 600;

    @include mobile-only {
      font-size: 12px;
    }

    @include web-only {
      font-size: 16px;
    }
  }

  &__detail-hero-teams {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    flex: 1;

    @include mobile-only {
      column-gap: 8px;
    }

    @include web-only {
      width: 100%;
      margin: 0 auto;
      column-gap: 18px;
    }
  }

  &__detail-hero-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;

    @include mobile-only {
      gap: 6px;
    }

    @include web-only {
      gap: 8px;
    }
  }

  &__detail-hero-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #fff;
    box-sizing: border-box;
    overflow: hidden;

    @include mobile-only {
      width: 48px;
      height: 48px;
    }

    @include web-only {
      width: 62px;
      height: 62px;
    }
  }

  &__detail-hero-logo-img {
    display: block;
    width: 72%;
    height: 72%;
    object-fit: contain;
  }

  &__detail-hero-logo-fallback {
    font-family: $font-family-base;
    font-size: 18px;
    font-weight: 600;
    color: #1c7bff;
  }

  &__detail-hero-name-row {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    max-width: 100%;
    min-width: 0;
  }

  &__detail-hero-name {
    font-family: $font-family-base;
    font-weight: 500;
    line-height: 1.2;
    color: #fff;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include mobile-only {
      font-size: 13px;
    }

    @include web-only {
      font-size: 16px;
    }
  }

  &__detail-hero-home-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    background: #1c7bff;
    font-family: $font-family-base;
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
    color: #fff;
  }

  &__detail-hero-vs {
    align-self: start;
    font-family: $font-family-num;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-align: center;

    @include mobile-only {
      margin-top: 41px;
      font-size: 22px;
    }

    @include web-only {
      margin-top: 58px;
      font-size: 40px;
    }
  }

  &__detail-hero-button {
    @include web-only {
      width: 300px;
      height: 40px;
      margin: 0 auto;
      padding: 0;

      &:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
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

  // 市场列表主/客角标（H5 / PC 共用，贴在队名旁）
  &__side-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    font-family: $font-family-base;
    font-size: 10px;
    font-weight: 400;
    line-height: 1;
    color: #fff;

    &--home {
      background: #1c7bff;
    }

    &--away {
      background: rgba(11, 52, 98, 0.5);
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
      border: 1px solid #e4f0fe;
    }

    &--w {
      border-radius: 16px;
      border: 0.8px solid #fff;
    }
  }

  &__surface--m &__arena-grid-inner {
    padding: 7px 8px 8px;
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
    // 主/客已贴队名；第三行留给结算比分，不再放角标
    grid-template-rows: auto auto;
    grid-template-areas:
      'hlogo . alogo'
      'hname vs aname';
    justify-items: stretch;
    align-items: center;
    column-gap: 6px;

    &--m {
      row-gap: 8px;
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

    @include mobile-only {
      width: 44px;
      height: 44px;
      border: 0.5px solid #e4f0fe;
    }

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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    max-width: 100%;
    min-width: 0;
    font-family: $font-family-base;
    font-size: $font-size-md;
    font-weight: 500;
    font-style: normal;
    line-height: 1;
    letter-spacing: 0;
    color: #0b3462;
    text-align: center;

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

  &__team-name-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__vs {
    grid-area: vs;
    display: inline-block;
    justify-self: center;
    align-self: center;
    font-family: $font-family-num;
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    color: #1c7bff;
    font-size: $font-size-lg;

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
    border-radius: 6px;
    background: #e4f0fe;
    gap: 2px;
    cursor: pointer;
    transition: background 0.15s ease;

    @include mobile-only {
      max-width: 95px;
      border-radius: 6px;
    }

    @include web-only {
      border-radius: 8px;
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
