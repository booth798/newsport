import { get } from './request';
import { getCurrentLocale } from '@/store/modules/app';

/**
 * 获取 WebSocket 一次性握手票据（60s 有效，用后即焚）
 * 需要已登录状态
 */
export async function fetchWsTicket() {
  const res = await get('/ws/ticket');
  return res.data?.ticket || res.data;
}

/**
 * 构建 WebSocket 连接 URL
 * 优先使用 ticket 鉴权；降级到 token query string
 * 浏览器 WebSocket 无法自定义 Header，通过 URL 参数传递语言
 */
export function buildWsUrl(path, ticket) {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${protocol}//${loc.host}`;
  const lang = getCurrentLocale() || 'zh-CN';

  const params = new URLSearchParams();
  if (ticket) {
    params.set('ticket', ticket);
  } else {
    const token = localStorage.getItem('mysport:token');
    if (token) params.set('token', token);
  }
  params.set('lang', lang);

  const qs = params.toString();
  return qs ? `${base}${path}?${qs}` : `${base}${path}`;
}
