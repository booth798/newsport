<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';

import bgScoreUrl from '@/assets/images/events/bg_score.svg?url';
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
});

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
  欧联: iconEventsUrl,
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
</script>

<template>
  <RouterLink :to="`/market/${match.id}`" class="match-card">
    <!-- H5：联赛+成交量同行 → 分割线 → 时间+开赛倒数 → 主体仅网格区（成交量不在此展示） -->
    <div v-if="isMobile" class="match-card__inner match-card__inner--m">
      <div class="match-card__m-top">
        <div class="match-card__m-league-row">
          <div class="match-card__league">
            <img
              class="match-card__league-icon"
              :src="leagueIconUrl"
              alt=""
              width="22"
              height="22"
              draggable="false"
            />
            <span class="match-card__league-name">{{ match.league }}</span>
          </div>
          <div class="match-card__vol-header">
            <span class="match-card__vol-label">{{ t('总成交量') }}:</span>
            <span class="match-card__vol-val">{{ match.volume }}</span>
          </div>
        </div>
        <div class="match-card__divider match-card__divider--m" aria-hidden="true" />
        <div class="match-card__m-time-row">
          <span class="match-card__date">{{ match.date }}</span>
          <div class="match-card__pill match-card__pill--m">
            <span class="match-card__pill-lab">{{ t('开赛倒数') }}</span>
            <span class="match-card__pill-time">{{ match.countdown }}</span>
          </div>
        </div>
      </div>

      <div class="match-card__body">
        <div class="match-card__surface match-card__surface--m">
          <div class="match-card__arena-grid">
            <img
              class="match-card__arena-bg"
              :src="bgScoreUrl"
              alt=""
              width="760"
              height="340"
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

                <span class="match-card__team-name match-card__team-name--home">{{ match.homeTeam }}</span>
                <span class="match-card__vs">VS</span>
                <span class="match-card__team-name match-card__team-name--away">{{ match.awayTeam }}</span>

                <div class="match-card__mg-score-slot match-card__mg-score-slot--home">
                  <span
                    class="match-card__score match-card__score--m"
                    :class="{ 'match-card__score--leading': match.homeScore > match.awayScore }"
                  >
                    <img
                      class="match-card__score-bg"
                      :src="homeScoreBg"
                      alt=""
                      width="32"
                      height="26"
                      draggable="false"
                    />
                    <span class="match-card__score-txt">{{ match.homeScore }}</span>
                  </span>
                </div>
                <div class="match-card__mg-score-slot match-card__mg-score-slot--away">
                  <span
                    class="match-card__score match-card__score--m"
                    :class="{ 'match-card__score--leading': match.awayScore > match.homeScore }"
                  >
                    <img
                      class="match-card__score-bg"
                      :src="awayScoreBg"
                      alt=""
                      width="32"
                      height="26"
                      draggable="false"
                    />
                    <span class="match-card__score-txt">{{ match.awayScore }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="match-card__foot">
        <span class="btn btn--primary match-card__btn">{{ t('进入市场') }}</span>
      </div>
    </div>

    <!-- PC：联赛行 → 全宽分割线 → 距分割 14px 时间行 → 距时间 14px 主体（上成交量无底 / 下网格） -->
    <div v-else class="match-card__inner match-card__inner--w">
      <div class="match-card__w-top">
        <div class="match-card__w-league-row">
          <div class="match-card__league">
            <img
              class="match-card__league-icon"
              :src="leagueIconUrl"
              alt=""
              width="28"
              height="28"
              draggable="false"
            />
            <span class="match-card__league-name">{{ match.league }}</span>
          </div>
        </div>
        <div class="match-card__divider" aria-hidden="true" />
        <div class="match-card__w-time-row">
          <span class="match-card__date match-card__date--w">{{ match.date }}</span>
          <div class="match-card__pill match-card__pill--w">
            <span class="match-card__pill-lab">{{ t('开赛倒数') }}</span>
            <span class="match-card__pill-time">{{ match.countdown }}</span>
          </div>
        </div>
      </div>

      <div class="match-card__body">
        <div class="match-card__surface match-card__surface--w">
          <div class="match-card__vol-plain">
            <span class="match-card__vol-label">{{ t('总成交量') }}:</span>
            <span class="match-card__vol-val">{{ match.volume }}</span>
          </div>
          <div class="match-card__arena-grid">
            <img
              class="match-card__arena-bg"
              :src="bgScoreUrl"
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

                <div class="match-card__mg-score-slot match-card__mg-score-slot--home">
                  <span
                    class="match-card__score match-card__score--w"
                    :class="{ 'match-card__score--leading': match.homeScore > match.awayScore }"
                  >
                    <img
                      class="match-card__score-bg"
                      :src="homeScoreBg"
                      alt=""
                      width="50"
                      height="36"
                      draggable="false"
                    />
                    <span class="match-card__score-txt">{{ match.homeScore }}</span>
                  </span>
                </div>
                <div class="match-card__mg-score-slot match-card__mg-score-slot--away">
                  <span
                    class="match-card__score match-card__score--w"
                    :class="{ 'match-card__score--leading': match.awayScore > match.homeScore }"
                  >
                    <img
                      class="match-card__score-bg"
                      :src="awayScoreBg"
                      alt=""
                      width="50"
                      height="36"
                      draggable="false"
                    />
                    <span class="match-card__score-txt">{{ match.awayScore }}</span>
                  </span>
                </div>
              </div>
            </div>
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
    padding: 20px;
    min-height: 0;

    &:hover {
      transform: translateY(-10px);
    }
  }

  @include mobile-only {
    padding: 12px;
    border-radius: 16px;

    &:hover {
      transform: translateY(-4px);
    }
  }

  &__inner {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__m-top {
    margin-bottom: 0;
  }

  &__m-league-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
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
    margin-left: -12px;
    margin-right: -12px;
    background: rgb(228, 240, 254);
    flex-shrink: 0;

    @include web-only {
      margin-left: -20px;
      margin-right: -20px;
    }
  }

  &__m-time-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding-top: 7px;
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
    width: 22px;
    height: 22px;
    object-fit: contain;

    @include web-only {
      width: 28px;
      height: 28px;
    }
  }

  &__league-name {
    font-family: $font-family-base;
    font-size: $font-size-md;
    font-weight: 600;
    color: #0b3462;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include web-only {
      font-size: $font-size-lg;
    }
  }

  &__date {
    font-family: $font-family-num;
    font-size: $font-size-md;
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    color: #0b3462;
    letter-spacing: 0;
    min-width: 0;
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
      width: 124px;
      height: 24px;
      min-height: 24px;
      padding: 0 6px;
      gap: 4px;
      border-radius: 6px;
      background: rgba(31, 124, 255, 0.15);
      justify-content: center;
      overflow: hidden;
    }

    &--w {
      min-height: 38px;
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

  &__w-top {
    margin-bottom: 0;
  }

  &__w-league-row {
    padding-bottom: 10px;
  }

  &__w-time-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding-top: 14px;
    box-sizing: border-box;
  }

  &__date--w {
    font-size: 18px;
  }

  &__body {
    margin-top: 14px;
    flex: 1;
    min-height: 0;
  }

  &__surface {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid rgb(228, 240, 254);
    box-sizing: border-box;
    background: #fff;

    &--w {
      border-radius: 24px;
    }
  }

  &__surface--m &__arena-grid-inner {
    padding-top: 16px;
    padding-left: 12px;
    padding-right: 12px;
    padding-bottom: 16px;
  }

  &__vol-plain {
    display: flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 11px 12px;
    text-align: center;
    background: transparent;
    box-sizing: border-box;
  }

  &__vol-label {
    font-family: $font-family-base;
    font-size: 14px;
    font-weight: 400;
    line-height: 1;
    color: rgba(11, 52, 98, 0.5);
  }

  &__vol-val {
    font-family: $font-family-base;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: #1c7bff;
  }

  &__arena-grid {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background: linear-gradient(180deg, #f3f8ff 0%, #e8f2ff 100%);
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
      padding: 20px 16px 20px;
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
      column-gap: 12px;
      row-gap: 14px;
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
      width: 44px;
      height: 44px;
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
      font-size: $font-size-base;
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
      font-size: 24px;
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

    &--w {
      width: 50px;
      height: 36px;

      .match-card__score-txt {
        font-size: 26px;
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

  &__foot {
    margin-top: 10px;

    @include web-only {
      margin-top: 20px;
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
