<script setup>
import { useI18n } from 'vue-i18n';

import arrowMoreIcon from '@/assets/images/common/icon_arrow_more.svg';

const emit = defineEmits(['openBinding']);
const { t } = useI18n();

const profileBindingItems = [
  { key: 'wechat', label: '微信', value: '未绑定', tone: 'wechat' },
  { key: 'qq', label: 'QQ', value: '未绑定', tone: 'qq' },
  { key: 'email', label: '邮箱', value: '未绑定', tone: 'email' },
  { key: 'bank', label: '银行卡', value: '中国银行（尾号6452）', tone: 'bank', action: 'binding' },
];

function handleItemClick(item) {
  if (item.action === 'binding') emit('openBinding');
}
</script>

<template>
  <div class="profile-modal-card profile-info-panel">
    <div class="profile-modal-notice">
      <span>!</span>
      <p>{{ t('提示：点击下方项目可以绑定或修改相关信息') }}</p>
    </div>
    <button
      v-for="item in profileBindingItems"
      :key="item.key"
      type="button"
      class="profile-info-row"
      @click="handleItemClick(item)"
    >
      <span class="profile-info-row__icon" :class="`profile-info-row__icon--${item.tone}`" />
      <span class="profile-info-row__text">
        <strong>{{ t(item.label) }}</strong>
        <em>{{ t(item.value) }}</em>
      </span>
      <img :src="arrowMoreIcon" alt="" width="20" height="20" />
    </button>
  </div>
</template>
