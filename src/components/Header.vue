<script setup>
import { computed } from 'vue';
import { useAsset } from '@/hooks/useAsset';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/store/modules/app';
import { storeToRefs } from 'pinia'

const { t } = useI18n();

const { getTemplateImage, getCommonImage } = useAsset();

const appStore = useAppStore();

const { isMobile } = storeToRefs(appStore);

const navbarList = [
    {label: t('首页'), key: 'home', to: '/'},
    {label: t('市场'), key: 'market', to: '/market'},
    {label: t('交易账务'), key: 'trade', to: '/trade'},
    {label: t('会员服务'), key: 'member', to: '/member'},
    {label: t('我的权益'), key: 'myBenefit', to: '/myBenefit'},
]   

</script>
<template>
  <div class="header">
    <div class="card-primary">
        <img class="logo" :src="getTemplateImage('logo')" alt="logo" />
        <div class="navbar" v-if="!isMobile">
            <div class="navbar-item" v-for="item in navbarList" :key="item.to">
                <img class="navbar-item-icon" :src="getCommonImage('navbar_home.png')" alt="icon" v-if="item.key === 'home'" />
                {{ item.label }}
                <img class="arrow-icon" :src="getCommonImage('arrow_down.png')" v-if="item.key !== 'home'" />
            </div>
        </div>
        <div class="i18n-select">
            <img class="i18n-icon" v-for="item in ['cn', 'en']" :src="getCommonImage('i18n_' + item + '.png')" :key="item">
        </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;
.header {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: var(--theme-bg);
    z-index: 10;
    .card-primary {
        display: flex;
        align-items: center;
    }
    @include container;
    @include web-only {
        padding-top: 30px;
        height: $web-header-height;
        .card-primary {
            height: 80px;
            border-radius: 40px;
            padding: 0 40px;
            .logo {
                height: 36px;
                cursor: pointer;
            }
            .navbar {
                display: flex;
                align-items: center;
                margin-left: 20px;
                .navbar-item {
                    display: flex;
                    align-items: center;
                    font-size: 17px;
                    color: #171E24;
                    min-width: 104px;
                    justify-content: center;
                    cursor: pointer;
                    .navbar-item-icon {
                        width: 18px;
                        height: 18px;
                        margin-right: 8px;
                    }
                    .arrow-icon {
                        width: 10px;
                        height: 6px;
                        margin-left: 8px;
                    }
                    &.active {
                        color: var(--theme-primary);
                    }
                }
            }
            .i18n-select {
                margin-left: auto;
                height: 48px;
                background: #F0F7FF;
                border: 1px solid #D6E0EB;
                border-radius: 38px;
                padding: 4px;
                display: flex;
                gap: 4px;
                .i18n-icon {
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                }
            }
        }
    }
    @include mobile-only {
        // height: $mobile-header-height;
    }
}
</style>