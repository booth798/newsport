import { resolveErrorMessage, isForceLogoutCode } from './errorCodes';
import { getCurrentLocale } from '@/store/modules/app';

const API_BASE = '/api';

// ─── 调试日志（开发环境） ───

const __DEV__ = import.meta.env.DEV;

const STYLES = {
  tag:       'background:#1565c0;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
  method:    'color:#e65100;font-weight:bold',
  url:       'color:#1b5e20',
  encrypt:   'background:#6a1b9a;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px',
  plain:     'background:#757575;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px',
  ok:        'color:#2e7d32;font-weight:bold',
  err:       'color:#c62828;font-weight:bold',
  dim:       'color:#9e9e9e',
};

function logRequest(method, url, body, encryptType) {
  if (!__DEV__) return;
  const badge = encryptType || 'PLAIN';
  const badgeStyle = encryptType ? STYLES.encrypt : STYLES.plain;
  try {
    const tk = getToken();
    const tkLabel = tk ? `Token:${tk.slice(0, 12)}…` : 'Token:无';
    console.log(
      `%c API %c ${method} %c${url} %c${badge} %c${tkLabel}`,
      STYLES.tag, STYLES.method, STYLES.url, badgeStyle,
      tk ? 'color:#2e7d32;font-size:10px' : 'color:#c62828;font-weight:bold;font-size:10px',
    );
    if (body !== undefined && body !== null) {
      console.log('%c请求参数（明文）', 'font-weight:bold;color:#1565c0', body);
    }
  } catch { /* SSR safe */ }
}

function logResponse(data, error) {
  if (!__DEV__) return;
  try {
    if (error) {
      console.log('%c响应异常', STYLES.err, error.message || error);
    } else {
      console.log('%c响应数据', 'font-weight:bold;color:#2e7d32', data);
    }
  } catch { /* SSR safe */ }
}

// ─── 明文豁免列表（带 body 但不需要加密的端点） ───
const PLAINTEXT_PATHS = new Set([
  '/captcha/slider/verify',
  '/auth/reset/send-code',
]);

function isPlaintextExempt(url) {
  return PLAINTEXT_PATHS.has(url) || url.startsWith('/upload/');
}

// ─── Token 管理 ───

function getToken() {
  return localStorage.getItem('mysport:token') || '';
}

export function getRefreshToken() {
  return localStorage.getItem('mysport:refresh_token') || '';
}

export function setToken(token, refreshToken) {
  if (token) localStorage.setItem('mysport:token', token);
  if (refreshToken) localStorage.setItem('mysport:refresh_token', refreshToken);
  if (import.meta.env.DEV) {
    const stored = localStorage.getItem('mysport:token');
    console.log(
      '%c[AUTH] setToken',
      'background:#ff9800;color:#fff;padding:2px 6px;border-radius:3px',
      { saved: Boolean(token), stored: stored ? `${stored.slice(0, 16)}…` : '(空!)' },
    );
  }
}

export function clearToken() {
  localStorage.removeItem('mysport:token');
  localStorage.removeItem('mysport:refresh_token');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mysport:session-expired'));
  }
}

// ─── ApiError ───

export class ApiError extends Error {
  constructor(code, msg, data) {
    super(msg || `API Error ${code}`);
    this.code = code;
    this.data = data;
  }
}

// ─── 401 自动续期 ───

let refreshing = null;

async function tryRefreshToken() {
  const rt = getRefreshToken();
  if (!rt) return false;
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Refresh-Token': rt,
      };
      const token = getToken();
      if (token) headers['X-Customer-Token'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers,
      });
      const json = await res.json();
      if (json.code === 200 || json.code === 0) {
        const d = json.data || {};
        setToken(d.satoken || d.accessToken, d.refreshToken);
        return true;
      }
    } catch { /* 续期失败 */ }
    return false;
  })();

  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// ─── 强制退出检测 ───

let forceLogoutFired = false;

function checkForceLogout(msgCode) {
  if (!msgCode || forceLogoutFired) return;
  if (!isForceLogoutCode(msgCode)) return;
  forceLogoutFired = true;
  clearToken();
  emitEvent('mysport:session-expired');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mysport:force-logout', { detail: { code: msgCode } }));
  }
}

// ─── 响应处理 ───

