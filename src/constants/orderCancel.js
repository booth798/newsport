/** 下单后可撤单时间窗（与后端即时成交单可撤约定一致） */
export const ORDER_CANCEL_WINDOW_MS = 10 * 60 * 1000;

/**
 * 是否仍在可撤单时间窗内
 * @param {string|number|Date|null|undefined} placedAt 下单时间（ISO / 时间戳）
 */
export function isWithinOrderCancelWindow(placedAt) {
  if (placedAt == null || placedAt === '') return false;
  const ms = typeof placedAt === 'number' ? placedAt : Date.parse(String(placedAt));
  if (!Number.isFinite(ms)) return false;
  return Math.abs(Date.now() - ms) <= ORDER_CANCEL_WINDOW_MS;
}
