<script setup>
import HomeBanner from './components/HomeBanner.vue';
import HomeAnnouncement from './components/HomeAnnouncement.vue';
import HomeHotEvents from './components/HomeHotEvents.vue';
</script>

<template>
  <div class="home">
    <HomeBanner />

    <div class="home__inner">
      <!-- 公告 -->
      <HomeAnnouncement />

      <!-- 热门赛事 -->
      <HomeHotEvents />
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
      gap: 8px;
      padding-bottom: 30px;
    }
  }
}
</style>
