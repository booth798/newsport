import { watch, onBeforeUnmount } from 'vue';

/**
 * 全局 body 滚动锁（引用计数）：
 * - 多个弹窗叠开时只加一次锁，全部关闭后才解锁
 * - 用 padding-right 补偿滚动条宽度，避免弹窗打开时页面横向跳动、影响其它元素布局
 */
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';
let savedHtmlOverflow = '';

function getScrollbarWidth() {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function applyLock() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const html = document.documentElement;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  savedHtmlOverflow = html.style.overflow;

  const scrollbarWidth = getScrollbarWidth();
  const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  // 仅在确有纵向滚动条时补偿，避免无滚动条时额外挤出空白
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }
}

function releaseLock() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.overflow = savedHtmlOverflow;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) applyLock();
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) releaseLock();
}

/**
 * 按可见状态自动锁定 / 解锁 body 滚动。
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean> | (() => boolean)} source
 */
export function useBodyScrollLock(source) {
  const getOpen = typeof source === 'function' ? source : () => source.value;

  watch(
    getOpen,
    (open, wasOpen) => {
      if (open) {
        lockBodyScroll();
        return;
      }
      // 首次 immediate 且初始为关闭时 wasOpen 为 undefined，不能误解锁
      if (wasOpen) unlockBodyScroll();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (getOpen()) unlockBodyScroll();
  });
}
