import { defineStore } from 'pinia';

import { fetchProfileSummary, fetchVipLevels } from '@/api/user';

// 复用进行中的 VIP 等级请求，避免多个页面同时挂载时重复请求接口。
let vipLevelsRequest = null;
let userProfileRequest = null;

export const useUserStore = defineStore('user', {
  state: () => ({
    userProfile: null,
    vipLevels: [],
  }),
  getters: {
    // 对外统一提供按等级升序排列后的列表，调用处不需要重复处理接口顺序。
    vipLevelList: (state) =>
      [...state.vipLevels]
        .filter((item) => Number.isFinite(Number(item?.level)))
        .sort((a, b) => Number(a.level) - Number(b.level)),
  },
  actions: {
    async loadUserProfile({ force = false } = {}) {
      // 用户资料跨页面复用，已获取时直接读取 store，避免重复请求个人中心接口。
      if (this.userProfile && !force) return this.userProfile;
      if (userProfileRequest && !force) return userProfileRequest;

      userProfileRequest = fetchProfileSummary()
        .then((res) => {
          const summary = res.data || {};
          this.userProfile = {
            ...(summary._customer || {}),
            nickname: summary.nickname || '',
            balance: summary.balance,
            withdrawPasswordSet: summary.withdrawPasswordSet === true,
          };
          return this.userProfile;
        })
        .finally(() => {
          userProfileRequest = null;
        });

      return userProfileRequest;
    },
    updateUserProfile(profile) {
      // 局部资料变更后合并缓存，避免下一次使用仍读取旧的安全设置状态。
      this.userProfile = { ...(this.userProfile || {}), ...profile };
    },
    async loadVipLevels({ force = false } = {}) {
      // 已加载过时直接复用 store 数据；需要刷新时可传 force。
      if (this.vipLevels.length > 0 && !force) return this.vipLevels;
      if (vipLevelsRequest && !force) return vipLevelsRequest;

      vipLevelsRequest = fetchVipLevels()
        .then((res) => {
          const levels = Array.isArray(res.data) ? res.data : [];
          this.vipLevels = levels;
          return levels;
        })
        .finally(() => {
          vipLevelsRequest = null;
        });

      return vipLevelsRequest;
    },
  },
});
