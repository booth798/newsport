<script setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import HomeMatchCard from './HomeMatchCard.vue';

import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconHotUrl from '@/assets/images/events/icon_hot.svg?url';
import iconChampionUrl from '@/assets/images/events/icon_champion.svg?url';
import iconUkUrl from '@/assets/images/events/icon_uk.svg?url';
import iconItalyUrl from '@/assets/images/events/icon_italy.svg?url';
import iconSpainUrl from '@/assets/images/events/icon_spain.svg?url';
import iconGermaryUrl from '@/assets/images/events/icon_germary.svg?url';
import iconFranceUrl from '@/assets/images/events/icon_france.svg?url';
import btnMoreUrl from '@/assets/images/events/btn_more.svg?url';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const props = defineProps({
  matches: {
    type: Array,
    default: () => [],
  },
});

const defaultMatches = [
  {
    id: 1,
    league: '西甲',
    date: '03-19 02:30',
    countdown: '10:48:46',
    homeTeam: '马德里竞技',
    awayTeam: '赫塔菲',
    homeScore: 1,
    awayScore: 0,
    volume: '10.00M',
  },
  {
    id: 2,
    league: '欧冠',
    date: '03-19 02:30',
    countdown: '10:48:46',
    homeTeam: '亚特兰大',
    awayTeam: '拜仁慕尼黑',
    homeScore: 1,
    awayScore: 6,
    volume: '10.00M',
  },
  {
    id: 3,
    league: '英超',
    date: '03-19 03:00',
    countdown: '12:18:46',
    homeTeam: '托特纳姆热刺',
    awayTeam: '国际米兰',
    homeScore: 2,
    awayScore: 3,
    volume: '8.50M',
  },
  {
    id: 4,
    league: '意甲',
    date: '03-20 01:00',
    countdown: '24:48:46',
    homeTeam: '国际米兰',
    awayTeam: '亚特兰大',
    homeScore: 2,
    awayScore: 2,
    volume: '15.00M',
  },
  {
    id: 5,
    league: '德甲',
    date: '03-20 03:30',
    countdown: '27:18:46',
    homeTeam: '拜仁慕尼黑',
    awayTeam: '马德里竞技',
    homeScore: 4,
    awayScore: 0,
    volume: '6.20M',
  },
  {
    id: 6,
    league: '西甲',
    date: '03-21 01:00',
    countdown: '48:48:46',
    homeTeam: '赫塔菲',
    awayTeam: '马德里竞技',
    homeScore: 1,
    awayScore: 3,
    volume: '12.80M',
  },
  {
    id: 7,
    league: '欧冠',
    date: '03-21 03:00',
    countdown: '50:48:46',
    homeTeam: '拜仁慕尼黑',
    awayTeam: '托特纳姆热刺',
    homeScore: 5,
    awayScore: 0,
    volume: '9.30M',
  },
  {
    id: 8,
    league: '英超',
    date: '03-22 02:00',
    countdown: '72:48:46',
    homeTeam: '国际米兰',
    awayTeam: '热刺',
    homeScore: 2,
    awayScore: 1,
    volume: '7.10M',
  },
];

const leagueTabs = [
  { key: 'hot', labelKey: '热门赛事', shortLabelKey: '热门', icon: iconHotUrl },
  { key: '欧冠', labelKey: '欧冠赛事', shortLabelKey: '欧冠', icon: iconChampionUrl },
  { key: '英超', labelKey: '英超赛事', shortLabelKey: '英超', icon: iconUkUrl },
  { key: '意甲', labelKey: '意甲赛事', shortLabelKey: '意甲', icon: iconItalyUrl },
  { key: '西甲', labelKey: '西甲赛事', shortLabelKey: '西甲', icon: iconSpainUrl },
  { key: '德甲', labelKey: '德甲赛事', shortLabelKey: '德甲', icon: iconGermaryUrl },
  { key: '法甲', labelKey: '法甲赛事', shortLabelKey: '法甲', icon: iconFranceUrl },
];

const tabLabel = (tab) => {
  if (isMobile.value && tab.shortLabelKey) return t(tab.shortLabelKey);
  return t(tab.labelKey);
};

const activeLeague = ref('hot');

const displayMatches = computed(() =>
  props.matches && props.matches.length ? props.matches : defaultMatches,
);

const filteredMatches = computed(() => {
  if (activeLeague.value === 'hot') return displayMatches.value;
  return displayMatches.value.filter((m) => m.league === activeLeague.value);
});
</script>

