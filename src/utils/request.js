import { getSiteConfig } from '@/config/site';
import { getCurrentSiteKey } from '@/store/modules/app';

// 如果传入的是完整 URL，就不再拼接站点 API 前缀。
const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

// 把站点 baseUrl 和业务 path 拼成最终请求地址。
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
    ...rest
  } = options;

  // 请求地址始终跟随当前站点配置，这样后续扩展多模板时不用在业务里手动拼 API 前缀。
  const { apiBaseUrl } = getSiteConfig(siteKey);
  const isFormData = body instanceof FormData;

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
}
