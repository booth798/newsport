<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['save']);
const { t } = useI18n();

const nickname = ref('Y0574');
const avatarFileName = ref('');

function handleAvatarFileChange(event) {
  const file = event.target.files?.[0];
  avatarFileName.value = file?.name || '';
}
</script>

<template>
  <div class="profile-modal-card profile-modal-card--upload">
    <span class="profile-field-label">{{ t('头像') }}</span>
    <label class="profile-upload">
      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" @change="handleAvatarFileChange" />
      <span class="profile-upload__plus">+</span>
      <span class="profile-upload__text">{{ avatarFileName || t('点击头像上传图片') }}</span>
      <span class="profile-upload__hint">{{ t('头像上传格式说明') }}</span>
    </label>
  </div>

  <label class="profile-modal-card profile-form-field">
    <span class="profile-field-label">{{ t('昵称') }}</span>
    <input v-model="nickname" class="profile-modal-input" />
  </label>

  <button type="button" class="profile-modal-submit" @click="emit('save')">
    {{ t('保存') }}
  </button>
</template>
