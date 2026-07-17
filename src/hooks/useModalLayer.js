/**
 * 弹窗叠层：后打开的弹窗 z-index 高于先打开的，
 * 修复「更换银行卡 → 添加其他银行」等同级 BaseModal 互相遮挡。
 */
import { onBeforeUnmount, ref, watch } from 'vue';

const BASE_Z_INDEX = 1200;
const Z_INDEX_STEP = 10;

/** @type {Map<symbol, number>} */
const openLayers = new Map();

function acquireModalLayer() {
  const id = Symbol('modal-layer');
  // 按当前已打开数量抬升，保证后开的永远盖在先开的上面
  const zIndex = BASE_Z_INDEX + openLayers.size * Z_INDEX_STEP;
  openLayers.set(id, zIndex);
  return { id, zIndex };
}

function releaseModalLayer(id) {
  if (id != null) openLayers.delete(id);
}

/**
 * @param {() => boolean} isOpen 弹窗是否打开（可用 () => props.modelValue）
 * @returns {{ zIndex: import('vue').Ref<number> }}
 */
export function useModalLayer(isOpen) {
  const zIndex = ref(BASE_Z_INDEX);
  let layerId = null;

  watch(
    isOpen,
    (open) => {
      if (open) {
        const layer = acquireModalLayer();
        layerId = layer.id;
        zIndex.value = layer.zIndex;
        return;
      }
      releaseModalLayer(layerId);
      layerId = null;
      zIndex.value = BASE_Z_INDEX;
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    releaseModalLayer(layerId);
    layerId = null;
  });

  return { zIndex };
}

/** H5 选择全屏页等需低于 BaseModal 的预留层级 */
export const MODAL_BASE_Z_INDEX = BASE_Z_INDEX;
