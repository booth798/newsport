<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const SPORT_LEAGUES = {
  football: ['欧冠', '英超', '西甲', '德甲', '意甲', '法甲'],
  basketball: ['NBA', 'CBA', '欧篮'],
  esports: ['LPL', 'LCK', 'DOTA2'],
};

const tabs = [
  { key: 'all', labelKey: '全部' },
  { key: 'football', labelKey: '足球' },
  { key: 'basketball', labelKey: '篮球' },
  { key: 'esports', labelKey: '电竞' },
];
const activeTab = ref('all');

const markets = ref([
  {
    id: 1,
    league: '欧冠',
    sport: 'football',
    date: '03-19 02:30',
    homeTeam: '亚特兰大',
    awayTeam: '拜仁慕尼黑',
    homeOdds: 2.45,
    drawOdds: 3.20,
    awayOdds: 2.80,
    volume: '10.00M',
    status: 'upcoming',
  },
  {
    id: 2,
    league: '英超',
    sport: 'football',
    date: '03-19 03:00',
    homeTeam: '利物浦',
    awayTeam: '曼联',
    homeOdds: 1.85,
    drawOdds: 3.50,
    awayOdds: 4.20,
    volume: '8.50M',
    status: 'upcoming',
  },
  {
    id: 3,
    league: '西甲',
    sport: 'football',
    date: '03-20 01:00',
    homeTeam: '巴塞罗那',
    awayTeam: '皇家马德里',
    homeOdds: 2.10,
    drawOdds: 3.30,
    awayOdds: 3.40,
    volume: '15.00M',
    status: 'upcoming',
  },
  {
    id: 4,
    league: '德甲',
    sport: 'football',
    date: '03-20 03:30',
    homeTeam: '多特蒙德',
    awayTeam: '勒沃库森',
    homeOdds: 2.60,
    drawOdds: 3.10,
    awayOdds: 2.70,
    volume: '6.20M',
    status: 'live',
  },
  {
    id: 5,
    league: '意甲',
    sport: 'football',
    date: '03-21 01:00',
    homeTeam: 'AC米兰',
    awayTeam: '国际米兰',
    homeOdds: 3.20,
    drawOdds: 3.10,
    awayOdds: 2.25,
    volume: '12.80M',
    status: 'upcoming',
  },
]);

const filteredMarkets = computed(() => {
  if (activeTab.value === 'all') return markets.value;
  return markets.value.filter((m) => m.sport === activeTab.value);
});
</script>

<template>
  <div class="market-page">
    <div class="market-page__inner">
      <div class="market-page__header">
        <h2 class="market-page__title">{{ t('市场') }}</h2>
        <div class="market-tabs">
          <button v-for="tab in tabs" :key="tab.key" class="market-tab" :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key">
            {{ t(tab.labelKey) }}
          </button>
        </div>
      </div>

      <div v-if="filteredMarkets.length === 0" class="market-empty">
        <p class="market-empty__text">{{ t('暂无相关赛事') }}</p>
      </div>

      <div v-else class="market-list">
        <RouterLink v-for="item in filteredMarkets" :key="item.id" :to="`/market/${item.id}`" class="market-item card-default">
          <div class="market-item__top">
            <span class="market-item__league">{{ item.league }}</span>
            <span class="market-item__date">{{ item.date }}</span>
            <span class="market-item__status" :class="{ live: item.status === 'live' }">
              {{ item.status === 'live' ? 'LIVE' : t('未开赛') }}
            </span>
          </div>

          <div class="market-item__teams">
            <div class="market-item__team">
              <div class="market-item__team-avatar">{{ item.homeTeam.charAt(0) }}</div>
              <span class="market-item__team-name">{{ item.homeTeam }}</span>
            </div>
            <span class="market-item__vs">VS</span>
            <div class="market-item__team">
              <div class="market-item__team-avatar">{{ item.awayTeam.charAt(0) }}</div>
              <span class="market-item__team-name">{{ item.awayTeam }}</span>
            </div>
          </div>

          <div class="market-item__odds">
            <div class="odds-btn">
              <span class="odds-btn__label">{{ t('主队') }}</span>
              <span class="odds-btn__value">{{ item.homeOdds }}</span>
            </div>
            <div class="odds-btn">
              <span class="odds-btn__label">{{ t('平') }}</span>
              <span class="odds-btn__value">{{ item.drawOdds }}</span>
            </div>
            <div class="odds-btn">
              <span class="odds-btn__label">{{ t('客队') }}</span>
              <span class="odds-btn__value">{{ item.awayOdds }}</span>
            </div>
          </div>

          <div class="market-item__volume">
            {{ t('总成交量冒号') }}<strong>{{ item.volume }}</strong>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.market-page {
  @include container;
  padding-top: $spacing-xl;
  padding-bottom: $spacing-4xl;

  &__inner {
    @include web-only {
      max-width: $web-content-max;
      margin: 0 auto;
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xl;

    @include mobile-only {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-md;
    }
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: var(--theme-text);
    margin: 0;
  }
}

.market-tabs {
  display: flex;
  gap: $spacing-sm;
}

.market-tab {
  padding: 8px 20px;
  border-radius: $radius-pill;
  font-size: $font-size-md;
  color: var(--theme-text);
  background: transparent;
  border: 1.5px solid var(--theme-divider);
  cursor: pointer;
  transition: all 0.2s;

  &:hover,
  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.market-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.market-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  padding: $spacing-xl;
  border-radius: $radius-lg;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(21, 58, 119, 0.15);
  }

  &__top {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__league {
    font-size: $font-size-base;
    font-weight: 600;
    color: var(--theme-text);
  }

  &__date {
    font-family: $font-family-num;
    font-size: $font-size-md;
    color: var(--theme-text-1);
  }

  &__status {
    margin-left: auto;
    font-size: $font-size-sm;
    padding: 4px 10px;
    border-radius: $radius-pill;
    background: var(--theme-divider);
    color: var(--theme-text-1);

    &.live {
      background: var(--auxiliary-2);
      color: #fff;
      animation: pulse 2s infinite;
    }
  }

  &__teams {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-3xl;

    @include mobile-only {
      gap: $spacing-xl;
    }
  }

  &__team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
    min-width: 80px;
  }

  &__team-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--surface-tint);
    border: 1px solid var(--theme-divider);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--theme-primary);

    @include mobile-only {
      width: 40px;
      height: 40px;
      font-size: $font-size-base;
    }
  }

  &__team-name {
    font-size: $font-size-md;
    font-weight: 500;
    color: var(--theme-text);
    text-align: center;

    @include mobile-only {
      font-size: $font-size-sm;
    }
  }

  &__vs {
    font-family: $font-family-num;
    font-size: 28px;
    font-weight: 800;
    color: var(--theme-primary);

    @include mobile-only {
      font-size: 20px;
    }
  }

  &__odds {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
  }

  &__volume {
    text-align: center;
    font-size: $font-size-md;
    color: var(--theme-text-1);

    strong {
      color: var(--theme-primary);
      font-family: $font-family-num;
    }
  }
}

.odds-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--theme-primary);
    background: rgba(28, 123, 255, 0.04);
  }

  &__label {
    font-size: $font-size-sm;
    color: var(--theme-text-1);
  }

  &__value {
    font-family: $font-family-num;
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--theme-text);
  }
}

.market-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  background: var(--surface-card);
  border-radius: $radius-lg;
  border: 1.5px dashed var(--theme-divider);

  &__text {
    font-size: $font-size-base;
    color: var(--theme-text-1);
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}
</style>
