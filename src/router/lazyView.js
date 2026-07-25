/**
 * 路由懒加载封装：部署后旧页面点到新 chunk 会 404，
 * Vue Router 常表现为 Couldn't resolve component "default"。
 * 失败时通知版本检测，并最多自动硬刷新一次。
 */

const CHUNK_RELOAD_KEY = 'mysport-chunk-auto-reload';

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|Unable to preload CSS|Couldn't resolve component/i;

export function isChunkLoadError(err) {
  const msg = String(err?.message || err || '');
  return CHUNK_ERROR_RE.test(msg);
}

export function notifyChunkLoadError(err) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mysport:chunk-load-error', { detail: { err } }));
}

/** 应用成功启动后清除自动刷新标记，避免正常会话误伤 */
export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {() => Promise<unknown>} importer
 * @returns {() => Promise<unknown>}
 */
export function lazyView(importer) {
  return () =>
    importer().catch((err) => {
      if (isChunkLoadError(err)) {
        notifyChunkLoadError(err);
        try {
          if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
            window.location.reload();
            // 挂起 Promise，避免继续抛给当前导航造成二次报错
            return new Promise(() => {});
          }
        } catch {
          /* ignore */
        }
      }
      throw err;
    });
}
