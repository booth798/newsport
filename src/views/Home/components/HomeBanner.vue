<script setup>
import { ref } from 'vue';

const bannerIndex = ref(0);
const bannerCount = 3;

const nextBanner = () => {
  bannerIndex.value = (bannerIndex.value + 1) % bannerCount;
};

const prevBanner = () => {
  bannerIndex.value = (bannerIndex.value + bannerCount - 1) % bannerCount;
};
</script>

<template>
  <section class="home-banner">
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
          v-for="i in bannerCount"
          :key="i"
          class="banner__dot"
          :class="{ active: bannerIndex === i - 1 }"
          @click="bannerIndex = i - 1"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

// 轮播在 PC 端按 Header 的导航容器宽度对齐：
// Header 使用 @include container（web-only padding-inline: 30px），这里复用同一套规则，
// 但不加 Home 页内容区的 max-width 限制。
.home-banner {
  @include container;

  @include web-only {
    padding-top: 0;
    margin-bottom: 20px;
  }
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
</style>

