import { onBeforeUnmount, onMounted } from 'vue';

import { useUserStore } from '@/store/modules/user';

/** 需跨标签监听的登录相关 storage key */
const AUTH_STORAGE_KEYS = new Set([
  'mysport:token',
  'mysport:refresh_token',
  'mysport:customer',
  'mysport:sid',
  'mysport:aesKey',
]);

/**
 * 多标签登录态同步：他页登录/换号/退出后，本页不刷新也能切到最新账号。
 * @param {{ onAccountSwitch?: () => void, onLogout?: () => void }} [opts]
 */
export function useAuthStorageSync(opts = {}) {
  const userStore = useUserStore();
  const { onAccountSwitch, onLogout } = opts;
  let syncTimer = null;

  async function runSync() {
    const result = await userStore.syncAuthFromStorage();
    if (result === 'switch') onAccountSwitch?.();
    if (result === 'logout') onLogout?.();
  }

  function queueSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      runSync().catch(() => {});
    }, 80);
  }

  function onStorage(event) {
    // key === null：clear() 清空整库
    if (event.key == null || AUTH_STORAGE_KEYS.has(event.key)) {
      queueSync();
    }
  }

  function onVisibilityChange() {
    // 切回标签再对齐一次，兜底个别环境漏掉 storage 事件
    if (document.visibilityState === 'visible') queueSync();
  }

  onMounted(() => {
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (syncTimer) clearTimeout(syncTimer);
  });
}
