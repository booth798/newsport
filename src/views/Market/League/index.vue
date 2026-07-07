<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { fetchLeagueMatches } from '@/api/match';
import { isValidMarketLeague } from '@/constants/marketLeagues';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';

const LEAGUE_ICON_BY_NAME = {
  欧冠: iconChampionUrl,
  英超: iconUkUrl,
  意甲: iconItalyUrl,
  西甲: iconSpainUrl,
  德甲: iconGermaryUrl,
  法甲: iconFranceUrl,
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const leagueKey = computed(() => String(route.params.league ?? ''));
const leagueValid = computed(() => isValidMarketLeague(leagueKey.value));

const matches = ref([]);
const loading = ref(true);
const error = ref(false);
const searchQuery = ref('');

const leagueIconUrl = computed(
  () => LEAGUE_ICON_BY_NAME[leagueKey.value] ?? iconEventsUrl,
);

const pageTitle = computed(() =>
  t('联赛市场', { league: t(leagueKey.value) }),
);

async function loadMatches() {
  if (!leagueValid.value) {
    loading.value = false;
    return;
  }
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchLeagueMatches(leagueKey.value);
    matches.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadMatches);

watch(leagueKey, () => {
  searchQuery.value = '';
  loadMatches();
});

const filteredMatches = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return matches.value;
  return matches.value.filter((match) => {
    const haystack = [match.homeTeam, match.awayTeam, match.date, match.league]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
});

watch(
  () => leagueValid.value,
  (valid) => {
    if (!valid && route.name === 'market-league') {
      router.replace({ name: 'market' });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="market-league">
    <section v-if="leagueValid" class="market-league__panel" aria-labelledby="market-league-title">
      <header class="market-league__head">
        <div class="market-league__title-wrap">
          <img
            class="market-league__title-icon"
            :src="leagueIconUrl"
            width="48"
            height="48"
            alt=""
            aria-hidden="true"
          />
          <h2 id="market-league-title" class="market-league__title">{{ pageTitle }}</h2>
        </div>
        <label class="market-league__search" :aria-label="t('搜索')">
          <span class="market-league__search-icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            class="market-league__search-input"
            :placeholder="t('搜索')"
            autocomplete="off"
          />
        </label>
      </header>

      <div v-if="loading" class="market-league__state">
        <div class="market-league__spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <div v-else-if="error" class="market-league__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="market-league__retry" @click="loadMatches">{{ t('重试') }}</button>
      </div>

      <div v-else-if="filteredMatches.length === 0" class="market-league__state market-league__state--empty">
        <p>{{ searchQuery.trim() ? t('暂无数据') : t('暂无相关赛事') }}</p>
      </div>

      <div v-else class="market-league__grid">
        <HomeMatchCard
          v-for="match in filteredMatches"
          :key="match.id"
          :match="match"
          :from-league="leagueKey"
        />
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.market-league {
  @include container;
  @include web-main-column-max;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  @include web-only {
    padding-top: 20px;
    padding-bottom: 60px;
  }

  @include mobile-only {
    padding-top: 8px;
    padding-bottom: 30px;
  }

  &__panel {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-card);
    border: 1.5px solid var(--auxiliary-1);
    box-shadow: var(--shadow-card);

    @include web-only {
      border-radius: 50px;
      padding: 40px 24px;
      box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
    }

    @include mobile-only {
      border-radius: 20px;
      padding: 15px 12px 16px;
      background: #EAF1F9;
      box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
    }
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;

    @include mobile-only {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      margin-bottom: 12px;
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__title-icon {
    flex-shrink: 0;
    display: block;
    width: 48px;
    height: 48px;
    object-fit: contain;

    @include mobile-only {
      width: 28px;
      height: 28px;
    }
  }

  &__title {
    margin: 0;
    font-family: $font-family-base;
    font-size: 34px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
    background: radial-gradient(circle at 50% 100%, #68b3fd, #0d6cfb);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;

    @include mobile-only {
      font-size: 18px;
      font-weight: 700;
      -webkit-text-fill-color: var(--theme-primary);
      color: var(--theme-primary);
      background: none;
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    width: 220px;
    max-width: 100%;
    height: 44px;
    padding: 0 16px;
    border-radius: $radius-pill;
    border: 1px solid #d6e0eb;
    background: #fff;
    box-sizing: border-box;
    cursor: text;

    @include mobile-only {
      width: 100%;
      height: 40px;
    }

    &:focus-within {
      border-color: rgba(31, 124, 255, 0.45);
      box-shadow: 0 0 0 2px rgba(31, 124, 255, 0.08);
    }
  }

  &__search-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'%3E%3Ccircle cx='8' cy='8' r='5.25' stroke='%2394A8C4' stroke-width='1.2'/%3E%3Cpath d='M12.5 12.5L16 16' stroke='%2394A8C4' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E");
  }

  &__search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: $font-size-md;
    color: #0b3462;

    &::placeholder {
      color: rgba(11, 52, 98, 0.4);
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  &__grid {
    display: grid;
    gap: 20px;

    @include web-only {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @include mobile-only {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 200px;
    color: var(--theme-text-1);
    font-size: $font-size-md;

    &--empty p {
      margin: 0;
    }
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: market-league-spin 0.8s linear infinite;
  }

  &__retry {
    padding: 8px 24px;
    border-radius: $radius-pill;
    border: 1.5px solid var(--theme-primary);
    background: transparent;
    color: var(--theme-primary);
    font-size: $font-size-md;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--theme-primary);
      color: #fff;
    }
  }
}

@keyframes market-league-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
