<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { updateNickname, updateAvatar } from '@/api/user';
import { uploadFile } from '@/api/upload';
import { useToast } from '@/hooks/useToast';
import { useUserStore } from '@/store/modules/user';
import BaseInput from '@/components/BaseInput.vue';
import BaseModal from '@/components/BaseModal.vue';

import iconProfileAvatarAdd from '@/assets/images/profile/icon_profile_avatar_add.png?url';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  nickname: {
    type: String,
    default: '',
  },
  avatarUrl: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'saved']);

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

const { t } = useI18n();
const toast = useToast();
const userStore = useUserStore();

const formNickname = ref('');
const previewUrl = ref('');
const uploading = ref(false);
const submitting = ref(false);
const fileInputRef = ref(null);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    formNickname.value = props.nickname;
    previewUrl.value = props.avatarUrl;
  },
);

function close() {
  emit('update:modelValue', false);
}

function openFilePicker() {
  fileInputRef.value?.click();
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
    toast.error(t('头像格式不支持'));
    return;
  }

  if (file.size > AVATAR_MAX_SIZE) {
    toast.error(t('头像文件过大'));
    return;
  }

  try {
    uploading.value = true;
    const uploadRes = await uploadFile(file, 'avatar');
    const fileRef = uploadRes?.data?.ref;
    if (!fileRef) throw new Error(t('上传失败'));
    const avatarRes = await updateAvatar(fileRef);
    const avatar = avatarRes?.data?.avatar || '';
    if (avatar) {
      // 头像引用交由 store 转换为可展示 URL，并同步全局用户资料。
      previewUrl.value = userStore.updateUserProfile({ avatar }).avatarUrl;
    }
    toast.success(t('头像上传成功'));
  } catch (e) {
    toast.error(e.message || t('头像上传失败'));
  } finally {
    uploading.value = false;
  }
}

async function handleSave() {
  const trimmedNickname = formNickname.value.trim();
  if (!trimmedNickname) {
    toast.error(t('请输入昵称'));
    return;
  }
  // 与安卓一致：昵称长度 1-20
  if (trimmedNickname.length > 20) {
    toast.error(t('昵称长度不能超过20位'));
    return;
  }

  try {
    submitting.value = true;
    await updateNickname(trimmedNickname);
    userStore.updateUserProfile({ nickname: trimmedNickname });
    emit('saved', {
      nickname: trimmedNickname,
      avatarUrl: previewUrl.value,
    });
    toast.success(t('操作成功'));
    close();
  } catch {
    toast.error(t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal :model-value="modelValue" :title="t('个人资料')" :description="t('头像和昵称设置')"
    :button-text="submitting ? t('加载中') : t('保存')" :action-disabled="submitting || uploading"
    @update:model-value="emit('update:modelValue', $event)" @confirm="handleSave">
    <div class="profile-user-info-sheet__body">
      <div class="profile-user-info-sheet__panel card-default">
        <div class="profile-user-info-sheet__panel-head">
          <span class="profile-user-info-sheet__panel-title">{{ t('头像') }}</span>
        </div>
        <button type="button" class="profile-user-info-sheet__upload" :disabled="uploading" @click="openFilePicker">
          <img v-if="previewUrl" class="profile-user-info-sheet__preview" :src="previewUrl" alt="" />
          <img v-else class="profile-user-info-sheet__avatar-add" :src="iconProfileAvatarAdd" width="80" height="80"
            alt="" aria-hidden="true" />
        </button>
        <p class="profile-user-info-sheet__upload-tip">{{ uploading ? t('上传中...') : t('点击头像上传图片') }}</p>
        <p class="profile-user-info-sheet__upload-hint">{{ t('头像上传格式说明') }}</p>
        <input ref="fileInputRef" class="profile-user-info-sheet__file" type="file" :accept="AVATAR_ACCEPT"
          @change="handleFileChange" />
      </div>
      <div class="profile-user-info-sheet__panel card-default">
        <div class="profile-user-info-sheet__panel-head">
          <label class="profile-user-info-sheet__panel-title" for="profile-user-info-nickname">{{ t('昵称') }}</label>
        </div>
        <BaseInput id="profile-user-info-nickname" v-model="formNickname" maxlength="20" :placeholder="t('请输入昵称')" />
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.profile-user-info-sheet__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-user-info-sheet__panel {
  padding: 16px 12px;
  border-radius: 16px;
}

.profile-user-info-sheet__panel-head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.profile-user-info-sheet__panel-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--theme-primary);
}

.profile-user-info-sheet__upload {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  margin: 0 auto 12px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.profile-user-info-sheet__preview,
.profile-user-info-sheet__avatar-add {
  display: block;
  width: 80px;
  height: 80px;
  max-width: none;
}

.profile-user-info-sheet__preview {
  border-radius: 50%;
  object-fit: cover;
}

.profile-user-info-sheet__upload-tip {
  margin: 0 0 4px;
  font-size: 14px;
  text-align: center;
  font-weight: 350;
  color: var(--theme-primary);
}

.profile-user-info-sheet__upload-hint {
  font-size: 12px;
  text-align: center;
  color: var(--theme-text-1);
}

.profile-user-info-sheet__file {
  display: none;
}

</style>
