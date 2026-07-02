const API_BASE = '/api';

const PLAINTEXT_PATHS = [
  '/captcha/slider/verify',
  '/auth/reset/send-code',
];

function isPlaintextPath(url) {
  return PLAINTEXT_PATHS.some((p) => url === p || url.startsWith('/upload/'));
}

function getToken() {
  return localStorage.getItem('mysport:token') || '';
}

function getRefreshToken() {
  return localStorage.getItem('mysport:refresh_token') || '';
}

export function setToken(token, refreshToken) {
  if (token) localStorage.setItem('mysport:token', token);
  if (refreshToken) localStorage.setItem('mysport:refresh_token', refreshToken);
}

export function clearToken() {
  localStorage.removeItem('mysport:token');
  localStorage.removeItem('mysport:refresh_token');
}

class ApiError extends Error {
  constructor(code, msg, data) {
    super(msg || `API Error ${code}`);
    this.code = code;
    this.data = data;
  }
}

async function handleResponse(res, encrypted = false) {
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, '登录已过期，请重新登录');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return { code: 200, msg: 'ok', data: null };
  }

  const json = await res.json();

  if (encrypted && json.iv && json.d) {
    try {
      const { decryptSessionResponse } = await import('./encrypt');
      const decrypted = await decryptSessionResponse(json);
      if (decrypted.code !== 200 && decrypted.code !== 0) {
        throw new ApiError(decrypted.code, decrypted.msg, decrypted.data);
      }
      return decrypted;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(500, '响应解密失败');
    }
  }

  if (json.code !== 200 && json.code !== 0) {
    throw new ApiError(json.code, json.msg, json.data);
  }
  return json;
}

function buildHeaders(options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers['X-Customer-Token'] = token;
  if (!headers['Content-Type'] && options.json !== false) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function needsEncryption(method, body, url) {
  if (method === 'GET' || method === 'HEAD') return false;
  if (body === undefined || body === null) return false;
  if (isPlaintextPath(url)) return false;
  return true;
}

export async function request(url, options = {}) {
  const {
    method = 'GET',
    body,
    params,
    headers: extraHeaders,
    skipEncrypt,
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

  const mergedHeaders = buildHeaders({ headers: extraHeaders, ...rest });

  let finalBody;
  let usedEncryption = false;

  if (body !== undefined && method !== 'GET') {
    const hasEncryptHeaders = mergedHeaders['X-Encrypted'] === '1';

    if (hasEncryptHeaders || skipEncrypt) {
      finalBody = typeof body === 'string' ? body : JSON.stringify(body);
      usedEncryption = hasEncryptHeaders;
    } else if (needsEncryption(method, body, url)) {
      try {
        const { sessionEncrypt, hasSession } = await import('./encrypt');
        if (hasSession()) {
          const { encryptedBody, headers: encHeaders } = await sessionEncrypt(body);
          Object.assign(mergedHeaders, encHeaders);
          finalBody = JSON.stringify(encryptedBody);
          usedEncryption = true;
        } else {
          finalBody = typeof body === 'string' ? body : JSON.stringify(body);
        }
      } catch {
        finalBody = typeof body === 'string' ? body : JSON.stringify(body);
      }
    } else {
      finalBody = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const fetchOptions = {
    method,
    headers: mergedHeaders,
  };

  if (finalBody !== undefined) {
    fetchOptions.body = finalBody;
  }

  const res = await fetch(fullUrl, fetchOptions);
  return handleResponse(res, usedEncryption);
}

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
