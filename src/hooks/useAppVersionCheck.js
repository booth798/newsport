import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { clearChunkReloadFlag } from '@/router/lazyView';

/** 当前运行中的构建 ID（打包时注入） */
const CURRENT_BUILD_ID = String(import.meta.env.VITE_APP_BUILD_ID || '');

const VERSION_URL = '/version.json';
/** 常规轮询间隔：约 5 分钟，避免打扰与多余请求 */
const POLL_INTERVAL_MS = 5 * 60 * 1000;
/** 点击「稍后」后的静默时长 */
const SNOOZE_MS = 30 * 60 * 1000;
const SNOOZE_KEY = 'mysport-app-version-snooze-until';

/**
 * 检测前端资源是否已发布新版本。
 * - 轮询 /version.json
 * - 标签页重新可见时检查
 * - 路由切换节流检查
 * - Vite / 路由懒加载 chunk 失败时强制提示（部署后旧页面最常见）
 */
export function useAppVersionCheck() {
  const router = useRouter();
  const updateAvailable = ref(false);
  const remoteBuildId = ref('');

  let pollTimer = null;
  let routeCheckTimer = null;
  let checking = false;
  let disposed = false;

  function isSnoozed() {
    const until = Number(sessionStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  }

  function clearSnooze() {
    sessionStorage.removeItem(SNOOZE_KEY);
  }

  async function fetchRemoteBuildId() {
    const url = `${VERSION_URL}?t=${Date.now()}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return String(data?.buildId || '').trim();
  }

  /**
   * @param {{ force?: boolean }} [options]
   * force=true 时忽略稍后静默（用于 chunk 加载失败）
   */
  async function checkForUpdate(options = {}) {
    const force = Boolean(options.force);
    if (disposed || checking) return;
    if (!CURRENT_BUILD_ID) return;
    if (!force && (updateAvailable.value || isSnoozed())) return;

    checking = true;
    try {
      const nextId = await fetchRemoteBuildId();
      if (!nextId || disposed) return;
      if (nextId !== CURRENT_BUILD_ID) {
        remoteBuildId.value = nextId;
        updateAvailable.value = true;
        if (force) clearSnooze();
      } else {
        // 版本一致：清除 chunk 自动刷新标记
        clearChunkReloadFlag();
      }
    } catch {
      // 网络波动时静默失败，等待下次轮询
    } finally {
      checking = false;
    }
  }

  function snooze() {
    sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    updateAvailable.value = false;
  }

  function refreshNow() {
    clearSnooze();
    clearChunkReloadFlag();
    // 硬刷新当前页；version.json / index.html 需短缓存或 no-cache 才能拉到新资源
    window.location.reload();
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      checkForUpdate();
    }
  }

  function onChunkLoadError() {
    // 部署后旧 chunk 404 / 路由无法解析组件：立即提示刷新
    updateAvailable.value = true;
    clearSnooze();
  }

  function onVitePreloadError(event) {
    event?.preventDefault?.();
    onChunkLoadError();
  }

  function onUnhandledRejection(event) {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed|Couldn't resolve component/i.test(msg)) {
      onChunkLoadError();
    }
  }

  onMounted(() => {
    clearChunkReloadFlag();

    // 首屏稍晚再查，避开启动关键请求
    window.setTimeout(() => {
      if (!disposed) checkForUpdate();
    }, 8000);

    pollTimer = window.setInterval(() => {
      checkForUpdate();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('vite:preloadError', onVitePreloadError);
    window.addEventListener('mysport:chunk-load-error', onChunkLoadError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    router.afterEach(() => {
      clearTimeout(routeCheckTimer);
      // 路由切换后节流检查，避免连续跳转打爆 version.json
      routeCheckTimer = window.setTimeout(() => {
        checkForUpdate();
      }, 1500);
    });
  });

  onBeforeUnmount(() => {
    disposed = true;
    if (pollTimer != null) window.clearInterval(pollTimer);
    clearTimeout(routeCheckTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('vite:preloadError', onVitePreloadError);
    window.removeEventListener('mysport:chunk-load-error', onChunkLoadError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  });

  return {
    updateAvailable,
    remoteBuildId,
    checkForUpdate,
    snooze,
    refreshNow,
  };
}
