<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/hooks/useToast';
import { fetchProfileSummary, updateAvatar, updateProfile } from '@/api/user';
import { uploadFile } from '@/api/upload';

const emit = defineEmits(['save']);
const { t } = useI18n();
const toast = useToast();

const nickname = ref('');
const previewUrl = ref('');
const selectedFile = ref(null);
const submitting = ref(false);

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = 'image/png,image/jpeg,image/gif,image/webp';

onMounted(async () => {
  try {
    const res = await fetchProfileSummary();
    if (res.data?.nickname) nickname.value = res.data.nickname;
    if (res.data?.avatarUrl) previewUrl.value = res.data.avatarUrl;
  } catch { /* use defaults */ }
});

function handleAvatarFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > MAX_SIZE) {
    toast.error(t('文件大小不能超过5MB'));
    return;
  }
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
}

async function handleSave() {
  try {
    submitting.value = true;
    if (selectedFile.value) {
      const uploadRes = await uploadFile(selectedFile.value, 'avatar');
      const fileRef = uploadRes.data?.ref;
      if (!fileRef) throw new Error('上传失败，未获取到文件引用');
      await updateAvatar(fileRef);
    }
    if (nickname.value.trim()) {
      await updateProfile({ nickname: nickname.value.trim() }).catch(() => {});
    }
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
  <div class="avatar-card">
    <span class="avatar-card__label">{{ t('头像') }}</span>
    <label class="avatar-upload">
      <input
        type="file"
        class="avatar-upload__input"
        :accept="ACCEPTED"
        @change="handleAvatarFileChange"
      />
      <span v-if="previewUrl" class="avatar-upload__circle avatar-upload__circle--has-img">
        <img class="avatar-upload__preview" :src="previewUrl" alt="" />
      </span>
      <span v-else class="avatar-upload__circle">
        <svg class="avatar-upload__icon" viewBox="0 0 40 40" fill="none">
          <path d="M20 8v24M8 20h24" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </span>
      <span class="avatar-upload__text">{{ t('点击头像上传图片') }}</span>
      <span class="avatar-upload__hint">{{ t('支持 JPG、PNG、GIF、WebP格式，最大5MB') }}</span>
    </label>
  </div>

  <div class="avatar-card">
    <span class="avatar-card__label">{{ t('昵称') }}</span>
    <input
      v-model="nickname"
      class="avatar-nickname-input"
      :placeholder="t('请输入昵称')"
      maxlength="20"
    />
  </div>

  <button
    type="button"
    class="avatar-save-btn"
    :disabled="submitting"
    @click="handleSave"
  >
    {{ submitting ? t('提交中...') : t('保存') }}
  </button>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.avatar-card {
  box-sizing: border-box;
  border-radius: 16px;
  border: 1.5px solid rgba(228, 240, 254, 0.8);
  background: #fff;

  @include web-only {
    padding: 20px 24px;
  }

  @include mobile-only {
    padding: 16px;
  }
}

.avatar-card:first-of-type {
  @include mobile-only {
    min-height: 198px;
  }
}

.avatar-card:nth-of-type(2) {
  @include mobile-only {
    min-height: 104px;
  }
}

.avatar-card__label {
  display: block;
  color: rgba(11, 52, 98, 0.5);
  font-weight: 500;
  line-height: 1.3;

  @include web-only {
    font-size: 15px;
    margin-bottom: 16px;
  }

  @include mobile-only {
    font-size: 13px;
    margin-bottom: 10px;
  }
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.avatar-upload__input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}

.avatar-upload__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px dashed rgba(28, 123, 255, 0.35);
  background: rgba(228, 240, 254, 0.35);
  transition: border-color 0.2s, background 0.2s;
  overflow: hidden;

  @include web-only {
    width: 96px;
    height: 96px;
  }

  @include mobile-only {
    width: 72px;
    height: 72px;
  }

  &:hover {
    border-color: rgba(28, 123, 255, 0.6);
    background: rgba(228, 240, 254, 0.55);
  }

  &--has-img {
    border-style: solid;
    border-color: rgba(28, 123, 255, 0.25);
  }
}

.avatar-upload__icon {
  color: rgba(28, 123, 255, 0.55);

  @include web-only {
    width: 36px;
    height: 36px;
  }

  @include mobile-only {
    width: 28px;
    height: 28px;
  }
}

.avatar-upload__preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-upload__text {
  color: rgba(11, 52, 98, 0.65);
  font-weight: 500;

  @include web-only {
    margin-top: 14px;
    font-size: 14px;
  }

  @include mobile-only {
    margin-top: 10px;
    font-size: 13px;
  }
}

.avatar-upload__hint {
  color: rgba(11, 52, 98, 0.38);
  text-align: center;

  @include web-only {
    margin-top: 6px;
    font-size: 12px;
  }

  @include mobile-only {
    margin-top: 4px;
    font-size: 11px;
  }
}

.avatar-nickname-input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid rgba(214, 224, 235, 0.7);
  border-radius: 12px;
  outline: none;
  background: #fafaff;
  color: var(--theme-text);
  font-family: inherit;
  transition: border-color 0.2s, background 0.2s;

  @include web-only {
    height: 48px;
    padding: 0 18px;
    font-size: 15px;
  }

  @include mobile-only {
    height: 44px;
    padding: 0 14px;
    font-size: 14px;
  }

  &:focus {
    border-color: var(--theme-primary);
    background: #fff;
  }

  &::placeholder {
    color: rgba(11, 52, 98, 0.35);
  }
}

.avatar-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: var(--theme-primary);
  font-weight: 600;
  cursor: pointer;
  box-shadow: none;
  transition: opacity 0.2s, transform 0.15s;

  @include web-only {
    height: 48px;
    font-size: 16px;
  }

  @include mobile-only {
    height: 44px;
    font-size: 15px;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(3, 34, 81, 0.14);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}
</style>
