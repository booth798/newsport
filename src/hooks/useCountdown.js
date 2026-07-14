import { ref, watch, onBeforeUnmount } from 'vue';

/**
 * 根据开赛时间 kickoffAt 提供实时倒计时文本。
 * @param {import('vue').Ref<string|number|null>} kickoffRef  响应式的开赛时间戳或 ISO 字符串
 * @param {object}  [opts]
 * @param {number}  [opts.interval=1000]  刷新间隔（ms），默认 1 秒
 * @returns {{ text: import('vue').Ref<string>, minutes: import('vue').Ref<number>, isOver: import('vue').Ref<boolean> }}
 */
export function useCountdown(kickoffRef, opts = {}) {
  const interval = opts.interval ?? 1000;

  const text = ref('');
  const minutes = ref(0);
  const isOver = ref(false);

  let timer = null;

  function tick() {
    const raw = typeof kickoffRef === 'object' && 'value' in kickoffRef
      ? kickoffRef.value
      : kickoffRef;

    if (!raw) {
      text.value = '';
      minutes.value = 0;
      isOver.value = true;
      return;
    }

    const target = typeof raw === 'number' ? raw : new Date(raw).getTime();
    if (Number.isNaN(target)) {
      text.value = '';
      minutes.value = 0;
      isOver.value = true;
      return;
    }

    const diff = target - Date.now();
    if (diff <= 0) {
      text.value = '';
      minutes.value = 0;
      isOver.value = true;
      stop();
      return;
    }

    isOver.value = false;

    // 统一输出 HH:MM:SS 格式（如 10:48:46），天数折算进小时
    const totalSec = Math.floor(diff / 1000);
    const totalHours = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    text.value = `${String(totalHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    minutes.value = Math.floor(diff / 60000);
  }

  function start() {
    stop();
    tick();
    timer = window.setInterval(tick, interval);
  }

  function stop() {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  watch(
    () => (typeof kickoffRef === 'object' && 'value' in kickoffRef ? kickoffRef.value : kickoffRef),
    () => start(),
    { immediate: true },
  );

  onBeforeUnmount(stop);

  return { text, minutes, isOver };
}
