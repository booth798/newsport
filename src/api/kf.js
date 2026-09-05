/**
 * /kf 独立客服模块 HTTP 接口（与 Android 端 OnlineServiceApiService 对齐）。
 *
 * base URL 规则：从公开配置 customer-service.url 解析 origin，拼接 /kf/ 前缀。
 * 三个接口均为 FormUrlEncoded / Multipart，不走主 API 的加密信封。
 */

const __DEV__ = import.meta.env.DEV;

/* ─── URL 工具（对齐 OnlineServiceEndpointProvider） ─── */

/**
 * 将原始 base 规范化为 https://{host}/kf/ 结尾。
 */
export function normalizeKfBase(rawBase) {
  let base = rawBase.trim().replace(/\/+$/, '');
  if (!base.startsWith('https://') && !base.startsWith('http://')) {
    base = `https://${base}`;
  }
  return base.endsWith('/kf') ? `${base}/` : `${base}/kf/`;
}

/**
 * 构建 WebSocket 地址：wss://{host}/kf/ws
 */
export function buildKfWebSocketUrl(rawBase) {
  return normalizeKfBase(rawBase)
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    + 'ws';
}

/**
 * 将服务端返回的图片相对路径拼接为完整 URL。
 */
export function buildKfImageUrl(rawBase, relativePath) {
  if (!relativePath) return null;
  const path = relativePath.trim();
  if (!path) return null;
  if (path.startsWith('https://') || path.startsWith('http://')) return path;
  return normalizeKfBase(rawBase).replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

/**
 * 解析客服 HTTP/WS 基础地址（对齐 Android customerServiceBase）。
 * 优先取 customer-service.url 的 origin，缺失时回退主 API 域名。
 */
export function resolveKfBase(csUrl, fallbackApiBase) {
  return extractKfBase(csUrl) || extractKfBase(fallbackApiBase);
}

/**
 * 解析 getConfig.json 的 id 参数（对齐 Android initialLinkCode）。
 * 优先 customer-service.linkcode，兼容旧版从 URL query 或纯字符串解析。
 */
export function resolveEntryLinkCode(linkCodeRaw, csUrlRaw) {
  return extractEntryLinkCode(linkCodeRaw) || extractEntryLinkCode(csUrlRaw);
}

/**
 * 从公开配置 URL 中提取客服入口 linkCode（query 参数 code/id/linkCode/tenant 或纯字符串）。
 * 对齐 Android extractCustomerServiceEntryLinkCode。
 */
export function extractEntryLinkCode(rawValue) {
  if (!rawValue) return null;
  const value = rawValue.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    for (const key of ['code', 'id', 'linkCode', 'tenant']) {
      const param = url.searchParams.get(key)?.trim();
      if (param) return param;
    }
  } catch {
    // 不是合法 URL，尝试按纯 code 匹配
  }
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

/**
 * 从公开配置 URL 中提取客服基础地址（origin）。
 * 对齐 Android extractCustomerServiceBase。
 */
export function extractKfBase(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    return url.origin + '/';
  } catch {
    return null;
  }
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  return false;
}

/**
 * 客服 CONNECT.avatar 用的公网 origin（后台在服务端拉图，局域网/相对路径会裂图）。
 * 生产取当前页面域名；本地开发也用当前 origin（经网关/代理可达时）。
 */
export function resolvePublicAssetOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * 将用户头像转为客服后台可访问的绝对 URL（对齐 mystock resolveKfUserAvatarUrl）。
 * 支持 http(s)、/api/file/{id}、upload://{id}、纯数字 fileId。
 */
export function resolveKfUserAvatarUrl(avatar) {
  const origin = resolvePublicAssetOrigin();
  let raw = String(avatar || '').trim();
  if (!raw) return '';

  if (raw.startsWith('data:') || raw.startsWith('blob:')) return '';

  // 统一成可访问 path：upload://123 → /api/file/123
  if (raw.startsWith('upload://')) {
    raw = `/api/file/${raw.replace(/^upload:\/\//, '')}`;
  } else if (/^\d+$/.test(raw)) {
    raw = `/api/file/${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (isLocalOrPrivateHost(u.hostname) && origin) {
        return `${origin}${u.pathname}${u.search}`;
      }
      return raw;
    } catch {
      return '';
    }
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return origin ? `${origin}${path}` : path;
}

/* ─── 访客身份（对齐 OnlineServiceIdentityStore） ─── */

/**
 * 生成访客 token：youke_ + SHA256(customerId).slice(0, 32)
 */
export async function generateVisitorToken(customerId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(customerId.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `youke_${hex.slice(0, 32)}`;
}

/* ─── HTTP 接口 ─── */

/**
 * POST /kf/kefu/chat/user/init.json（初始化访客）
 * 对齐 Android initializeVisitor
 */
export async function kfInitVisitor(kfBase, token) {
  const url = `${normalizeKfBase(kfBase)}kefu/chat/user/init.json`;
  const body = new URLSearchParams({ token });
  if (__DEV__) console.log('[KF] init.json', { url, token: token.slice(0, 12) + '…' });
  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok) throw new Error(`init.json HTTP ${res.status}`);
  const json = await res.json();
  const payload = json.data || json.resultData || json;
  if (json.result != null && json.result !== 1) {
    throw new Error(payload.info || payload.msg || '初始化在线客服失败');
  }
  if (payload.userStatus != null && payload.userStatus !== 1) {
    throw new Error(payload.info || payload.msg || '当前账号暂时无法使用在线客服');
  }
  return payload;
}

/**
 * POST /kf/kefu/chat/config/getConfig.json（获取客服配置，含 receiveId）
 * 对齐 Android getConfig
 */
export async function kfGetConfig(kfBase, token, entryLinkCode) {
  const url = `${normalizeKfBase(kfBase)}kefu/chat/config/getConfig.json`;
  const body = new URLSearchParams({ token, id: entryLinkCode, source: 'h5' });
  if (__DEV__) console.log('[KF] getConfig.json', { url, id: entryLinkCode });
  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok) throw new Error(`getConfig.json HTTP ${res.status}`);
  const json = await res.json();
  const payload = json.data || json.resultData || json;
  if (json.result != null && json.result !== 1) {
    throw new Error(payload.info || payload.msg || '获取在线客服配置失败');
  }
  return payload;
}

/**
 * POST /kf/kefu/chat/file/uploadImage.json（上传图片）
 * 对齐 Android uploadImage
 */
export async function kfUploadImage(kfBase, token, file) {
  const url = `${normalizeKfBase(kfBase)}kefu/chat/file/uploadImage.json`;
  const formData = new FormData();
  formData.append('token', token);
  formData.append('file', file);
  if (__DEV__) console.log('[KF] uploadImage.json', { url, fileName: file.name, size: file.size });
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`uploadImage.json HTTP ${res.status}`);
  const json = await res.json();
  const payload = json.data || json.resultData || json;
  if (json.result != null && json.result !== 1) {
    throw new Error(payload.info || payload.msg || '图片上传失败');
  }
  if (!payload.url) throw new Error(payload.msg || '图片上传结果缺少 url');
  return payload;
}
