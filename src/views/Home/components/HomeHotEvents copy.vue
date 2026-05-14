<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MatchCard from './MatchCard.vue';

const { t } = useI18n();

const props = defineProps({
  matches: {
    type: Array,
    default: () => [],
  },
});

const defaultMatches = [
  {
    id: 1,
    league: '欧冠',
    date: '03-19 02:30',
    countdown: '10:48:46',
    homeTeam: '亚特兰大',
    awayTeam: '拜仁慕尼黑',
    homeScore: 6,
    awayScore: 1,
    volume: '10.00M',
  },
  {
    id: 2,
    league: '英超',
    date: '03-19 03:00',
    countdown: '12:18:46',
    homeTeam: '利物浦',
    awayTeam: '曼联',
    homeScore: 3,
    awayScore: 2,
    volume: '8.50M',
  },
  {
    id: 3,
    league: '西甲',
    date: '03-20 01:00',
    countdown: '24:48:46',
    homeTeam: '巴塞罗那',
    awayTeam: '皇家马德里',
    homeScore: 2,
    awayScore: 2,
    volume: '15.00M',
  },
  {
    id: 4,
    league: '德甲',
    date: '03-20 03:30',
    countdown: '27:18:46',
    homeTeam: '多特蒙德',
    awayTeam: '勒沃库森',
    homeScore: 4,
    awayScore: 0,
    volume: '6.20M',
  },
  {
    id: 5,
    league: '意甲',
    date: '03-21 01:00',
    countdown: '48:48:46',
    homeTeam: 'AC米兰',
    awayTeam: '国际米兰',
    homeScore: 1,
    awayScore: 3,
    volume: '12.80M',
  },
  {
    id: 6,
    league: '法甲',
    date: '03-21 03:00',
    countdown: '50:48:46',
    homeTeam: '巴黎圣日耳曼',
    awayTeam: '马赛',
    homeScore: 5,
    awayScore: 0,
    volume: '9.30M',
  },
  {
    id: 7,
    league: '欧联',
    date: '03-22 02:00',
    countdown: '72:48:46',
    homeTeam: '阿森纳',
    awayTeam: '罗马',
    homeScore: 2,
    awayScore: 1,
    volume: '7.10M',
  },
  {
    id: 8,
    league: '欧冠',
    date: '03-22 03:30',
    countdown: '74:18:46',
    homeTeam: '曼城',
    awayTeam: '切尔西',
    homeScore: 3,
    awayScore: 3,
    volume: '18.50M',
  },
];

const displayMatches = computed(() =>
  props.matches && props.matches.length ? props.matches : defaultMatches
);
</script>

<template>
  <section class="hot-events">
    <div class="hot-events__header">
      <div class="hot-events__title-wrap">
        <svg class="hot-events__icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#1C7BFF" fill-opacity="0.1" />
          <path d="M24 14L26.5 20H33L27.5 24L29.5 31L24 27L18.5 31L20.5 24L15 20H21.5L24 14Z" fill="#1C7BFF" />
        </svg>
        <h2 class="hot-events__title">{{ t('热门赛事') }}</h2>
      </div>
      <RouterLink to="/market" class="btn btn--primary hot-events__more-btn">
        {{ t('进入市场') }}
      </RouterLink>
    </div>

    <div class="hot-events__grid">
      <MatchCard
        v-for="match in displayMatches"
        :key="match.id"
        :match="match"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

// 热门赛事
.hot-events {
  background: var(--surface-card);
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);

  @include web-only {
    border-radius: 50px;
    padding: 40px 24px;
  }

  @include mobile-only {
    border-radius: 20px;
    padding: 16px 10px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;

    @include mobile-only {
      margin-bottom: 16px;
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__icon {
    @include mobile-only {
      width: 32px;
      height: 32px;
    }
  }

  &__title {
    font-size: 34px;
    font-weight: 700;
    background: radial-gradient(circle at 50% 100%, #68B3FD, #0D6CFB);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;

    @include mobile-only {
      font-size: 20px;
    }
  }

  &__more-btn {
    height: 48px;
    padding: 0 28px;
    font-size: $font-size-lg;
    font-weight: 500;

    @include mobile-only {
      height: 36px;
      padding: 0 16px;
      font-size: $font-size-md;
    }
  }

  &__grid {
    display: grid;
    gap: 20px;

    @include web-only {
      grid-template-columns: repeat(4, 1fr);
    }

    @include mobile-only {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
  }
}
</style>

