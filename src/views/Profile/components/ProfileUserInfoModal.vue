<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { updateNickname, updateAvatar } from '@/api/user';
import { uploadFile } from '@/api/upload';
import { useToast } from '@/hooks/useToast';

import iconProfileAvatarAdd from '@/assets/images/profile/icon_profile_avatar_add.svg?url';

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

const formNickname = ref('');
const previewUrl = ref('');
const pendingAvatar = ref(null);
const submitting = ref(false);
const fileInputRef = ref(null);
let blobPreviewUrl = '';

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    formNickname.value = props.nickname;
    previewUrl.value = props.avatarUrl;
    pendingAvatar.value = null;
  },
);

function revokeBlobPreview() {
  if (blobPreviewUrl) {
    URL.revokeObjectURL(blobPreviewUrl);
    blobPreviewUrl = '';
  }
}

onBeforeUnmount(revokeBlobPreview);

function close() {
  emit('update:modelValue', false);
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function handleFileChange(event) {
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

  revokeBlobPreview();
  blobPreviewUrl = URL.createObjectURL(file);
  previewUrl.value = blobPreviewUrl;
  pendingAvatar.value = file;
}

async function handleSave() {
  const trimmedNickname = formNickname.value.trim();
  if (!trimmedNickname) {
    toast.error(t('请输入昵称'));
    return;
  }

  try {
    submitting.value = true;
    if (pendingAvatar.value) {
      const uploadRes = await uploadFile(pendingAvatar.value);
      const fileRef = uploadRes?.data?.fileId || uploadRes?.data?.url || '';
      if (fileRef) await updateAvatar(fileRef);
    }
    await updateNickname(trimmedNickname);
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
  <Teleport to="body">
    <Transition name="profile-user-info-fade">
      <div
        v-if="modelValue"
        class="profile-user-info-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="t('用户信息')"
      >
        <div class="profile-user-info-sheet__backdrop" aria-hidden="true" @click="close" />

        <div class="profile-user-info-sheet__panel-wrap">
          <button
            type="button"
            class="profile-user-info-sheet__close norem"
            :aria-label="t('关闭')"
            @click="close"
          >
            <span aria-hidden="true">×</span>
          </button>

          <div class="profile-user-info-sheet__frame">
            <div class="profile-user-info-sheet__watermark" aria-hidden="true">UNIBET</div>

            <div class="profile-user-info-sheet__body">
              <div class="profile-user-info-sheet__head">
                <h2 class="profile-user-info-sheet__title">{{ t('用户信息') }}</h2>
                <p class="profile-user-info-sheet__subtitle">{{ t('头像和昵称设置') }}</p>
              </div>

              <div class="profile-user-info-sheet__panel card-default">
                <div class="profile-user-info-sheet__panel-head">
                  <span class="profile-user-info-sheet__panel-title">{{ t('头像') }}</span>
                </div>
                <button
                  type="button"
                  class="profile-user-info-sheet__upload"
                  @click="openFilePicker"
                >
                  <img
                    v-if="previewUrl"
                    class="profile-user-info-sheet__preview"
                    :src="previewUrl"
                    alt=""
                  />
                  <img
                    v-else
                    class="profile-user-info-sheet__avatar-add"
                    :src="iconProfileAvatarAdd"
                    width="80"
                    height="80"
                    alt=""
                    aria-hidden="true"
                  />
                </button>
                <p class="profile-user-info-sheet__upload-tip">{{ t('点击头像上传图片') }}</p>
                <p class="profile-user-info-sheet__upload-hint">{{ t('头像上传格式说明') }}</p>
                <input
                  ref="fileInputRef"
                  class="profile-user-info-sheet__file"
                  type="file"
                  :accept="AVATAR_ACCEPT"
                  @change="handleFileChange"
                />
              </div>

              <div class="profile-user-info-sheet__panel card-default">
                <div class="profile-user-info-sheet__panel-head">
                  <label
                    class="profile-user-info-sheet__panel-title"
                    for="profile-user-info-nickname"
                  >
                    {{ t('昵称') }}
                  </label>
                </div>
                <div class="profile-user-info-sheet__input-wrap card-primary">
                  <input
                    id="profile-user-info-nickname"
                    v-model="formNickname"
                    class="profile-user-info-sheet__input"
                    type="text"
                    maxlength="32"
                    :placeholder="t('请输入昵称')"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              class="btn btn--default-1 profile-user-info-sheet__save"
              :disabled="submitting"
              @click="handleSave"
            >
              {{ submitting ? t('加载中') : t('保存') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-user-info-sheet {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(44px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow: hidden;

  @include web-only {
    padding: 24px;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(11, 52, 98, 0.55);
    backdrop-filter: blur(4px);
  }

  &__panel-wrap {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 420px;
    max-height: calc(100dvh - 56px);
    flex-shrink: 0;
    overflow: hidden;

    @include web-only {
      max-width: 440px;
      max-height: min(90vh, 820px);
    }
  }

  &__close {
    position: absolute;
    top: 0;
    right: 12px;
    z-index: 3;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1.5px solid rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    background: transparent;
    color: #fff;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(calc(-100% - 10px));
    transition:
      background 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: #fff;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.6);
      outline-offset: 2px;
    }

    @include mobile-only {
      &.norem {
        width: 28px;
        height: 28px;
        right: 10px;
        border-width: 1px;
        font-size: 17px;
        transform: translateY(calc(-100% - 8px));
      }
    }

    @include web-only {
      right: 8px;
      transform: translateY(calc(-100% - 12px));
    }
  }

  &__frame {
    position: relative;
    z-index: 1;
    width: 100%;
    max-height: calc(100dvh - 56px);
    box-sizing: border-box;
    border-radius: 24px;
    border: 0.8px solid rgba(214, 224, 235, 1);
    background: radial-gradient(100% 100% at 50% 100%, #68b3fd 0%, #0d6cfb 100%);
    box-shadow: 0 12px 40px rgba(21, 58, 118, 0.28);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;

    @include web-only {
      max-height: min(90vh, 820px);
    }
  }

  &__watermark {
    position: absolute;
    left: 50%;
    top: 36px;
    transform: translate(-50%, -50%);
    z-index: 0;
    pointer-events: none;
    white-space: nowrap;
    font-family: $font-family-num, $font-family-base;
    font-size: clamp(56px, 20vw, 96px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.06em;
    color: rgba(232, 244, 255, 0.38);
    text-transform: uppercase;
    user-select: none;
  }

  &__body {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  &__save {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 48px;
    flex-shrink: 0;
    font-weight: 600;
    box-shadow: var(--shadow-card);
  }

  &__head {
    padding: 8px 8px 4px;
    flex-shrink: 0;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  &__subtitle {
    margin: 0;
    font-size: 14px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.88);
  }

  &__panel {
    padding: 12px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  &__panel-head {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  &__panel-title {
    font-size: 14px;
    font-weight: 500;
    color: rgba(11, 52, 98, 0.72);
  }

  &__upload {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin: 0 auto 8px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  &__preview,
  &__avatar-add {
    display: block;
    width: 80px;
    height: 80px;
    max-width: none;
  }

  &__preview {
    border-radius: 50%;
    object-fit: cover;
  }

  &__upload-tip {
    margin: 0 0 4px;
    font-size: 14px;
    line-height: 1.4;
    text-align: center;
    color: rgba(11, 52, 98, 0.72);
  }

  &__upload-hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    text-align: center;
    color: rgba(11, 52, 98, 0.45);
  }

  &__file {
    display: none;
  }

  &__input-wrap {
    padding: 0 12px;
    border-radius: 16px;
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  &__input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 16px;
    font-weight: 500;
    color: #0b3462;
    outline: none;
    padding: 12px 0;
    box-sizing: border-box;

    &::placeholder {
      color: rgba(11, 52, 98, 0.35);
      font-weight: 400;
    }
  }
}

.profile-user-info-fade-enter-active,
.profile-user-info-fade-leave-active {
  transition: opacity 0.25s ease;

  .profile-user-info-sheet__panel-wrap {
    transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
  }
}

.profile-user-info-fade-enter-from,
.profile-user-info-fade-leave-to {
  opacity: 0;

  .profile-user-info-sheet__panel-wrap {
    transform: scale(0.95) translateY(16px);
  }
}
</style>