async function handleResponse(res, encrypted = false) {
  if (res.status === 401 || res.status === 403) {
    let bodyMsg = '';
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        bodyMsg = j.msg || '';
      }
    } catch { /* ignore */ }
    if (isForceLogoutCode(bodyMsg)) {
      checkForceLogout(bodyMsg);
      throw new ApiError(res.status, resolveErrorMessage(bodyMsg));
    }
    const ok = await tryRefreshToken();
    if (!ok) {
      clearToken();
      throw new ApiError(401, resolveErrorMessage('TOKEN_EXPIRED'));
    }
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return { code: 200, msg: 'ok', data: null };
  }

  const json = await res.json();

  if (json.code === 401) {
    if (isForceLogoutCode(json.msg)) {
      checkForceLogout(json.msg);
      throw new ApiError(json.code, resolveErrorMessage(json.msg), json.data);
    }
    const ok = await tryRefreshToken();
    if (!ok) {
      clearToken();
      throw new ApiError(401, resolveErrorMessage('TOKEN_EXPIRED'));
    }
    return null;
  }

  if (encrypted && json.iv && json.d) {
    const { decryptSessionResponse } = await import('./encrypt');
    const decrypted = await decryptSessionResponse(json);
    if (decrypted.code !== 200 && decrypted.code !== 0) {
      checkForceLogout(decrypted.msg);
      throw new ApiError(decrypted.code, resolveErrorMessage(decrypted.msg), decrypted.data);
    }
    return decrypted;
  }

  if (json.code !== 200 && json.code !== 0) {
    checkForceLogout(json.msg);
    throw new ApiError(json.code, resolveErrorMessage(json.msg), json.data);
  }
  return json;
}

// ─── Header 构建 ───

function buildHeaders(extraHeaders = {}, method = 'GET') {
  const headers = { ...extraHeaders };
  const token = getToken();
  if (token) headers['X-Customer-Token'] = `Bearer ${token}`;
  if (method !== 'GET' && method !== 'HEAD' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const locale = getCurrentLocale() || 'zh-CN';
  if (!headers['Accept-Language']) headers['Accept-Language'] = locale;
  if (!headers['Content-Language']) headers['Content-Language'] = locale;
  if (!headers['X-Device-Type']) headers['X-Device-Type'] = 'Web';
  return headers;
}

// ─── 判断是否需要加密 ───

function needsEncryption(method, body, url) {
  if (method === 'GET' || method === 'HEAD') return false;
  if (body === undefined || body === null) return false;
  if (isPlaintextExempt(url)) return false;
  return true;
}

// ─── 全局加载 & 网络状态 ───
// 策略：同一路由进入后只展示一轮全局 loading；串行请求用短延迟合并，避免闪两次。

let _loadingCount = 0;
let _loadingVisible = false;
/** 本路由是否已完成过一轮 loading（显示→隐藏） */
let _routeLoadingUsed = false;
let _hideTimer = null;
/** 路由切换时递增，作废上一页未完成请求对 loading 的影响 */
let _loadingSessionId = 0;

/** 隐藏前等待，给紧随其后的串行请求机会并入同一轮 loading */
const LOADING_HIDE_DELAY_MS = 280;

function emitEvent(name) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
}

/**
 * 路由切换时重置：允许新页面再展示一轮全局 loading，并清掉上一页残留计数。
 */
export function resetGlobalLoadingSession() {
  _loadingSessionId += 1;
  if (_hideTimer) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  _loadingCount = 0;
  _routeLoadingUsed = false;
  if (_loadingVisible) {
    _loadingVisible = false;
    emitEvent('mysport:loading-hide');
  }
}

function showLoading() {
  if (_hideTimer) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  _loadingCount += 1;
  if (!_loadingVisible) {
    _loadingVisible = true;
    emitEvent('mysport:loading-show');
  }
}

function hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1);
  if (_loadingCount > 0) return;

  if (_hideTimer) clearTimeout(_hideTimer);
  const sessionAtSchedule = _loadingSessionId;
  _hideTimer = setTimeout(() => {
    _hideTimer = null;
    // 路由已切换或期间又有新请求，则不再隐藏 / 不标记本轮结束
    if (sessionAtSchedule !== _loadingSessionId || _loadingCount !== 0) return;
    _routeLoadingUsed = true;
    if (_loadingVisible) {
      _loadingVisible = false;
      emitEvent('mysport:loading-hide');
    }
  }, LOADING_HIDE_DELAY_MS);
}

