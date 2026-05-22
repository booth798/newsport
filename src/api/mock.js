/**
 * 模拟网络延迟，所有 mock API 统一调用。
 * 后续接入真实后端时，只需将各 api/*.js 中的函数体替换为 request() 调用即可。
 */
export function delay(ms = 400) {
  const jitter = Math.random() * 200;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}
