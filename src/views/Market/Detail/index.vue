<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getHotMatchById } from '@/constants/hotMatchCatalog';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

import logoNavUrl from '@/assets/images/common/logo_nav.svg?url';
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

const { t } = useI18n();
const route = useRoute();

const activeTab = ref('fulltime');
const buyType = ref('standard');
const buyAmount = ref('');
const showBuyPanel = ref(false);
const selectedRow = ref(null);

const match = ref(getHotMatchById(route.params.id));

const heroRef = ref(null);
const dockCta = ref(false);
let io = null;

const LEAGUE_ICON_BY_NAME = {
  欧冠: iconChampionUrl,
  英超: iconUkUrl,
  意甲: iconItalyUrl,
  西甲: iconSpainUrl,
  德甲: iconGermaryUrl,
  法甲: iconFranceUrl,
  欧联: iconEventsUrl,
};

const leagueIconUrl = computed(() => LEAGUE_ICON_BY_NAME[match.value.league] ?? iconEventsUrl);

const homeTeamLogoUrl = computed(() =>
  resolveTeamLogoUrl(match.value.homeTeam, match.value.homeTeamLogo),
);
const awayTeamLogoUrl = computed(() =>
  resolveTeamLogoUrl(match.value.awayTeam, match.value.awayTeamLogo),
);

const homeScoreBg = computed(() =>
  match.value.homeScore > match.value.awayScore ? bgScoreHighUrl : bgScoreDefaultUrl,
);
const awayScoreBg = computed(() =>
  match.value.awayScore > match.value.homeScore ? bgScoreHighUrl : bgScoreDefaultUrl,
);

function formatVolumeMoney(n) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildScoreRows(matchId, tab) {
  const rows = [];
  const tabSalt = tab === 'halftime' ? 41 : 0;
  for (let h = 0; h <= 3; h += 1) {
    for (let a = 0; a <= 3; a += 1) {
      const k = (h * 4 + a + matchId * 7 + tabSalt) % 97;
      const prob = 2.1 + (k * 0.191) % 9.2;
      const volumeBase = 6_000_000 + (k * 97_127 + h * 11_000 + a * 19_000) % 92_000_000;
      rows.push({
        score: `${h}-${a}`,
        probability: `${prob.toFixed(2)}%`,
        volumeFormatted: formatVolumeMoney(volumeBase),
      });
    }
  }
  return rows;
}

const scoreRows = computed(() => buildScoreRows(match.value.id, activeTab.value));

watch(activeTab, () => {
  closeBuyPanel();
});

watch(
  () => route.params.id,
  (id) => {
    match.value = getHotMatchById(id);
    closeBuyPanel();
  },
);

function setupHeroObserver() {
  io?.disconnect();
  io = null;
  if (!heroRef.value) return;
  io = new IntersectionObserver(
    ([entry]) => {
      dockCta.value = !entry.isIntersecting;
    },
    { threshold: 0, rootMargin: '0px 0px -8px 0px' },
  );
  io.observe(heroRef.value);
}

onMounted(() => {
  nextTick(() => setupHeroObserver());
});

watch(heroRef, () => {
  nextTick(() => setupHeroObserver());
});

onBeforeUnmount(() => {
  io?.disconnect();
});

