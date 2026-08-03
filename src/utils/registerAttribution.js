/**
 * 注册归属：代理链接 ?ac=XXXXXX → 注册接口 agentCode。
 * 用 sessionStorage 暂存，避免落地后再跳转/打开弹窗时丢失。
 */

const AGENT_CODE_KEY = 'mysport:register_agent_code';

function firstQueryValue(raw) {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/**
 * 从路由 query 捕获代理码并写入会话缓存。
 * @param {Record<string, unknown>} [query]
 */
export function captureRegisterAttributionFromQuery(query) {
  if (!query || typeof query !== 'object') return;
  const ac = String(firstQueryValue(query.ac) ?? '').trim();
  if (!ac) return;
  try {
    sessionStorage.setItem(AGENT_CODE_KEY, ac);
  } catch {
    /* ignore quota / private mode */
  }
}

/** @returns {string|undefined} */
export function getRegisterAgentCode() {
  try {
    const code = String(sessionStorage.getItem(AGENT_CODE_KEY) || '').trim();
    return code || undefined;
  } catch {
    return undefined;
  }
}

/** 注册成功后清理，避免后续无关注册误归属 */
export function clearRegisterAgentCode() {
  try {
    sessionStorage.removeItem(AGENT_CODE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 组装注册可选归属参数（可与 inviteCode 等合并）。
 * @param {Record<string, unknown>} [extra]
 */
export function getRegisterAttributionOptions(extra = {}) {
  const agentCode = getRegisterAgentCode();
  return {
    ...extra,
    ...(agentCode ? { agentCode } : {}),
  };
}
