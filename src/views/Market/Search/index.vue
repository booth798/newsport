<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchMatchList } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const searchInputRef = ref(null);
const searchQuery = ref('');
const allMatches = ref([]);
const loading = ref(false);
const hasSearched = ref(false);

const HOT_KEYWORDS = ['欧冠', '英超', '西甲', '德甲', '意甲', '法甲'];

const SEARCH_HISTORY_KEY = 'mysport:search-history';
const searchHistory = ref([]);

function loadHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    searchHistory.value = raw ? JSON.parse(raw) : [];
  } catch {
    searchHistory.value = [];
  }
}

function saveHistory(keyword) {
  const kw = keyword.trim();
  if (!kw) return;
  const list = searchHistory.value.filter((h) => h !== kw);
  list.unshift(kw);
  searchHistory.value = list.slice(0, 10);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory.value));
}

function clearHistory() {
  searchHistory.value = [];
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

const trimmedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredMatches = computed(() => {
  if (!trimmedQuery.value) return [];
  return allMatches.value.filter((m) =>
    [m.league, m.homeTeam, m.awayTeam, m.date]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(trimmedQuery.value),
  );
});

const showInitial = computed(() => !hasSearched.value && !trimmedQuery.value);
const showEmpty = computed(() => hasSearched.value && trimmedQuery.value && filteredMatches.value.length === 0);
const showResults = computed(() => hasSearched.value && filteredMatches.value.length > 0);

async function loadAllMatches() {
  try {
    const res = await fetchMatchList({ pageSize: 100 });
    allMatches.value = res?.data?.records ?? [];
  } catch {
    allMatches.value = [];
  }
}

function doSearch() {
  const kw = searchQuery.value.trim();
  if (!kw) return;
  saveHistory(kw);
  hasSearched.value = true;
}

function onHotKeyword(keyword) {
  searchQuery.value = keyword;
  doSearch();
}

function onHistoryKeyword(keyword) {
  searchQuery.value = keyword;
  doSearch();
}

function onInputChange() {
  if (!searchQuery.value.trim()) {
    hasSearched.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(async () => {
  loadHistory();
  loading.value = true;
  await loadAllMatches();
  loading.value = false;
  await nextTick();
  searchInputRef.value?.focus();
});
</script>

<template>
  <div class="search-page">
    <!-- 导航栏 -->
    <header class="search-page__header">
      <div class="search-page__nav-bar">
        <button type="button" class="search-page__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="36" height="36" alt="" />
        </button>
        <label class="search-page__search-box">
          <svg class="search-page__search-icon" width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="8" cy="8" r="5.25" stroke="#94A8C4" stroke-width="1.2"/>
            <path d="M12.5 12.5L16 16" stroke="#94A8C4" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            class="search-page__search-input"
            :placeholder="t('搜索赛事、联赛、球队')"
            autocomplete="off"
            enterkeyhint="search"
            @keydown.enter.prevent="doSearch"
            @input="onInputChange"
          />
        </label>
        <button type="button" class="search-page__search-btn" @click="doSearch">
          {{ t('搜索') }}
        </button>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="search-page__state">
      <div class="search-page__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <!-- 初始态：热门搜索 + 搜索历史 -->
    <div v-else-if="showInitial" class="search-page__initial">
      <section class="search-page__section">
        <h3 class="search-page__section-title">{{ t('热门搜索') }}</h3>
        <div class="search-page__tags">
          <button
            v-for="kw in HOT_KEYWORDS"
            :key="kw"
            type="button"
            class="search-page__tag"
            @click="onHotKeyword(kw)"
          >
            {{ kw }}
          </button>
        </div>
      </section>

      <section v-if="searchHistory.length" class="search-page__section">
        <div class="search-page__section-head">
          <h3 class="search-page__section-title">{{ t('搜索历史') }}</h3>
          <button type="button" class="search-page__clear-btn" @click="clearHistory">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5h8v7.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 12.5V5Z" stroke="#94A8C4" stroke-width="1"/>
              <path d="M2.5 5h11M6 3h4" stroke="#94A8C4" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="search-page__tags">
          <button
            v-for="kw in searchHistory"
            :key="kw"
            type="button"
            class="search-page__tag search-page__tag--history"
            @click="onHistoryKeyword(kw)"
          >
            {{ kw }}
          </button>
        </div>
      </section>
    </div>

    <!-- 搜索结果 -->
    <div v-else-if="showResults" class="search-page__results">
      <p class="search-page__result-count">
        {{ t('搜索到') }} <strong>{{ filteredMatches.length }}</strong> {{ t('条相关赛事') }}
      </p>
      <div class="search-page__grid">
        <HomeMatchCard
          v-for="match in filteredMatches"
          :key="match.id"
          :match="match"
        />
      </div>
    </div>

    <!-- 无结果 -->
    <div v-else-if="showEmpty" class="search-page__empty">
      <div class="search-page__empty-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="28" cy="28" r="18" stroke="#D6E0EB" stroke-width="3"/>
          <path d="M42 42L56 56" stroke="#D6E0EB" stroke-width="3" stroke-linecap="round"/>
          <path d="M22 24h12M22 32h8" stroke="#D6E0EB" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="search-page__empty-text">{{ t('没有相关内容，请重新尝试') }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.search-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #e3ecfb;
  box-sizing: border-box;

  @include mobile-only {
    padding-bottom: 30px;
  }

  @include web-only {
    @include container;
    @include web-main-column-max;
    padding-top: 20px;
    padding-bottom: 60px;
  }

  &__header {
    @include mobile-only {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 6px 8px;
      box-sizing: border-box;
    }
  }

  &__nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;

    @include mobile-only {
      height: 48px;
      padding: 0 8px;
      background: #eaf1f9;
      border: 0.8px solid #fff;
      border-radius: 30px;
      box-sizing: border-box;
    }

    @include web-only {
      margin-bottom: 20px;
      gap: 12px;
    }
  }

  &__back {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      display: block;
      width: 36px;
      height: 36px;
    }
  }

  &__search-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    background: #fff;
    border: 0.8px solid #d6e0eb;
    border-radius: 48px;
    box-sizing: border-box;
    cursor: text;

    &:focus-within {
      border-color: rgba(28, 123, 255, 0.45);
    }
  }

  &__search-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }

  &__search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #0b3462;

    &::placeholder {
      color: rgba(11, 52, 98, 0.4);
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  &__search-btn {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: #1c7bff;
    cursor: pointer;
    white-space: nowrap;
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
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: search-spin 0.8s linear infinite;
  }

  @keyframes search-spin {
    to { transform: rotate(360deg); }
  }

  &__initial {
    @include mobile-only {
      padding: 16px 16px 0;
    }

    @include web-only {
      padding: 0;
    }
  }

  &__section {
    margin-bottom: 24px;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__section-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #0b3462;

    .search-page__section-head & {
      margin-bottom: 0;
    }
  }

  &__clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    border: 0.8px solid #d6e0eb;
    border-radius: 48px;
    background: #fff;
    font-size: 13px;
    font-weight: 400;
    color: #0b3462;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    &:active {
      background: rgba(28, 123, 255, 0.08);
      border-color: #1c7bff;
    }

    &--history {
      background: #eaf1f9;
      border-color: #eaf1f9;
    }
  }

  &__results {
    @include mobile-only {
      padding: 12px 8px 0;
    }

    @include web-only {
      padding: 0;
    }
  }

  &__result-count {
    margin: 0 0 12px;
    padding: 0 8px;
    font-size: 13px;
    color: rgba(11, 52, 98, 0.55);

    strong {
      color: #1c7bff;
      font-weight: 600;
    }
  }

  &__grid {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr;

    @include web-only {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 80px;
    gap: 16px;
  }

  &__empty-icon {
    opacity: 0.6;
  }

  &__empty-text {
    margin: 0;
    font-size: 14px;
    color: rgba(11, 52, 98, 0.45);
    text-align: center;
  }
}
</style>