<template>
  <section class="hot-events">
    <div class="hot-events__head">
      <div class="hot-events__title-wrap">
        <img class="hot-events__title-icon" :src="iconEventsUrl" alt="" />
        <h2 class="hot-events__title">{{ t('热门赛事') }}</h2>
      </div>

      <div class="hot-events__tabs" role="tablist" :aria-label="t('热门赛事')">
        <button
          v-for="tab in leagueTabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="hot-events__tab"
          :class="{ 'hot-events__tab--active': activeLeague === tab.key }"
          :aria-selected="activeLeague === tab.key"
          @click="activeLeague = tab.key"
        >
          <img class="hot-events__tab-icon" :src="tab.icon" alt="" />
          <span class="hot-events__tab-label">{{ tabLabel(tab) }}</span>
        </button>
      </div>

      <RouterLink
        to="/market"
        class="hot-events__more"
        :aria-label="t('更多市场')"
      >
        <img class="hot-events__more-img" :src="btnMoreUrl" alt="" />
      </RouterLink>
    </div>

    <div v-if="!filteredMatches.length" class="hot-events__empty">
      {{ t('暂无数据') }}
    </div>
    <div v-else class="hot-events__grid">
      <HomeMatchCard v-for="match in filteredMatches" :key="match.id" :match="match" />
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.hot-events {
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
    /* 稿：上 15px、左右 12px（与标题区标注一致） */
    padding: 15px 12px 16px;
    background: #fafaff;
    box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
  }

  &__head {
    @include web-only {
      display: grid;
      grid-template-columns: auto 1fr auto;
      /* 与 `__tabs` 仅 `padding-bottom` 留阴影位搭配：`center` 会把不对称的 tabs 整体上移，与左侧标题顶不齐 */
      align-items: start;
      column-gap: 24px;
      /* 标题栏与下方卡片区间距（稿约 32–40px） */
      margin-bottom: 32px;
    }

    @include mobile-only {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      column-gap: 8px;
      row-gap: 10px;
      margin-bottom: 12px;
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    @include mobile-only {
      grid-column: 1;
      grid-row: 1;
      gap: 8px;
      min-width: 0;
    }
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
      line-height: 1;
      letter-spacing: 0;
      -webkit-text-fill-color: var(--theme-primary);
      color: var(--theme-primary);
      background: none;
    }
  }

  &__more {
    flex-shrink: 0;
    display: inline-block;
    padding: 0;
    margin: 0;
    border: 0;
    line-height: 0;
    text-decoration: none;
    background: transparent;
    box-shadow: none;

    @include web-only {
      grid-column: 3;
      grid-row: 1;
      /* 与标题区首行顶对齐；按钮图略矮时在行内垂直居中，避免贴顶悬空 */
      align-self: center;
    }

    @include mobile-only {
      grid-column: 2;
      grid-row: 1;
      align-self: center;
    }
  }

  &__more-img {
    display: block;
    padding: 0;
    margin: 0;
    border: 0;
    width: 170px;
    max-width: 100%;
    height: auto;

    @include mobile-only {
      /* 约 170:64，与稿图比例一致；较原 70×26 明显放大，便于点击 */
      width: 108px;
      height: auto;
      max-width: none;
      object-fit: contain;
    }
  }

  &__tabs {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    @include web-only {
      gap: 6px;
      min-width: 0;
      grid-column: 2;
      grid-row: 1;
      /* overflow-x: auto 会令 overflow-y 变为 auto，子元素 box-shadow 会被裁切；留出与阴影相当的底部内边距 */
      padding-bottom: 14px;
    }

    @include mobile-only {
      gap: 10px;
      grid-column: 1 / -1;
      grid-row: 2;
      width: 100%;
      min-width: 0;
      padding-bottom: 12px;
      margin: 0;
    }
  }

  &__tab {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    cursor: pointer;
    font-family: $font-family-base;
    border: none;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;

    @include web-only {
      min-width: 120px;
      min-height: 40px;
      padding: 10px 14px;
      gap: 10px;
      border-radius: 48px;
      border: 1px solid #d6e0eb;
      background: #fafaff;
      box-shadow: 0 2px 8px rgba(21, 58, 119, 0.1);
      font-size: 16px;
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0;
      /* 默认：稿图主字色 #0B3462（勿用偏灰的 rgba） */
      color: var(--theme-text);

      &--active {
        border-color: #1f7cff;
        background: #f0f7ff;
        /* 高亮字色与描边同色（Figma 热门赛事选中态） */
        color: #1f7cff;
        box-shadow: 0 3px 10px rgba(21, 58, 119, 0.14);
      }
    }

    @include mobile-only {
      height: 26px;
      min-width: 70px;
      padding: 0 10px;
      gap: 4px;
      border-radius: 48px;
      border: 1px solid rgba(214, 224, 235, 0.55);
      background: transparent;
      box-shadow: none;
      font-size: 12px;
      font-weight: 400;
      line-height: 1;
      color: var(--theme-text);

      &--active {
        border: 1px solid #1f7cff;
        background: #fff;
        color: #1f7cff;
        box-shadow: 0 3px 8px 0 rgba(21, 58, 119, 0.1);
      }
    }
  }

  &__tab-icon {
    flex-shrink: 0;
    object-fit: contain;
    display: block;

    @include web-only {
      width: 24px;
      height: 24px;
    }

    @include mobile-only {
      width: 18px;
      height: 18px;
    }
  }

  &__tab-label {
    white-space: nowrap;
  }

  &__empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  &__grid {
    display: grid;
    gap: 20px;

    @include web-only {
      grid-template-columns: repeat(4, 1fr);
    }

    @include mobile-only {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }
}
</style>
