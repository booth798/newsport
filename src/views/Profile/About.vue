<script setup>
import { SITE_CONFIG } from '@/config/site';
import logoUrl from '@/assets/images/common/logo_login.svg?url';
</script>

<template>
  <div class="about-page">
    <div class="about-card">
      <div class="about-card__logo">
        <img :src="logoUrl" :alt="SITE_CONFIG.siteName" />
      </div>
      <h2 class="about-card__name">{{ SITE_CONFIG.siteName }}</h2>
      <p class="about-card__version">V1.0.0</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.about-page {
  padding: 0 16px;

  @include mobile-only {
    padding: 0 8px;
  }
}

.about-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px 40px;
  background: rgba(234, 241, 249, 0.72);
  border-radius: 12px;
  border: 0.8px solid #fff;

  &__logo {
    width: 88px;
    height: 88px;
    border-radius: 16px;
    background: #1c7bff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      width: 60px;
      height: 60px;
      object-fit: contain;
      filter: brightness(0) invert(1);
    }
  }

  &__name {
    margin: 16px 0 0;
    font-size: 18px;
    font-weight: 700;
    color: #0b3462;
  }

  &__version {
    margin: 6px 0 0;
    font-size: 14px;
    color: rgba(11, 52, 98, 0.42);
    font-weight: 500;
  }
}
</style>
