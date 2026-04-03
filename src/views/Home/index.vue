<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MatchCard from './components/MatchCard.vue';

const { t } = useI18n();

const bannerIndex = ref(0);

const announcement = ref(
  '大中华区人工客服工作时间为09:00-21:00，为了给大家更好的体验感，请尽量在这个时间段办理相关业务，感谢配合，如有造成不便敬请理解。'
);

const matchList = ref([
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
]);

const nextBanner = () => {
  bannerIndex.value = (bannerIndex.value + 1) % 3;
};

const prevBanner = () => {
  bannerIndex.value = (bannerIndex.value + 2) % 3;
};
</script>

<template>
  <div class="home">
    <div class="home__inner">
      <!-- Banner -->
      <section class="banner-section">
        <div class="banner">
          <div class="banner__slide">
            <div class="banner__placeholder">
              UNIBET
            </div>
          </div>
          <button class="banner__arrow banner__arrow--left" @click="prevBanner">
            <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
              <path d="M12 2L2 12L12 22" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="banner__arrow banner__arrow--right" @click="nextBanner">
            <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
              <path d="M2 2L12 12L2 22" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="banner__dots">
            <span
              v-for="i in 3"
              :key="i"
              class="banner__dot"
              :class="{ active: bannerIndex === i - 1 }"
              @click="bannerIndex = i - 1"
            />
          </div>
        </div>
      </section>

      <!-- 公告 -->
      <section class="announcement-section">
        <div class="announcement">
          <div class="announcement__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#1C7BFF" stroke-width="1.5"/>
              <path d="M10 6V11M10 13.5V14" stroke="#1C7BFF" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="announcement__text">{{ announcement }}</p>
        </div>
      </section>

      <!-- 热门赛事 -->
      <section class="hot-events">
        <div class="hot-events__header">
          <div class="hot-events__title-wrap">
            <svg class="hot-events__icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#1C7BFF" fill-opacity="0.1"/>
              <path d="M24 14L26.5 20H33L27.5 24L29.5 31L24 27L18.5 31L20.5 24L15 20H21.5L24 14Z" fill="#1C7BFF"/>
            </svg>
            <h2 class="hot-events__title">{{ t('热门赛事') }}</h2>
          </div>
          <RouterLink to="/market" class="btn btn--primary hot-events__more-btn">
            {{ t('进入市场') }}
          </RouterLink>
        </div>

        <div class="hot-events__grid">
          <MatchCard
            v-for="match in matchList"
            :key="match.id"
            :match="match"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.home {
  &__inner {
    @include container;
    display: flex;
    flex-direction: column;

    @include web-only {
      max-width: calc($web-content-max + 60px);
      margin: 0 auto;
      gap: 20px;
      padding-bottom: 60px;
    }

    @include mobile-only {
      gap: 10px;
      padding-bottom: 30px;
    }
  }
}

// Banner
.banner-section {
  position: relative;
}

.banner {
  position: relative;
  overflow: hidden;

  @include web-only {
    border-radius: 40px;
    height: 520px;
    border: 1px solid;
    border-image-source: linear-gradient(135deg, #E3EDF9 0%, #2E5A9D 35%, #242538 100%);
    box-shadow: 0 6px 20px rgba(21, 58, 119, 0.18);
  }

  @include mobile-only {
    border-radius: 16px;
    height: 200px;
  }

  &__slide {
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a5bc4, #3b8beb, #0b3e8a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.15);
    font-family: $font-family-num;
    letter-spacing: 16px;

    @include mobile-only {
      font-size: 28px;
      letter-spacing: 6px;
    }
  }

  &__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 86px;
    height: 86px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid;
    border-image-source: linear-gradient(143deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.2) 21%, rgba(255, 255, 255, 0.02));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    z-index: 2;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    &--left {
      left: 0;
    }

    &--right {
      right: 0;
    }

    @include mobile-only {
      display: none;
    }
  }

  &__dots {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 2;
  }

  &__dot {
    width: 14px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      width: 28px;
      background: var(--auxiliary-1);
    }
  }
}

// 公告
.announcement-section {
  position: relative;
}

.announcement {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-card);
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);

  @include web-only {
    border-radius: 40px;
    padding: 16px 24px;
  }

  @include mobile-only {
    border-radius: 12px;
    padding: 10px 12px;
  }

  &__icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  &__text {
    margin: 0;
    font-size: $font-size-base;
    color: var(--theme-primary);
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include mobile-only {
      font-size: $font-size-sm;
    }
  }
}

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
