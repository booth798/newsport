import { APP_SETTINGS } from '@/config/app';
import { getSiteConfig } from '@/config/site';
import { getCurrentSiteKey } from '@/store/modules/app';

const DEFAULT_TIMEOUT = APP_SETTINGS.requestTimeout;

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

const buildUrl = (baseUrl, path) => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  return `${String(baseUrl).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
};

export async function request(path, options = {}) {
  const {
    method = 'GET',
    siteKey = getCurrentSiteKey(),
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT,
    ...rest
  } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  // 请求地址始终跟随当前站点配置，这样后续扩展多模板时不用在业务里手动拼 API 前缀。
  const { apiBaseUrl } = getSiteConfig(siteKey);
  const isFormData = body instanceof FormData;

  try {
    const response = await fetch(buildUrl(apiBaseUrl, path), {
      method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body
        ? isFormData || typeof body === 'string'
          ? body
          : JSON.stringify(body)
        : undefined,
      signal: controller.signal,
      ...rest,
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(typeof data === 'string' ? data : data.message || 'Request failed');
    }

    return data;
  } finally {
    window.clearTimeout(timer);
  }
}
