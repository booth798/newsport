<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchLeagueList } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import { useLeagueFilterStore } from '@/store/modules/leagueFilter';
import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';

const { t, locale } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const filterStore = useLeagueFilterStore();
const { isMobile } = storeToRefs(appStore);

/** 依据当前语言取联赛展示名（zh 用简称、en 用全称），对齐安卓 localizedDisplayName，用作接口 league 过滤值。 */
function leagueDisplayName(league) {
  const name = (league.name || '').trim();
  const shortName = (league.shortName || '').trim();
  const isEn = String(locale.value || '').toLowerCase().startsWith('en');
  return isEn ? (name || shortName) : (shortName || name);
}

const loading = ref(true);
const error = ref(false);
const allLeagues = ref([]);
const selectedIds = ref(new Set());
const isSelectAll = ref(false);
const activeIndex = ref('☆');

const INDEX_ENTRIES = ['☆', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];

// 拼音首字母参照字符，用于 localeCompare 归类
const PINYIN_REFS = [
  ['A', '啊'], ['B', '八'], ['C', '嚓'], ['D', '哒'],
  ['E', '鹅'], ['F', '发'], ['G', '旮'], ['H', '哈'],
  ['J', '击'], ['K', '咔'], ['L', '垃'], ['M', '妈'],
  ['N', '拿'], ['O', '噢'], ['P', '啪'], ['Q', '七'],
  ['R', '日'], ['S', '撒'], ['T', '他'], ['W', '挖'],
  ['X', '夕'], ['Y', '压'], ['Z', '匝'],
];

function getPinyinInitial(str) {
  if (!str) return '#';
  const ch = str.charAt(0);
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  if (!/[\u4e00-\u9fff]/.test(ch)) return '#';
  for (let i = PINYIN_REFS.length - 1; i >= 0; i--) {
    if (ch.localeCompare(PINYIN_REFS[i][1], 'zh-Hans-CN-u-co-pinyin') >= 0) {
      return PINYIN_REFS[i][0];
    }
  }
  return 'A';
}

const groupedLeagues = computed(() => {
  const groups = new Map();

  const hotList = allLeagues.value.filter((l) => l.hot);
  if (hotList.length) groups.set('☆', hotList);

  // 热门联赛只出现在「☆」分组，不再重复进入字母分组（对齐安卓 MarketFilterActivity）。
  const hotIds = new Set(hotList.map((l) => l.id));
  const sorted = [...allLeagues.value]
    .filter((l) => !hotIds.has(l.id))
    .sort((a, b) => {
      const na = a.shortName || a.name || '';
      const nb = b.shortName || b.name || '';
      return na.localeCompare(nb, 'zh-Hans-CN-u-co-pinyin');
    });

  for (const league of sorted) {
    const name = league.shortName || league.name || '';
    const initial = getPinyinInitial(name);
    if (!groups.has(initial)) groups.set(initial, []);
    groups.get(initial).push(league);
  }

  const result = [];
  for (const key of INDEX_ENTRIES) {
    const items = groups.get(key);
    if (items?.length) {
      result.push({
        key,
        label: key === '☆' ? t('热门') : key,
        leagues: items,
      });
    }
  }
  return result;
});

const selectedCount = computed(() => selectedIds.value.size);

function toggleLeague(id) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
  isSelectAll.value = s.size === allLeagues.value.length;
}

function onSelectAll() {
  // 全选可切换：勾选 → 全选；再点取消勾选 → 全部不选
  if (isSelectAll.value) {
    selectedIds.value = new Set();
    isSelectAll.value = false;
    return;
  }
  selectedIds.value = new Set(allLeagues.value.map((l) => l.id));
  isSelectAll.value = true;
}

function onSelectCustom() {
  // 切到自选：退出全选态；若当前为全选集合则清空，便于重新勾选
  if (isSelectAll.value || selectedIds.value.size === allLeagues.value.length) {
    selectedIds.value = new Set();
  }
  isSelectAll.value = false;
}