function scrollToScoreMarket() {
  document.getElementById('score-market')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectRow(row) {
  selectedRow.value = row;
  showBuyPanel.value = true;
}

function closeBuyPanel() {
  showBuyPanel.value = false;
  selectedRow.value = null;
  buyAmount.value = '';
}
</script>

<template>
  <div class="market-detail">
    <div v-if="dockCta" class="market-detail__cta-dock" aria-hidden="false">
      <div class="market-detail__cta-dock-inner">
        <button type="button" class="btn btn--primary market-detail__cta-dock-btn" @click="scrollToScoreMarket">
          {{ t('进入市场') }}
        </button>
      </div>
    </div>

    <div class="market-detail__layout">
      <aside class="market-detail__sidebar" aria-label="market-nav">
        <RouterLink to="/" class="market-detail__brand">
          <img :src="logoNavUrl" alt="" class="market-detail__brand-img" width="120" height="40" />
        </RouterLink>
        <nav class="market-detail__side-nav">
          <button
            type="button"
            class="market-detail__side-tab"
            :class="{ 'market-detail__side-tab--active': activeTab === 'fulltime' }"
            @click="activeTab = 'fulltime'"
          >
            {{ t('全场赛果') }}
          </button>
          <button
            type="button"
            class="market-detail__side-tab"
            :class="{ 'market-detail__side-tab--active': activeTab === 'halftime' }"
            @click="activeTab = 'halftime'"
          >
            {{ t('半场赛果') }}
          </button>
        </nav>
      </aside>

      <div class="market-detail__main">
        <div class="market-detail__toolbar">
          <RouterLink to="/" class="market-detail__back">← {{ t('返回') }}</RouterLink>
        </div>

        <section ref="heroRef" class="market-hero card-default">
          <div class="market-hero__top">
            <div class="market-hero__league">
              <img class="market-hero__league-icon" :src="leagueIconUrl" alt="" width="22" height="22" />
              <span>{{ match.league }}</span>
            </div>
            <span class="market-hero__date">{{ match.date }}</span>
          </div>

          <div class="market-hero__arena">
            <img class="market-hero__arena-bg" :src="bgScoreUrl" alt="" width="760" height="340" />
            <div class="market-hero__arena-inner">
              <div class="market-hero__grid">
                <div class="market-hero__logo market-hero__logo--home">
                  <div class="market-hero__badge">
                    <img
                      v-if="homeTeamLogoUrl"
                      class="market-hero__badge-img"
                      :src="homeTeamLogoUrl"
                      :alt="match.homeTeam"
                    />
                    <span v-else class="market-hero__badge-txt">{{ match.homeTeam.charAt(0) }}</span>
                  </div>
                </div>
                <div class="market-hero__logo market-hero__logo--away">
                  <div class="market-hero__badge">
                    <img
                      v-if="awayTeamLogoUrl"
                      class="market-hero__badge-img"
                      :src="awayTeamLogoUrl"
                      :alt="match.awayTeam"
                    />
                    <span v-else class="market-hero__badge-txt">{{ match.awayTeam.charAt(0) }}</span>
                  </div>
                </div>
                <span class="market-hero__name market-hero__name--home">{{ match.homeTeam }}</span>
                <span class="market-hero__vs">VS</span>
                <span class="market-hero__name market-hero__name--away">{{ match.awayTeam }}</span>
                <div class="market-hero__score-wrap market-hero__score-wrap--home">
                  <span
                    class="market-hero__score"
                    :class="{ 'market-hero__score--lead': match.homeScore > match.awayScore }"
                  >
                    <img class="market-hero__score-bg" :src="homeScoreBg" alt="" />
                    <span class="market-hero__score-num">{{ match.homeScore }}</span>
                  </span>
                </div>
                <div class="market-hero__score-wrap market-hero__score-wrap--away">
                  <span
                    class="market-hero__score"
                    :class="{ 'market-hero__score--lead': match.awayScore > match.homeScore }"
                  >
                    <img class="market-hero__score-bg" :src="awayScoreBg" alt="" />
                    <span class="market-hero__score-num">{{ match.awayScore }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="market-hero__vol">
            <span class="market-hero__vol-lab">{{ t('总成交量') }}:</span>
            <span class="market-hero__vol-val">{{ match.volume }}</span>
          </div>

          <button type="button" class="btn btn--primary market-hero__cta" @click="scrollToScoreMarket">
            {{ t('进入市场') }}
          </button>
        </section>

        <section id="score-market" class="score-table card-default">
          <div class="score-table__head">
            <span>{{ t('比分') }}</span>
            <span>{{ t('概率') }}</span>
            <span class="score-table__head-vol">{{ t('成交量') }}</span>
          </div>
          <ul class="score-table__body">
            <li
              v-for="row in scoreRows"
              :key="`${activeTab}-${row.score}`"
              class="score-table__row"
              :class="{ 'score-table__row--active': selectedRow?.score === row.score && showBuyPanel }"
              role="button"
              tabindex="0"
              @click="selectRow(row)"
              @keydown.enter.prevent="selectRow(row)"
            >
              <span class="score-table__cell score-table__cell--score">{{ row.score }}</span>
              <span class="score-table__cell">{{ row.probability }}</span>
              <span class="score-table__cell score-table__cell--vol">{{ row.volumeFormatted }}</span>
              <span class="score-table__arrow" aria-hidden="true">›</span>
            </li>
          </ul>
        </section>

        <Transition name="slide">
          <div v-if="showBuyPanel" class="buy-panel card-default">
            <div class="buy-panel__header">
              <h3 class="buy-panel__title">
                {{ t('比分') }} {{ selectedRow?.score }} · {{ selectedRow?.probability }}
              </h3>
              <button type="button" class="buy-panel__close" @click="closeBuyPanel">✕</button>
            </div>

            <div class="buy-panel__type">
              <button type="button" class="type-btn" :class="{ active: buyType === 'standard' }" @click="buyType = 'standard'">
                {{ t('一般买入') }}
              </button>
              <button type="button" class="type-btn" :class="{ active: buyType === 'scheduled' }" @click="buyType = 'scheduled'">
                {{ t('预约买入') }}
              </button>
            </div>

            <div class="buy-panel__amount">
              <label class="form-label">{{ t('买入金额') }}</label>
              <input v-model="buyAmount" type="number" class="form-input" placeholder="0.00" />
            </div>

            <div class="buy-panel__actions">
              <button type="button" class="btn btn--default-2 cancel-btn" @click="closeBuyPanel">
                {{ t('取消') }}
              </button>
              <button type="button" class="btn btn--primary confirm-btn">
                {{ t('确认买入') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.market-detail {
  @include container;
  padding-top: $spacing-lg;
  padding-bottom: $spacing-4xl;

  &__cta-dock {
    position: fixed;
    z-index: 25;
    right: 0;
    left: 0;
    padding: 10px 12px;
    border-bottom: 1px solid rgb(228, 240, 254);
    background: rgba(243, 248, 255, 0.96);
    backdrop-filter: blur(6px);

    @include web-only {
      top: $web-header-height;
    }

    @include mobile-only {
      top: $mobile-header-height;
    }
  }

  &__cta-dock-inner {
    max-width: 920px;
    margin: 0 auto;
  }

  &__cta-dock-btn {
    width: 100%;
    height: 44px;

    @include web-only {
      height: 48px;
    }
  }

  &__layout {
    display: grid;
    gap: 16px;

    @include web-only {
      grid-template-columns: 200px minmax(0, 1fr);
      align-items: start;
      gap: 24px;
    }
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;

    @include mobile-only {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
  }

  &__brand {
    display: inline-flex;
    align-items: center;

    @include mobile-only {
      order: 0;
    }
  }

  &__brand-img {
    display: block;
    height: 36px;
    width: auto;
  }

  &__side-nav {
    display: flex;
    flex-direction: column;
    gap: 10px;

    @include mobile-only {
      flex: 1;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }
  }

  &__side-tab {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1.5px solid rgb(228, 240, 254);
    background: #fff;
    font-size: $font-size-md;
    font-weight: 600;
    color: #0b3462;
    cursor: pointer;
    text-align: left;
    transition:
      background 0.2s,
      color 0.2s,
      border-color 0.2s;

    @include mobile-only {
      width: auto;
      padding: 8px 14px;
      font-size: 13px;
    }

    &--active {
      border-color: #1c7bff;
      background: #1c7bff;
      color: #fff;
    }
  }

  &__main {
    min-width: 0;
  }

  &__toolbar {
    margin-bottom: $spacing-md;
  }

  &__back {
    font-size: $font-size-md;
    color: var(--theme-primary);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.market-hero {
  border-radius: 24px;
  padding: 16px;
  margin-bottom: $spacing-lg;
  background: var(--auxiliary-1);
  border: 1.5px solid rgba(255, 255, 255, 1);
  box-shadow: 0 8px 20px 0 rgba(21, 58, 118, 0.12);

  @include web-only {
    padding: 20px 24px 24px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__league {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #0b3462;
    min-width: 0;
  }

  &__league-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  &__date {
    font-family: $font-family-num;
    font-weight: 700;
    font-size: $font-size-md;
    color: #0b3462;
    flex-shrink: 0;
  }

  &__arena {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgb(228, 240, 254);
    background: linear-gradient(180deg, #f3f8ff 0%, #e8f2ff 100%);
  }

  &__arena-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  &__arena-inner {
    position: relative;
    z-index: 1;
    padding: 16px 12px 18px;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas:
      'hlogo . alogo'
      'hname vs aname'
      'hscore . ascore';
    align-items: center;
    column-gap: 8px;
    row-gap: 10px;
  }

  &__logo {
    display: flex;
    justify-content: center;

    &--home {
      grid-area: hlogo;
    }

    &--away {
      grid-area: alogo;
    }
  }

  &__badge {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #fff;
    border: 0.5px solid rgb(228, 240, 254);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    @include web-only {
      width: 52px;
      height: 52px;
    }
  }

  &__badge-img {
    width: 72%;
    height: 72%;
    object-fit: contain;
  }

  &__badge-txt {
    font-weight: 700;
    color: #1c7bff;
    font-size: 16px;
  }

  &__name {
    font-size: $font-size-md;
    font-weight: 500;
    color: #0b3462;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--home {
      grid-area: hname;
    }

    &--away {
      grid-area: aname;
    }
  }

  &__vs {
    grid-area: vs;
    font-family: $font-family-num;
    font-weight: 800;
    color: #1c7bff;
    font-size: 20px;
    justify-self: center;
    transform: translateY(-40%);

    @include web-only {
      font-size: 24px;
    }
  }

  &__score-wrap {
    display: flex;
    justify-content: center;

    &--home {
      grid-area: hscore;
    }

    &--away {
      grid-area: ascore;
    }
  }

  &__score {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 32px;

    @include web-only {
      width: 48px;
      height: 36px;
    }

    &--lead .market-hero__score-num {
      color: #fff;
    }
  }

  &__score-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
  }

  &__score-num {
    position: relative;
    z-index: 1;
    font-family: $font-family-num;
    font-weight: 700;
    font-size: 18px;
    color: #0b3462;

    @include web-only {
      font-size: 22px;
    }
  }

  &__vol {
    display: flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 14px;
    margin-bottom: 12px;
  }

  &__vol-lab {
    font-size: 14px;
    color: rgba(11, 52, 98, 0.55);
  }

  &__vol-val {
    font-size: 20px;
    font-weight: 700;
    color: #1c7bff;

    @include web-only {
      font-size: 22px;
    }
  }

  &__cta {
    width: 100%;
    height: 44px;
    font-weight: 600;

    @include web-only {
      height: 48px;
      font-size: $font-size-lg;
    }
  }
}

.score-table {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgb(228, 240, 254);
  background: #fff;

  &__head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 32px;
    gap: 8px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(11, 52, 98, 0.65);
    background: #f3f8ff;
    border-bottom: 1px solid rgb(228, 240, 254);

    @include web-only {
      padding: 14px 18px;
      font-size: $font-size-md;
    }
  }

  &__head-vol {
    color: #e11d48;
  }

  &__body {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 32px;
    gap: 8px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid rgb(240, 246, 255);
    cursor: pointer;
    transition: background 0.15s;

    @include web-only {
      padding: 14px 18px;
    }

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: rgba(28, 123, 255, 0.04);
    }

    &--active {
      background: rgba(28, 123, 255, 0.08);
    }
  }

  &__cell {
    font-size: $font-size-md;
    color: #0b3462;

    &--score {
      font-family: $font-family-num;
      font-weight: 700;
    }

    &--vol {
      font-family: $font-family-num;
      font-weight: 600;
      color: #1c7bff;
      font-size: 13px;

      @include web-only {
        font-size: $font-size-md;
      }
    }
  }

  &__arrow {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    color: #1c7bff;
    line-height: 1;
  }
}

.buy-panel {
  margin-top: $spacing-xl;
  border-radius: $radius-lg;
  padding: $spacing-3xl;

  @include mobile-only {
    padding: $spacing-lg;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--theme-text);
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-tint);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--theme-text-1);
  }

  &__type {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
  }

  &__amount {
    margin-bottom: $spacing-xl;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
  }
}

.type-btn {
  flex: 1;
  height: 44px;
  border-radius: $radius-pill;
  border: 1.5px solid var(--theme-divider);
  background: transparent;
  font-size: $font-size-md;
  color: var(--theme-text);
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.form-label {
  display: block;
  font-size: $font-size-md;
  color: var(--theme-text-1);
  margin-bottom: $spacing-sm;
}

.form-input {
  width: 100%;
  height: 52px;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  padding: 0 $spacing-lg;
  font-size: $font-size-xl;
  font-family: $font-family-num;
  color: var(--theme-text);
  background: transparent;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.cancel-btn {
  flex: 1;
  height: 48px;
  border: 1.5px solid var(--theme-divider);
}

.confirm-btn {
  flex: 2;
  height: 48px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
