<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import bannerDefault from '@/assets/images/slide/banner.png';
import slideLeftIcon from '@/assets/images/common/icon_slide-left.svg';
import slideLeftHoverIcon from '@/assets/images/common/icon_slide-left_hover.svg';
import slideRightIcon from '@/assets/images/common/icon_slide-right.svg';
import slideRightHoverIcon from '@/assets/images/common/icon_slide-right_hover.svg';
import logoUrl from '@/assets/images/common/logo_nav.svg?url';
import { fetchBanners, reportBannerClick } from '@/api/match';

const props = defineProps({
  banners: { type: Array, default: () => [] },
});

const bannerItems = ref([]);

watch(
  () => props.banners,
  (val) => {
    if (val && val.length) {
      bannerItems.value = val;
      bannerIndex.value = 0;
      startAutoPlay();
    }
  },
);
const isEmpty = computed(() => bannerItems.value.length === 0);
const bannerSlides = computed(() =>
  bannerItems.value.length
    ? bannerItems.value.map((b) => b.imageUrl || bannerDefault)
    : [bannerDefault],
);

const bannerIndex = ref(0);
const bannerCount = computed(() => bannerSlides.value.length);
const isTransitioning = ref(true);

const trackStyle = computed(() => ({
  transform: `translateX(-${bannerIndex.value * (100 / bannerSlides.value.length)}%)`,
  width: `${bannerSlides.value.length * 100}%`,
  transition: isTransitioning.value ? 'transform 0.35s ease' : 'none',
}));

const nextBanner = () => {
  const n = bannerCount.value;
  if (n <= 1) return;
  bannerIndex.value = (bannerIndex.value + 1) % n;
};

const prevBanner = () => {
  const n = bannerCount.value;
  if (n <= 1) return;
  bannerIndex.value = (bannerIndex.value + n - 1) % n;
};

let autoTimer = null;
const AUTO_INTERVAL = 4000;

function startAutoPlay() {
  stopAutoPlay();
  if (bannerCount.value <= 1) return;
  autoTimer = setInterval(nextBanner, AUTO_INTERVAL);
}

function stopAutoPlay() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

async function loadBanners() {
  try {
    const res = await fetchBanners('home', 'h5');
    const list = res.data || [];
    if (list.length) {
      bannerItems.value = list;
      bannerIndex.value = 0;
      startAutoPlay();
    }
  } catch { /* 加载失败使用默认图 */ }
}

function handleBannerClick(idx) {
  const item = bannerItems.value[idx];
  if (!item) return;
  if (item.id) {
    reportBannerClick(item.id).catch(() => {});
  }
  if (item.linkUrl) {
    window.open(item.linkUrl, '_blank', 'noopener');
  }
}

onMounted(() => {
  loadBanners();
  startAutoPlay();
});
onBeforeUnmount(() => stopAutoPlay());

const touchStartX = ref(0);
const touchDeltaX = ref(0);

function onTouchStart(e) {
  stopAutoPlay();
  touchStartX.value = e.touches[0].clientX;
  touchDeltaX.value = 0;
}

function onTouchMove(e) {
  touchDeltaX.value = e.touches[0].clientX - touchStartX.value;
}

function onTouchEnd() {
  const threshold = 50;
  if (touchDeltaX.value < -threshold) {
    nextBanner();
  } else if (touchDeltaX.value > threshold) {
    prevBanner();
  }
  touchDeltaX.value = 0;
  startAutoPlay();
}
</script>

<template>
  <section class="home-banner">
    <div class="banner" :class="{ 'banner--empty': isEmpty }">
      <template v-if="isEmpty">
        <div class="banner__placeholder">
          <img class="banner__placeholder-logo" :src="logoUrl" alt="" />
        </div>
      </template>
      <template v-else>
        <div
          class="banner__slide"
          :style="{ '--banner-count': bannerCount }"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
          @mouseenter="stopAutoPlay"
          @mouseleave="startAutoPlay"
        >
          <div class="banner__track" :style="trackStyle">
            <div
              v-for="(src, idx) in bannerSlides"
              :key="bannerItems[idx]?.id || idx"
              class="banner__item"
              @click="handleBannerClick(idx)"
            >
              <img class="banner__img" :src="src" alt="" />
            </div>
          </div>
        </div>

        <button type="button" class="banner__arrow banner__arrow--left" @click="prevBanner">
          <span class="banner__arrow-stack">
            <img class="banner__arrow-img" :src="slideLeftIcon" alt="" />
            <img class="banner__arrow-img banner__arrow-img--hover" :src="slideLeftHoverIcon" alt="" />
          </span>
        </button>
        <button type="button" class="banner__arrow banner__arrow--right" @click="nextBanner">
          <span class="banner__arrow-stack">
            <img class="banner__arrow-img" :src="slideRightIcon" alt="" />
            <img class="banner__arrow-img banner__arrow-img--hover" :src="slideRightHoverIcon" alt="" />
          </span>
        </button>

        <div v-if="bannerCount > 1" class="banner__dots">
          <span
            v-for="i in bannerCount"
            :key="i"
            class="banner__dot"
            :class="{ active: bannerIndex === i - 1 }"
            @click="bannerIndex = i - 1"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

// 轮播与 Header、`.home__inner` 共用 `container` + `web-main-column-max`，大屏左右对齐。
.home-banner {
  @include container;
  @include web-main-column-max;
  margin-top: 0;
  margin-bottom: 8px;

  @include web-only {
    margin-top: 10px;
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
    height: 136px;
  }

  &--empty {
    border: none;
    box-shadow: none;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: linear-gradient(135deg, #d6e8ff 0%, #eaf3fd 50%, #d1e3fa 100%);
    border-radius: inherit;
  }

  &__placeholder-logo {
    @include web-only {
      width: 180px;
      height: auto;
    }

    @include mobile-only {
      width: 100px;
      height: auto;
    }

    opacity: 0.6;
  }

  &__slide {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  &__track {
    display: flex;
    height: 100%;
    transition: transform 0.35s ease;
    will-change: transform;
  }

  &__item {
    flex: 0 0 calc(100% / var(--banner-count, 1));
    height: 100%;
    min-width: 0;
  }

  &__img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
  }

  &__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 86px;
    height: 86px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;

    &:hover .banner__arrow-img--hover,
    &:focus-visible .banner__arrow-img--hover {
      opacity: 1;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.65);
      outline-offset: 2px;
    }

    &-stack {
      position: relative;
      display: block;
      width: 86px;
      height: 86px;
    }

    &-img {
      width: 86px;
      height: 86px;
      display: block;
      pointer-events: none;

      &--hover {
        position: absolute;
        inset: 0;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
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

