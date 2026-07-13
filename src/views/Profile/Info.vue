<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user';
import { useToast } from '@/hooks/useToast';
import { fetchUserProfile, updateNickname, updateAvatar } from '@/api/user';
import { uploadFile, resolveAvatarUrl } from '@/api/upload';

const { t } = useI18n();
const toast = useToast();
const userStore = useUserStore();
const { loggedInUserId } = storeToRefs(userStore);

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

const nickname = ref(loggedInUserId.value || '');
const phone = ref('');
const avatarUrl = ref('');
const uploading = ref(false);
const submitting = ref(false);
const loading = ref(true);
const fileInputRef = ref(null);

const displayInitial = computed(() => (nickname.value.charAt(0) || 'U').toUpperCase());

onMounted(async () => {
  try {
    const res = await fetchUserProfile();
    const d = res.data || {};
    nickname.value = d.nickname || d.username || loggedInUserId.value || '';
    phone.value = d.phone || '';
    const resolved = resolveAvatarUrl(d.avatar);
    if (resolved) avatarUrl.value = resolved;
  } catch {
    /* keep defaults */
  } finally {
    loading.value = false;
  }
});

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
    toast.error(t('文件大小不能超过5MB'));
    return;
  }

  try {
    uploading.value = true;
    const uploadRes = await uploadFile(file, 'avatar');
    const fileRef = uploadRes?.data?.ref;
    if (!fileRef) throw new Error(t('上传失败'));
    const avatarRes = await updateAvatar(fileRef);
    avatarUrl.value = avatarRes?.data?.avatar || '';
    if (avatarUrl.value) {
      userStore.updateUserProfile({ avatar: avatarUrl.value });
    }
    toast.success(t('头像上传成功'));
  } catch (e) {
    toast.error(e.message || t('头像上传失败'));
  } finally {
    uploading.value = false;
  }
}

async function handleSave() {
  if (!nickname.value.trim()) {
    toast.error(t('请输入昵称'));
    return;
  }
  try {
    submitting.value = true;
    await updateNickname(nickname.value.trim());
    userStore.updateUserProfile({ nickname: nickname.value.trim() });
    toast.success(t('操作成功'));
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="profile-info">
    <h3 class="section-title">{{ t('个人资料') }}</h3>

    <div class="info-form">
      <div class="info-row">
        <span class="info-label">{{ t('头像') }}</span>
        <button type="button" class="info-avatar" :disabled="uploading" @click="openFilePicker">
          <img v-if="avatarUrl" class="info-avatar__img" :src="avatarUrl" alt="" />
          <div v-else class="info-avatar__placeholder">{{ displayInitial }}</div>
          <span class="info-avatar__edit">{{ uploading ? t('上传中...') : t('修改') }}</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          class="info-avatar__file-input"
          :accept="AVATAR_ACCEPT"
          @change="handleFileChange"
        />
      </div>

      <div class="info-row">
        <span class="info-label">{{ t('昵称') }}</span>
        <input v-model="nickname" class="info-input" maxlength="32" :placeholder="t('请输入昵称')" />
      </div>

      <div v-if="phone" class="info-row">
        <span class="info-label">{{ t('手机号') }}</span>
        <span class="info-value">{{ phone }}</span>
      </div>
    </div>

    <button class="btn btn--primary save-btn" :disabled="submitting" @click="handleSave">
      {{ submitting ? t('加载中') : t('保存') }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-3xl;
}

.info-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
  margin-bottom: $spacing-3xl;
}

.info-row {
  display: flex;
  align-items: center;
  padding-bottom: $spacing-lg;
  border-bottom: 1px solid var(--theme-divider);
}

.info-label {
  width: 100px;
  font-size: $font-size-md;
  color: var(--theme-text-1);
  flex-shrink: 0;
}

.info-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: $font-size-base;
  color: var(--theme-text);
  background: transparent;
  padding: 8px 0;
}

.info-value {
  font-size: $font-size-base;
  color: var(--theme-text);
}

.info-avatar {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: none;
  padding: 0;
  background: transparent;
  flex-shrink: 0;

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--theme-primary), #5696f5);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-xl;
    font-weight: 700;
  }

  &__edit {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 10px;
    text-align: center;
    line-height: 18px;
  }

  &__file-input {
    display: none;
  }
}

.save-btn {
  height: 48px;
  width: 200px;

  @include mobile-only {
    width: 100%;
  }
}
</style>