/**
 * 是否参与本轮全局 loading：
 * - 本路由尚未结束过一轮 → 参与
 * - 仍在展示中 / 计数未清 / 隐藏延迟未到 → 并入同一轮
 * - 本路由已结束过一轮且当前空闲 → 不再弹出（避免第二次闪烁）
 */
function shouldJoinGlobalLoading() {
  if (!_routeLoadingUsed) return true;
  return _loadingVisible || _loadingCount > 0 || Boolean(_hideTimer);
}

const SILENT_PATHS = new Set([
  '/ws/ticket',
  '/messages/unread-count',
  '/meta/error-codes',
  '/system/public-config',
]);

function isSilent(url, options) {
  if (options.silent) return true;
  return SILENT_PATHS.has(url);
}

// ─── 核心 request ───

export async function request(url, options = {}, _retried = false) {
  const {
    method = 'GET',
    body,
    params,
    headers: extraHeaders,
    silent: _silent,
    ...rest
  } = options;

  const silent = isSilent(url, options);
  // 仅最外层请求管理 loading；401 重试复用同一轮，避免闪烁
  const manageLoading = !silent && !_retried;
  const sessionAtStart = _loadingSessionId;
  const joinLoading = manageLoading && shouldJoinGlobalLoading();

  let fullUrl = `${API_BASE}${url}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) {
          v.forEach((item) => qs.append(k, item));
        } else {
          qs.append(k, String(v));
        }
      }
    });
    const qsStr = qs.toString();
    if (qsStr) fullUrl += `?${qsStr}`;
  }

  const mergedHeaders = buildHeaders(extraHeaders || {}, method);

  let finalBody;
  let usedEncryption = false;
  let encryptType = null;

  if (body !== undefined && method !== 'GET') {
    const alreadyEncrypted = mergedHeaders['X-Encrypted'] === '1';

    if (alreadyEncrypted) {
      finalBody = typeof body === 'string' ? body : JSON.stringify(body);
      usedEncryption = true;
      encryptType = mergedHeaders['X-Bootstrap'] ? 'BOOTSTRAP' : 'SESSION_AES';
    } else if (needsEncryption(method, body, url)) {
      const { sessionEncrypt, hasSession } = await import('./encrypt');
      const sessionReady = await hasSession();

      if (sessionReady) {
        logRequest(method, url, body, 'SESSION_AES');
        const { encryptedBody, headers: encHeaders } = await sessionEncrypt(body);
        Object.assign(mergedHeaders, encHeaders);
        finalBody = JSON.stringify(encryptedBody);
        usedEncryption = true;
        encryptType = 'SESSION_AES';
      } else {
        throw new ApiError(
          0,
          resolveErrorMessage('SESSION_INVALID'),
        );
      }
    } else {
      finalBody = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  if (!encryptType) {
    logRequest(method, url, body, null);
  }

  const fetchOpts = { method, headers: mergedHeaders };
  if (finalBody !== undefined) fetchOpts.body = finalBody;

  if (joinLoading && sessionAtStart === _loadingSessionId) showLoading();

  try {
    const res = await fetch(fullUrl, fetchOpts);
    const result = await handleResponse(res, usedEncryption);

    if (result === null && !_retried) {
      logResponse(null, { message: '401 → 自动续期重试' });
      // await 保证 finally 在重试结束后再 hide，整段续期只算一轮 loading
      return await request(url, options, true);
    }
    if (result === null) {
      clearToken();
      const err = new ApiError(401, resolveErrorMessage('TOKEN_EXPIRED'));
      logResponse(null, err);
      throw err;
    }

    logResponse(result);
    emitEvent('mysport:network-recover');
    return result;
  } catch (e) {
    logResponse(null, e);
    if (e instanceof TypeError && e.message?.includes('fetch')) {
      emitEvent('mysport:network-warn');
    }
    throw e;
  } finally {
    // 路由已切换则丢弃，避免旧页请求干扰新页 loading 会话
    if (joinLoading && sessionAtStart === _loadingSessionId) hideLoading();
  }
}

// ─── 快捷方法 ───

export function get(url, params, options = {}) {
  return request(url, { method: 'GET', params, ...options });
}

export function post(url, body, options = {}) {
  return request(url, { method: 'POST', body, ...options });
}

export function put(url, body, options = {}) {
  return request(url, { method: 'PUT', body, ...options });
}

export function del(url, options = {}) {
  return request(url, { method: 'DELETE', ...options });
}
