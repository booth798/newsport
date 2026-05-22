<script setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchMarketList } from '@/api/match';

const { t } = useI18n();

const tabs = [
  { key: 'all', labelKey: '全部' },
  { key: 'football', labelKey: '足球' },
  { key: 'basketball', labelKey: '篮球' },
  { key: 'esports', labelKey: '电竞' },
];
const activeTab = ref('all');
const markets = ref([]);
const loading = ref(true);
const error = ref(false);

async function loadMarkets() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchMarketList(activeTab.value);
    markets.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadMarkets);
watch(activeTab, loadMarkets);
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

      <div v-if="loading" class="market-loading">
        <div class="market-loading__spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <div v-else-if="error" class="market-error">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="market-error__retry" @click="loadMarkets">{{ t('重试') }}</button>
      </div>

      <div v-else-if="markets.length === 0" class="market-empty">
        <p class="market-empty__text">{{ t('暂无相关赛事') }}</p>
      </div>

      <div v-else class="market-list">
        <RouterLink v-for="item in markets" :key="item.id" :to="`/market/${item.id}`" class="market-item card-default">
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

.market-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  color: var(--theme-text-1);
  font-size: $font-size-md;

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.market-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  color: var(--theme-text-1);
  font-size: $font-size-md;

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
