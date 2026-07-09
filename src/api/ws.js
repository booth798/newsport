import { get } from './request';

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
 */
export function buildWsUrl(path, ticket) {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${protocol}//${loc.host}`;

  if (ticket) {
    return `${base}${path}?ticket=${encodeURIComponent(ticket)}`;
  }

  const token = localStorage.getItem('mysport:token');
  if (token) {
    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }

  return `${base}${path}`;
}
