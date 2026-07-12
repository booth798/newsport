<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import noticeIconUrl from '@/assets/images/common/notice.svg?url';

const { t } = useI18n();

const props = defineProps({
  text: { type: String, default: '' },
});

const displayText = computed(() => props.text || t('默认公告'));

const textRef = ref(null);
const trackRef = ref(null);
const needScroll = ref(false);
const animDuration = ref(10);

function measure() {
  const text = textRef.value;
  const track = trackRef.value;
  if (!text || !track) return;
  const textW = text.scrollWidth;
  const trackW = track.clientWidth;
  needScroll.value = textW > trackW;
  if (needScroll.value) {
    const speed = 50;
    animDuration.value = Math.max(8, (textW + trackW) / speed);
  }
}

watch(displayText, () => requestAnimationFrame(measure));

onMounted(() => requestAnimationFrame(measure));

let resizeObs = null;
onMounted(() => {
  if (trackRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(measure);
    resizeObs.observe(trackRef.value);
  }
});
onBeforeUnmount(() => resizeObs?.disconnect());
</script>

<template>
  <section id="home-announcement" class="announcement-section">
    <div class="announcement">
      <div class="announcement__icon">
        <img class="announcement__icon-img" :src="noticeIconUrl" alt="" />
      </div>
      <div ref="trackRef" class="announcement__track">
        <p
          ref="textRef"
          class="announcement__text"
          :class="{ 'announcement__text--scroll': needScroll }"
          :style="needScroll ? { animationDuration: animDuration + 's' } : {}"
        >
          {{ displayText }}
        </p>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.announcement-section {
  position: relative;
}

.announcement {
  display: flex;
  align-items: center;
  background: var(--surface-card);
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);

  @include web-only {
    gap: 10px;
    border-radius: 40px;
    padding: 10px 24px 10px 20px;
    min-height: 56px;
    box-sizing: border-box;
  }

  @include mobile-only {
    gap: 6px;
    border-radius: $radius-pill;
    padding: 7px 12px 7px 10px;
    min-height: 44px;
    box-sizing: border-box;
    box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    @include web-only {
      width: 36px;
      height: 36px;
    }

    @include mobile-only {
      width: 30px;
      height: 30px;
    }
  }

  &__icon-img {
    display: block;
    object-fit: contain;

    @include web-only {
      width: 36px;
      height: 36px;
    }

    @include mobile-only {
      width: 30px;
      height: 30px;
    }
  }

  &__track {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    height: 100%;
  }

  &__text {
    margin: 0;
    color: var(--theme-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include web-only {
      font-family: $font-family-base;
      font-size: $font-size-base;
      font-weight: 400;
      line-height: normal;
      letter-spacing: 0;
      color: var(--announcement-text-pc);
    }

    @include mobile-only {
      font-family: $font-family-base;
      font-size: $font-size-md;
      font-weight: 400;
      line-height: normal;
      letter-spacing: 0;
    }

    &--scroll {
      display: inline-block;
      overflow: visible;
      text-overflow: clip;
      animation: marquee-scroll linear infinite;
      will-change: transform;

      &:hover {
        animation-play-state: paused;
      }
    }
  }
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
