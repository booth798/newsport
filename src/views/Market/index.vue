<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { fetchLeagueList } from '@/api/match';

import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';

const { t } = useI18n();
const router = useRouter();

const leagues = ref([]);
const loading = ref(true);
const error = ref(false);
const searchQuery = ref('');

async function loadLeagues() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchLeagueList();
    leagues.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadLeagues);

const filteredLeagues = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return leagues.value;
  return leagues.value.filter((item) => {
    const label = t(item.key).toLowerCase();
    return label.includes(q) || item.key.toLowerCase().includes(q);
  });
});

function openLeague(leagueKey) {
  router.push({ name: 'market-league', params: { league: leagueKey } });
}
</script>

<template>
  <div class="market-leagues">
    <section class="market-leagues__panel" aria-labelledby="market-leagues-title">
      <header class="market-leagues__head">
        <div class="market-leagues__title-wrap">
          <img
            class="market-leagues__title-icon"
            :src="iconEventsUrl"
            width="48"
            height="48"
            alt=""
            aria-hidden="true"
          />
          <h2 id="market-leagues-title" class="market-leagues__title">{{ t('全部赛事') }}</h2>
        </div>
        <label class="market-leagues__search" :aria-label="t('搜索')">
          <span class="market-leagues__search-icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            class="market-leagues__search-input"
            :placeholder="t('搜索')"
            autocomplete="off"
          />
        </label>
      </header>

      <div v-if="loading" class="market-leagues__state">
        <div class="market-leagues__spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <div v-else-if="error" class="market-leagues__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="market-leagues__retry" @click="loadLeagues">{{ t('重试') }}</button>
      </div>

      <div v-else-if="filteredLeagues.length === 0" class="market-leagues__state market-leagues__state--empty">
        <p>{{ searchQuery.trim() ? t('暂无联赛') : t('暂无相关赛事') }}</p>
      </div>

      <ul v-else class="market-leagues__grid">
        <li v-for="item in filteredLeagues" :key="item.key">
          <button
            type="button"
            class="market-leagues__card"
            @click="openLeague(item.key)"
          >
            <span class="market-leagues__card-name">{{ t(item.key) }}</span>
            <span class="market-leagues__card-chevron" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

/* 外层与首页 `.home__inner`、Header 同宽 */
.market-leagues {
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

  /* 与首页 `.hot-events` 大块一致 */
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
      background: #fafaff;
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
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;

    @include mobile-only {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  &__card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 52px;
    padding: 14px 18px;
    border-radius: 16px;
    border: 1px solid #d6e0eb;
    background: #fff;
    cursor: pointer;
    text-align: left;
    box-shadow: 0 2px 8px rgba(21, 58, 119, 0.08);
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    @include mobile-only {
      min-height: 48px;
      padding: 12px 16px;
    }

    &:hover {
      border-color: rgba(31, 124, 255, 0.45);
      background: #f5f9ff;
      box-shadow: 0 3px 10px rgba(21, 58, 119, 0.12);
    }

    &:focus-visible {
      outline: 2px solid rgba(28, 123, 255, 0.45);
      outline-offset: 2px;
    }
  }

  &__card-name {
    font-size: 16px;
    font-weight: 500;
    color: #0b3462;

    @include mobile-only {
      font-size: $font-size-base;
    }
  }

  &__card-chevron {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border-right: 2px solid rgba(11, 52, 98, 0.35);
    border-bottom: 2px solid rgba(11, 52, 98, 0.35);
    transform: rotate(-45deg);
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
    animation: market-leagues-spin 0.8s linear infinite;
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

@keyframes market-leagues-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
