import { resolveErrorMessage } from './errorCodes';

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

// ─── 响应处理 ───

async function handleResponse(res, encrypted = false) {
  if (res.status === 401 || res.status === 403) {
    const ok = await tryRefreshToken();
    if (!ok) {
      clearToken();
      throw new ApiError(401, resolveErrorMessage('TOKEN_EXPIRED'));
    }
    return null; // 表示需要重试
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return { code: 200, msg: 'ok', data: null };
  }

  const json = await res.json();

  if (json.code === 401) {
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
      throw new ApiError(decrypted.code, resolveErrorMessage(decrypted.msg), decrypted.data);
    }
    return decrypted;
  }

  if (json.code !== 200 && json.code !== 0) {
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
  return headers;
}

// ─── 判断是否需要加密 ───

function needsEncryption(method, body, url) {
  if (method === 'GET' || method === 'HEAD') return false;
  if (body === undefined || body === null) return false;
  if (isPlaintextExempt(url)) return false;
  return true;
}

// ─── 核心 request ───

export async function request(url, options = {}, _retried = false) {
  const {
    method = 'GET',
    body,
    params,
    headers: extraHeaders,
    ...rest
  } = options;

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

  try {
    const res = await fetch(fullUrl, fetchOpts);
    const result = await handleResponse(res, usedEncryption);

    if (result === null && !_retried) {
      logResponse(null, { message: '401 → 自动续期重试' });
      return request(url, options, true);
    }
    if (result === null) {
      clearToken();
      const err = new ApiError(401, resolveErrorMessage('TOKEN_EXPIRED'));
      logResponse(null, err);
      throw err;
    }

    logResponse(result);
    return result;
  } catch (e) {
    logResponse(null, e);
    throw e;
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
