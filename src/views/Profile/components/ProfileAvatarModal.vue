<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';
import { updateAvatar } from '@/api/user';
import { uploadFile } from '@/api/upload';

const emit = defineEmits(['save']);
const { t } = useI18n();
const toast = useToast();

const nickname = ref('Y0574');
const avatarFileName = ref('');
const selectedFile = ref(null);
const submitting = ref(false);

function handleAvatarFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  avatarFileName.value = file.name;
  selectedFile.value = file;
}

async function handleSave() {
  if (!selectedFile.value) {
    emit('save');
    return;
  }
  try {
    submitting.value = true;
    const uploadRes = await uploadFile(selectedFile.value, 'avatar');
    const fileRef = uploadRes.data?.ref;
    if (!fileRef) throw new Error('上传失败，未获取到文件引用');
    await updateAvatar(fileRef);
    toast.success(t('操作成功'));
    emit('save');
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
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

  <button type="button" class="profile-modal-submit" :disabled="submitting" @click="handleSave">
    {{ submitting ? t('提交中...') : t('保存') }}
  </button>
</template>
