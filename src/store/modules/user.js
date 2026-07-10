import { defineStore } from 'pinia';

import { fetchVipLevels } from '@/api/user';

// 复用进行中的 VIP 等级请求，避免多个页面同时挂载时重复请求接口。
let vipLevelsRequest = null;

export const useUserStore = defineStore('user', {
  state: () => ({
    vipLevels: [],
    vipLevelsLoading: false,
    vipLevelsLoaded: false,
    vipLevelsError: '',
  }),
  getters: {
    // 对外统一提供按等级升序排列后的列表，调用处不需要重复处理接口顺序。
    vipLevelList: (state) =>
      [...state.vipLevels]
        .filter((item) => Number.isFinite(Number(item?.level)))
        .sort((a, b) => Number(a.level) - Number(b.level)),
  },
  actions: {
    async loadVipLevels({ force = false } = {}) {
      // 已加载过时直接复用 store 数据；需要刷新时可传 force。
      if (this.vipLevelsLoaded && !force) {
        return this.vipLevels;
      }
      if (vipLevelsRequest && !force) {
        return vipLevelsRequest;
      }

      this.vipLevelsLoading = true;
      this.vipLevelsError = '';
      vipLevelsRequest = fetchVipLevels()
        .then((res) => {
          const levels = Array.isArray(res.data) ? res.data : [];
          this.vipLevels = levels;
          this.vipLevelsLoaded = true;
          return levels;
        })
        .catch((error) => {
          this.vipLevelsError = error?.message || '加载失败';
          throw error;
        })
        .finally(() => {
          this.vipLevelsLoading = false;
          vipLevelsRequest = null;
        });

      return vipLevelsRequest;
    },
  },
});
