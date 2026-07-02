<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchMessages } from '@/api/user';

import arrowMoreIcon from '@/assets/images/common/icon_arrow_more.svg';

const { t } = useI18n();

const messageItems = ref([
  { id: 1, type: '系统消息', content: 'UI重大更新提醒！！' },
  { id: 2, type: '系统消息', content: '恭喜您成功注册UNIBET！' },
  { id: 3, type: '客服消息', content: '恭喜您成功注册UNIBET！' },
]);

onMounted(async () => {
  try {
    const res = await fetchMessages({ pageSize: 20 });
    const list = res.data || [];
    if (list.length) {
      messageItems.value = list.map((m) => ({
        id: m.id,
        type: m.category || m.type || '系统消息',
        content: m.title || m.content || '',
        time: m.time || '',
      }));
    }
  } catch { /* keep fallback */ }
});
</script>

<template>
  <div class="profile-modal-card profile-message-list">
    <button v-for="item in messageItems" :key="item.id" type="button" class="profile-message-row">
      <span class="profile-message-row__icon" />
      <span class="profile-message-row__text">
        <strong>{{ t(item.type) }}</strong>
        <em>{{ item.content }}</em>
        <small v-if="item.time" class="profile-message-row__time">{{ item.time }}</small>
      </span>
      <img :src="arrowMoreIcon" alt="" width="20" height="20" />
    </button>
  </div>
</template>