function scrollToGroup(key) {
  activeIndex.value = key;
  const el = document.getElementById(`filter-group-${key}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onSidebarTouch(e) {
  const touch = e.touches[0];
  if (!touch) return;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const letter = el?.dataset?.letter ?? el?.closest?.('[data-letter]')?.dataset?.letter;
  if (letter) scrollToGroup(letter);
}

function goBack() {
  router.back();
}

function finish() {
  // 以联赛「展示名」回传（市场接口 league 过滤值）；全选时置空并标记全选。
  const names = isSelectAll.value
    ? []
    : allLeagues.value
      .filter((l) => selectedIds.value.has(l.id))
      .map(leagueDisplayName);
  filterStore.setSelection(names, isSelectAll.value);
  router.back();
}

async function loadLeagues() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchLeagueList();
    allLeagues.value = res.data || [];

    if (filterStore.isAllSelected) {
      selectedIds.value = new Set(allLeagues.value.map((l) => l.id));
      isSelectAll.value = true;
    } else if (filterStore.selectedLeagues.length > 0) {
      // 由已保存的联赛名反查对应 id，恢复选中态。
      const nameSet = new Set(filterStore.selectedLeagues);
      selectedIds.value = new Set(
        allLeagues.value
          .filter((l) => nameSet.has(leagueDisplayName(l)))
          .map((l) => l.id),
      );
      isSelectAll.value = false;
    } else {
      selectedIds.value = new Set();
      isSelectAll.value = false;
    }
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadLeagues();
});
</script>

<template>
  <div class="filter-page">
    <header class="filter-page__header">
      <div class="filter-page__nav-bar">
        <button type="button" class="filter-page__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="36" height="36" alt="" />
        </button>
        <h1 class="filter-page__title">{{ t('筛选联赛') }}</h1>
      </div>
    </header>

    <div v-if="loading" class="filter-page__state">
      <div class="filter-page__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <div v-else-if="error" class="filter-page__state">
      <span>{{ t('加载失败') }}</span>
      <button type="button" class="filter-page__retry-btn" @click="loadLeagues">
        {{ t('重试') }}
      </button>
    </div>

    <template v-else>
      <div class="filter-page__body">
        <p v-if="selectedCount > 0" class="filter-page__hint">
          {{ t('已选') }}（{{ selectedCount }}）
        </p>

        <div class="filter-page__groups">
          <section
            v-for="group in groupedLeagues"
            :id="`filter-group-${group.key}`"
            :key="group.key"
            class="filter-page__group"
          >
            <h3 class="filter-page__group-label">{{ group.label }}</h3>
            <div class="filter-page__group-grid">
              <button
                v-for="league in group.leagues"
                :key="league.id"
                type="button"
                class="filter-page__pill"
                :class="{ 'filter-page__pill--selected': selectedIds.has(league.id) }"
                @click="toggleLeague(league.id)"
              >
                <span>{{ league.shortName || league.name }}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <nav
        class="filter-page__sidebar"
        :class="{ 'filter-page__sidebar--mobile': isMobile }"
        @touchstart.prevent="onSidebarTouch"
        @touchmove.prevent="onSidebarTouch"
      >
        <span
          v-for="letter in INDEX_ENTRIES"
          :key="letter"
          class="filter-page__sidebar-letter"
          :class="{ 'filter-page__sidebar-letter--active': activeIndex === letter }"
          :data-letter="letter"
          @click="scrollToGroup(letter)"
        >
          {{ letter }}
        </span>
      </nav>

      <footer class="filter-page__footer">
        <div class="filter-page__footer-left">
          <button
            type="button"
            class="filter-page__check"
            :class="{ 'filter-page__check--active': isSelectAll }"
            @click="onSelectAll"
          >
            <span class="filter-page__check-icon" />
            <span>{{ t('全选') }}</span>
          </button>
          <button
            type="button"
            class="filter-page__check"
            :class="{ 'filter-page__check--active': !isSelectAll }"
            @click="onSelectCustom"
          >
            <span class="filter-page__check-icon" />
            <span>{{ t('自选') }}</span>
          </button>
        </div>
        <button type="button" class="filter-page__done" @click="finish">
          {{ t('完成') }}
        </button>
      </footer>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.filter-page {
  position: relative;
  padding-bottom: 70px;

  @include mobile-only {
    padding-top: env(safe-area-inset-top, 20px);
  }

  @include web-only {
    @include container;
    @include web-main-column-max;
    padding-bottom: 80px;
  }

  &__header {
    position: sticky;
    z-index: 10;

    @include mobile-only {
      top: 0;
      padding: 8px;
    }

    @include web-only {
      top: $web-header-height;
      padding: 8px 16px;
    }
  }

  &__nav-bar {
    position: relative;
    display: flex;
    align-items: center;
    height: 48px;
    background: #eaf1f9;
    border: 0.8px solid #fff;
    border-radius: 30px;
    padding: 0 14px;
    box-sizing: border-box;
  }

  &__back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;

    svg {
      display: block;
      width: 36px;
      height: 36px;
    }

    &:active {
      opacity: 0.7;
    }
  }

  &__title {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    text-align: center;
    font-family: $font-family-base;
    font-weight: 500;
    color: #0b3462;
    white-space: nowrap;

    @include mobile-only {
      font-size: 14px;
    }

    @include web-only {
      font-size: $font-size-base;
    }
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-md;
    min-height: 300px;
    color: rgba(11, 52, 98, 0.6);
    font-size: $font-size-md;
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(11, 52, 98, 0.12);
    border-top-color: #1c7bff;
    border-radius: 50%;
    animation: filter-spin 0.8s linear infinite;
  }

  &__retry-btn {
    padding: 8px 24px;
    border-radius: $radius-pill;
    border: 1.5px solid #1c7bff;
    background: transparent;
    color: #1c7bff;
    font-size: $font-size-md;
    cursor: pointer;

    &:hover {
      background: #1c7bff;
      color: #fff;
    }
  }

  &__body {
    padding-right: 28px;

    @include mobile-only {
      padding-left: $spacing-lg;
      padding-top: $spacing-md;
    }

    @include web-only {
      padding-left: $spacing-xl;
      padding-top: $spacing-lg;
      padding-right: 36px;
    }
  }

  &__hint {
    margin: 0 0 $spacing-md;
    font-size: $font-size-md;
    font-weight: 400;
    color: #1c7bff;
  }

  &__groups {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__group {
    @include mobile-only {
      scroll-margin-top: calc($mobile-header-height + 56px);
    }

    @include web-only {
      scroll-margin-top: calc($web-header-height + 72px);
    }
  }

  &__group-label {
    margin: 0 0 $spacing-sm;
    font-family: $font-family-base;
    font-size: $font-size-sm;
    font-weight: 400;
    color: #000;
  }

  &__group-grid {
    display: grid;
    gap: $spacing-sm;

    @include mobile-only {
      grid-template-columns: repeat(3, 1fr);
    }

    @include web-only {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    }
  }

  &__pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 30px;
    padding: 0 $spacing-sm;
    border: none;
    border-radius: $radius-sm;
    background: #fff;
    font-family: $font-family-base;
    font-size: $font-size-sm;
    font-weight: 400;
    color: #000;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.15s, color 0.15s;

    &:active {
      opacity: 0.7;
    }

    &--selected {
      background: rgba(31, 124, 255, 0.2);
      color: #1c7bff;
    }
  }

  &__sidebar {
    position: fixed;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 4px 2px;
    user-select: none;
    -webkit-user-select: none;

    @include web-only {
      right: calc(max((100vw - #{$web-content-max + 60px}) / 2, 0px) + 6px);
    }
  }

  &__sidebar-letter {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-family: $font-family-base;
    font-size: $font-size-xs;
    font-weight: 500;
    color: rgba(11, 52, 98, 0.5);
    cursor: pointer;
    border-radius: 50%;
    transition: color 0.15s;

    &--active {
      color: #1c7bff;
      font-weight: 700;
    }
  }

  &__footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #eaf1f9;
    border: 0.8px solid #fff;
    border-radius: 16px 16px 0 0;
    box-sizing: border-box;

    @include mobile-only {
      height: 56px;
      padding: 0 $spacing-lg;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    @include web-only {
      height: 64px;
      max-width: calc($web-content-max + 60px);
      margin: 0 auto;
      padding: 0 $spacing-xl;
      box-shadow: 0 -2px 8px rgba(21, 58, 119, 0.06);
    }
  }

  &__footer-left {
    display: flex;
    align-items: center;
    gap: $spacing-lg;
  }

  &__check {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: transparent;
    font-size: $font-size-sm;
    font-weight: 400;
    color: #000;
    cursor: pointer;
  }

  &__check-icon {
    position: relative;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid #c8d0d9;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;

    .filter-page__check--active & {
      border-color: #1c7bff;
      background: #1c7bff;

      &::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 2px;
        width: 4px;
        height: 8px;
        border: solid #fff;
        border-width: 0 1.5px 1.5px 0;
        transform: rotate(45deg);
      }
    }
  }

  &__done {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 148px;
    height: 36px;
    border: none;
    border-radius: $radius-xl;
    background: #1c7bff;
    color: #fff;
    font-family: $font-family-base;
    font-size: $font-size-md;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;

    &:active {
      opacity: 0.85;
    }

    &:hover {
      opacity: 0.9;
    }
  }
}

@keyframes filter-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
