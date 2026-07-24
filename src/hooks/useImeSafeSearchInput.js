import { ref, watch } from 'vue';

/**
 * 搜索框 IME 安全本地态：组字期间只改 draft，不写外部状态，避免中文输入时光标/布局抖动。
 *
 * @param {object} options
 * @param {() => string} options.getCommitted 读取已提交关键词（如 store）
 * @param {(q: string) => void} options.commit 提交关键词（回车搜索前写入）
 * @param {() => void} [options.onSubmit] 回车且有内容时触发（如递增 nonce 刷新列表）
 * @param {() => void} [options.onClear] 清空时触发（恢复完整列表）
 * @param {boolean} [options.blurOnSubmit=true] 回车后是否 blur 收起软键盘
 */
export function useImeSafeSearchInput({
  getCommitted,
  commit,
  onSubmit,
  onClear,
  blurOnSubmit = true,
} = {}) {
  const draft = ref(String(getCommitted?.() ?? ''));
  /** 中文等输入法组字中 */
  const composing = ref(false);

  // 外部清空/改写已提交值时同步到输入框（组字中不打断）
  watch(
    () => getCommitted?.() ?? '',
    (v) => {
      if (composing.value) return;
      const next = String(v ?? '');
      if (next !== draft.value) draft.value = next;
    },
  );

  function onCompositionStart() {
    composing.value = true;
  }

  function onCompositionEnd(e) {
    composing.value = false;
    // compositionend 后取最终组字结果
    draft.value = e?.target?.value ?? draft.value;
    syncClearIfEmpty();
  }

  function onInput(e) {
    draft.value = e?.target?.value ?? draft.value;
    // 组字过程中的中间态不触发清空/请求，避免抖动
    if (composing.value || e?.isComposing) return;
    syncClearIfEmpty();
  }

  function syncClearIfEmpty() {
    if (draft.value.trim()) return;
    // 仅当已有提交过的关键词时才清空并刷新，避免未搜索时误触发请求
    if (!String(getCommitted?.() ?? '').trim()) return;
    onClear?.();
  }

  function onEnter(e) {
    if (e?.isComposing || e?.keyCode === 229 || composing.value) return;
    e?.preventDefault?.();
    if (blurOnSubmit) e?.target?.blur?.();
    const q = draft.value.trim();
    if (!q) return;
    commit?.(q);
    onSubmit?.();
  }

  function clear() {
    composing.value = false;
    draft.value = '';
    onClear?.();
  }

  return {
    draft,
    composing,
    onCompositionStart,
    onCompositionEnd,
    onInput,
    onEnter,
    clear,
  };
}
